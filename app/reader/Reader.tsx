"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Book = { name: string; chapters: string[] };
type Verse = { number: string; text: string };
type WorkerMessage =
  | { type: "ready"; books: Book[] }
  | { type: "chapter"; requestId: number; book: string; chapter: string; verses: Verse[] }
  | { type: "error"; message: string };

export function Reader() {
  const workerRef = useRef<Worker | null>(null);
  const requestRef = useRef(0);
  const [books, setBooks] = useState<Book[]>([]);
  const [book, setBook] = useState("");
  const [chapter, setChapter] = useState("");
  const [verses, setVerses] = useState<Verse[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");

  const requestChapter = useCallback((nextBook: string, nextChapter: string) => {
    const requestId = ++requestRef.current;
    setVerses([]);
    workerRef.current?.postMessage({ type: "chapter", requestId, book: nextBook, chapter: nextChapter });
  }, []);

  useEffect(() => {
    const worker = new Worker("/data.worker.js");
    workerRef.current = worker;
    worker.onmessage = ({ data }: MessageEvent<WorkerMessage>) => {
      if (data.type === "ready") {
        setBooks(data.books);
        const first = data.books[0];
        if (first) {
          setBook(first.name);
          setChapter(first.chapters[0]);
          requestChapter(first.name, first.chapters[0]);
        }
        setStatus("ready");
      } else if (data.type === "chapter" && data.requestId === requestRef.current) {
        setVerses(data.verses);
      } else if (data.type === "error") {
        setError(data.message);
        setStatus("error");
      }
    };
    worker.onerror = () => {
      setError("The reader could not start. Please reload and try again.");
      setStatus("error");
    };
    worker.postMessage({ type: "load", url: "/data/bible-en.json" });
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [requestChapter]);

  const chapters = books.find((item) => item.name === book)?.chapters ?? [];

  function chooseBook(nextBook: string) {
    const firstChapter = books.find((item) => item.name === nextBook)?.chapters[0] ?? "1";
    setBook(nextBook);
    setChapter(firstChapter);
    requestChapter(nextBook, firstChapter);
  }

  function chooseChapter(nextChapter: string) {
    setChapter(nextChapter);
    requestChapter(book, nextChapter);
    document.querySelector("main")?.focus();
  }

  return (
    <div className="reader-shell">
      <a className="skip-link" href="#reading-pane">Skip to text</a>
      <header className="topbar">
        <div className="brand"><span className="brand-mark" aria-hidden="true">Q</span><span>Quiet Reader</span></div>
        <p className="privacy-note"><span aria-hidden="true" />Private by design</p>
      </header>
      <div className="workspace">
        <nav className="library" aria-label="Books">
          <p className="eyebrow">Library</p>
          <h1>Books</h1>
          {status === "loading" ? <Skeleton rows={10} /> : (
            <div className="book-list">{books.map((item) => (
              <button key={item.name} aria-current={book === item.name ? "page" : undefined} onClick={() => chooseBook(item.name)}>{item.name}</button>
            ))}</div>
          )}
        </nav>
        <main id="reading-pane" className="reading-pane" tabIndex={-1}>
          {status === "error" ? <section className="error-card" role="alert"><h1>Unable to open the text</h1><p>{error}</p></section> : (
            <>
              <div className="reading-header">
                <div><p className="eyebrow">Now reading</p><h1>{book || "Preparing your library"}</h1></div>
                {chapters.length > 0 && <label>Chapter<select value={chapter} onChange={(event) => chooseChapter(event.target.value)}>{chapters.map((item) => <option key={item}>{item}</option>)}</select></label>}
              </div>
              {verses.length === 0 ? <Skeleton rows={8} text /> : <article aria-label={`${book} chapter ${chapter}`}><h2>Chapter {chapter}</h2><ol className="verses">{verses.map((verse) => <li key={verse.number}><span aria-label={`Verse ${verse.number}`}>{verse.number}</span><p>{verse.text}</p></li>)}</ol></article>}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function Skeleton({ rows, text = false }: { rows: number; text?: boolean }) {
  return <div className={text ? "skeleton text-skeleton" : "skeleton"} aria-label="Loading text" aria-busy="true">{Array.from({ length: rows }, (_, index) => <span key={index} />)}</div>;
}
