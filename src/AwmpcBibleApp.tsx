import { useCallback, useEffect, useRef, useState } from "react";
import DataWorker from "./data/data.worker?worker";
import type { Book, Verse, WorkerRequest, WorkerResponse } from "./data/contracts";
import { LocalHistoryStore, type HistoryEntry, type HistoryStore } from "./history/HistoryStore";
import { LocalSettingsStore, type SettingsStore } from "./settings/SettingsStore";
import { DEFAULT_TEXT_SCALE, type TextScale } from "./settings/textScale";
import { DEFAULT_VERSE_FONT, type VerseFont } from "./settings/verseFont";
import { DEFAULT_APPEARANCE, type Appearance } from "./settings/appearance";
import { FeatureOverlay, type FeatureOverlayHandle } from "./ui/FeatureOverlay";
import { FloatingDock } from "./ui/FloatingDock";
import { ProfilePanel } from "./ui/ProfilePanel";
import type { FeatureId, OverlayOrigin } from "./ui/features";
import { useUserScrollDockVisibility } from "./ui/useUserScrollDockVisibility";

export function AwmpcBibleApp() {
  const workerRef = useRef<Worker | null>(null);
  const requestRef = useRef(0);
  const overlayRef = useRef<FeatureOverlayHandle>(null);
  const historyStoreRef = useRef<HistoryStore | null>(null);
  const settingsStoreRef = useRef<SettingsStore | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [book, setBook] = useState("");
  const [chapter, setChapter] = useState("");
  const [verses, setVerses] = useState<Verse[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [activeFeature, setActiveFeature] = useState<FeatureId | null>(null);
  const [overlayOrigin, setOverlayOrigin] = useState<OverlayOrigin | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [textScale, setTextScale] = useState<TextScale>(DEFAULT_TEXT_SCALE);
  const [verseFont, setVerseFont] = useState<VerseFont>(DEFAULT_VERSE_FONT);
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE);

  const send = useCallback((message: WorkerRequest) => workerRef.current?.postMessage(message), []);
  const requestChapter = useCallback((nextBook: string, nextChapter: string) => {
    const requestId = ++requestRef.current;
    setVerses([]);
    send({ type: "chapter", requestId, book: nextBook, chapter: nextChapter });
  }, [send]);

  useEffect(() => {
    const worker = new DataWorker();
    workerRef.current = worker;
    worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
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
      setError("AWMPC Bible could not start. Please reload and try again.");
      setStatus("error");
    };
    send({ type: "load" });
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [requestChapter, send]);

  useEffect(() => {
    try {
      const store = new LocalHistoryStore(window.localStorage);
      historyStoreRef.current = store;
      void store.list().then(setHistory);
    } catch {
      historyStoreRef.current = null;
    }
    return () => { historyStoreRef.current = null; };
  }, []);

  useEffect(() => {
    try {
      const store = new LocalSettingsStore(window.localStorage);
      settingsStoreRef.current = store;
      const settings = store.load();
      setTextScale(settings.textScale);
      setVerseFont(settings.verseFont);
      setAppearance(settings.appearance);
    } catch {
      settingsStoreRef.current = null;
    }
    return () => { settingsStoreRef.current = null; };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.dataset.appearance;
    root.dataset.appearance = appearance;
    return () => {
      if (previous) root.dataset.appearance = previous;
      else delete root.dataset.appearance;
    };
  }, [appearance]);

  const chapters = books.find((item) => item.name === book)?.chapters ?? [];
  const dockVisible = useUserScrollDockVisibility(activeFeature === null);

  function chooseBook(nextBook: string) {
    const firstChapter = books.find((item) => item.name === nextBook)?.chapters[0] ?? "1";
    setBook(nextBook);
    setChapter(firstChapter);
    requestChapter(nextBook, firstChapter);
  }

  function chooseChapter(nextChapter: string) {
    setChapter(nextChapter);
    requestChapter(book, nextChapter);
  }

  async function chooseVerse(verse: string) {
    const store = historyStoreRef.current;
    if (store) {
      const entry = await store.add({ book, chapter, verse });
      setHistory((current) => [entry, ...current].slice(0, 200));
    }
    await overlayRef.current?.close();
  }

  function chooseTextScale(scale: TextScale) {
    setTextScale(scale);
    settingsStoreRef.current?.save({ textScale: scale, verseFont, appearance });
  }

  function chooseVerseFont(font: VerseFont) {
    setVerseFont(font);
    settingsStoreRef.current?.save({ textScale, verseFont: font, appearance });
  }

  function chooseAppearance(nextAppearance: Appearance) {
    setAppearance(nextAppearance);
    settingsStoreRef.current?.save({ textScale, verseFont, appearance: nextAppearance });
  }

  return (
    <div className="awmpc-bible-shell" data-text-scale={textScale} data-verse-font={verseFont}>
      <a className="skip-link" href="#reading-pane">Skip to text</a>
      <div className="workspace">
        <main id="reading-pane" className="reading-pane" tabIndex={-1}>
          {status === "error" ? <section className="error-card" role="alert"><h1>Unable to open the text</h1><p>{error}</p></section> : (
            <>
              <div className="reading-header">
                <div><p className="eyebrow">Now reading</p><h1>{book || "Preparing your library"}</h1></div>
                {chapter && <p className="chapter-indicator">Chapter <strong>{chapter}</strong></p>}
              </div>
              {verses.length === 0 ? <Skeleton rows={8} text /> : <article aria-label={`${book} chapter ${chapter}`}><h2>Chapter {chapter}</h2><ol className="verses">{verses.map((verse) => <li id={`verse-${chapter}-${verse.number}`} tabIndex={-1} key={verse.number}><span aria-label={`Verse ${verse.number}`}>{verse.number}</span><p>{verse.text}</p></li>)}</ol></article>}
            </>
          )}
        </main>
      </div>
      <FloatingDock activeFeature={activeFeature} visible={dockVisible} onOpen={(feature, origin) => { setOverlayOrigin(origin); setActiveFeature(feature); }} />
      <FeatureOverlay ref={overlayRef} activeFeature={activeFeature} origin={overlayOrigin} onClose={() => { setActiveFeature(null); setOverlayOrigin(null); }}>
        {activeFeature === "navigation" && (
          <NavigationPanel books={books} book={book} chapters={chapters} chapter={chapter} verses={verses} loading={status === "loading"} onBook={chooseBook} onChapter={chooseChapter} onVerse={(verse) => void chooseVerse(verse)} />
        )}
        {activeFeature === "history" && <HistoryPanel entries={history} />}
        {activeFeature === "search" && <EmptyFeature title="Search is ready for its index" detail="Full-text results and your recent searches will share this focused space." />}
        {activeFeature === "profile" && <ProfilePanel textScale={textScale} onTextScaleChange={chooseTextScale} verseFont={verseFont} onVerseFontChange={chooseVerseFont} appearance={appearance} onAppearanceChange={chooseAppearance} />}
      </FeatureOverlay>
    </div>
  );
}

type NavigationPanelProps = {
  books: Book[];
  book: string;
  chapters: string[];
  chapter: string;
  verses: Verse[];
  loading: boolean;
  onBook: (book: string) => void;
  onChapter: (chapter: string) => void;
  onVerse: (verse: string) => void;
};

function NavigationPanel({ books, book, chapters, chapter, verses, loading, onBook, onChapter, onVerse }: NavigationPanelProps) {
  if (loading) return <Skeleton rows={8} />;
  return (
    <div className="navigation-panel">
      <section aria-labelledby="books-title">
        <h3 id="books-title">Books</h3>
        <div className="choice-grid books-grid">{books.map((item) => (
          <button key={item.name} type="button" aria-current={book === item.name ? "page" : undefined} onClick={() => onBook(item.name)}>{item.name}</button>
        ))}</div>
      </section>
      <section aria-labelledby="chapters-title">
        <h3 id="chapters-title">Chapters</h3>
        <div className="choice-grid chapter-grid">{chapters.map((item) => (
          <button key={item} type="button" aria-current={chapter === item ? "page" : undefined} onClick={() => onChapter(item)}>{item}</button>
        ))}</div>
      </section>
      <section aria-labelledby="verses-title">
        <h3 id="verses-title">Verses</h3>
        <div className="choice-grid verse-grid">{verses.map((item) => (
          <button key={item.number} type="button" onClick={() => onVerse(item.number)}>{item.number}</button>
        ))}</div>
      </section>
    </div>
  );
}

function HistoryPanel({ entries }: { entries: HistoryEntry[] }) {
  if (!entries.length) return <EmptyFeature title="No reading history yet" detail="Verses selected through Navigate will appear here on this device." />;
  return <ol className="history-list">{entries.map((entry) => (
    <li key={entry.id}>
      <p><strong>{entry.book}</strong> {entry.chapter}:{entry.verse}</p>
      <time dateTime={entry.visitedAt}>{new Date(entry.visitedAt).toLocaleString()}</time>
    </li>
  ))}</ol>;
}

function EmptyFeature({ title, detail }: { title: string; detail: string }) {
  return <div className="empty-feature"><span aria-hidden="true" /><h3>{title}</h3><p>{detail}</p></div>;
}

function Skeleton({ rows, text = false }: { rows: number; text?: boolean }) {
  return <div className={text ? "skeleton text-skeleton" : "skeleton"} aria-label="Loading text" aria-busy="true">{Array.from({ length: rows }, (_, index) => <span key={index} />)}</div>;
}
