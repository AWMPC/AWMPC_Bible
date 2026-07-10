let library = null;
const LIMITS = { bytes: 8 * 1024 * 1024, books: 100, chapters: 2000, verses: 50000, text: 4000 };

function ownObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function numericKeys(value) {
  return Object.keys(value).sort((a, b) => Number(a) - Number(b));
}

function validate(value) {
  if (!ownObject(value)) throw new Error("The data root must be an object.");
  const books = Object.keys(value);
  if (!books.length || books.length > LIMITS.books) throw new Error("The library has an unexpected number of books.");
  let chapterCount = 0;
  let verseCount = 0;
  for (const book of books) {
    const chapters = value[book];
    if (!ownObject(chapters) || book.length > 120) throw new Error("A book entry is invalid.");
    for (const chapter of Object.keys(chapters)) {
      const verses = chapters[chapter];
      chapterCount += 1;
      if (!ownObject(verses)) throw new Error("A chapter entry is invalid.");
      for (const verse of Object.keys(verses)) {
        const text = verses[verse];
        verseCount += 1;
        if (typeof text !== "string" || text.length > LIMITS.text) throw new Error("A verse entry is invalid.");
      }
    }
  }
  if (chapterCount > LIMITS.chapters || verseCount > LIMITS.verses) throw new Error("The library is larger than this reader supports.");
}

function delay(attempt) {
  return new Promise((resolve) => setTimeout(resolve, Math.min(4000, 250 * 2 ** attempt) * (0.75 + Math.random() * 0.5)));
}

async function fetchWithBackoff(url) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(url, { cache: "force-cache", credentials: "same-origin" });
      if (!response.ok) {
        const error = new Error(`Data request failed (${response.status}).`);
        error.retryable = response.status === 408 || response.status === 429 || response.status >= 500;
        throw error;
      }
      const declaredLength = Number(response.headers.get("content-length") || 0);
      if (declaredLength > LIMITS.bytes) throw new Error("The data file is too large.");
      const text = await response.text();
      if (new Blob([text]).size > LIMITS.bytes) throw new Error("The data file is too large.");
      return text;
    } catch (error) {
      lastError = error;
      if (error instanceof Error && error.retryable === false) break;
      if (attempt < 3) await delay(attempt);
    }
  }
  throw lastError;
}

self.onmessage = async ({ data }) => {
  try {
    if (data.type === "load") {
      const text = await fetchWithBackoff(data.url);
      const parsed = JSON.parse(text);
      validate(parsed);
      library = parsed;
      const books = Object.keys(parsed).map((name) => ({ name, chapters: numericKeys(parsed[name]) }));
      self.postMessage({ type: "ready", books });
    } else if (data.type === "chapter" && library) {
      const chapter = library[data.book]?.[data.chapter];
      if (!ownObject(chapter)) throw new Error("That chapter is unavailable.");
      const verses = numericKeys(chapter).map((number) => ({ number, text: chapter[number] }));
      self.postMessage({ type: "chapter", requestId: data.requestId, book: data.book, chapter: data.chapter, verses });
    }
  } catch (error) {
    library = null;
    self.postMessage({ type: "error", message: error instanceof Error ? error.message : "The library could not be read." });
  }
};
