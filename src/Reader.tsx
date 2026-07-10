import { useCallback, useEffect, useRef, useState } from "react";
import DataWorker from "./data/data.worker?worker";
import type { Book, Verse, WorkerRequest, WorkerResponse } from "./data/contracts";
import { FeatureOverlay } from "./ui/FeatureOverlay";
import { FloatingDock } from "./ui/FloatingDock";
import type { FeatureId, OverlayOrigin } from "./ui/features";

export function Reader() {
  const workerRef = useRef<Worker | null>(null);
  const requestRef = useRef(0);
  const [books, setBooks] = useState<Book[]>([]);
  const [book, setBook] = useState("");
  const [chapter, setChapter] = useState("");
  const [verses, setVerses] = useState<Verse[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [activeFeature, setActiveFeature] = useState<FeatureId | null>(null);
  const [overlayOrigin, setOverlayOrigin] = useState<OverlayOrigin | null>(null);

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
      setError("The reader could not start. Please reload and try again.");
      setStatus("error");
    };
    send({ type: "load" });
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [requestChapter, send]);

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
      <div className="workspace">
        <main id="reading-pane" className="reading-pane" tabIndex={-1}>
          {status === "error" ? <section className="error-card" role="alert"><h1>Unable to open the text</h1><p>{error}</p></section> : (
            <>
              <div className="reading-header">
                <div><p className="eyebrow">Now reading</p><h1>{book || "Preparing your library"}</h1></div>
                {chapter && <p className="chapter-indicator">Chapter <strong>{chapter}</strong></p>}
              </div>
              {verses.length === 0 ? <Skeleton rows={8} text /> : <article aria-label={`${book} chapter ${chapter}`}><h2>Chapter {chapter}</h2><ol className="verses">{verses.map((verse) => <li key={verse.number}><span aria-label={`Verse ${verse.number}`}>{verse.number}</span><p>{verse.text}</p></li>)}</ol></article>}
            </>
          )}
        </main>
      </div>
      <FloatingDock activeFeature={activeFeature} onOpen={(feature, origin) => { setOverlayOrigin(origin); setActiveFeature(feature); }} />
      <FeatureOverlay activeFeature={activeFeature} origin={overlayOrigin} onClose={() => setActiveFeature(null)}>
        {activeFeature === "navigation" && (
          <NavigationPanel books={books} book={book} chapters={chapters} chapter={chapter} loading={status === "loading"} onBook={chooseBook} onChapter={chooseChapter} />
        )}
        {activeFeature === "history" && <EmptyFeature title="Your reading trail will appear here" detail="Recently opened books and chapters will stay private to your account." />}
        {activeFeature === "search" && <EmptyFeature title="Search is ready for its index" detail="Full-text results and your recent searches will share this focused space." />}
        {activeFeature === "profile" && <EmptyFeature title="Profile and preferences" detail="Sign-in, reading preferences, and data controls will live here." />}
      </FeatureOverlay>
    </div>
  );
}

type NavigationPanelProps = {
  books: Book[];
  book: string;
  chapters: string[];
  chapter: string;
  loading: boolean;
  onBook: (book: string) => void;
  onChapter: (chapter: string) => void;
};

function NavigationPanel({ books, book, chapters, chapter, loading, onBook, onChapter }: NavigationPanelProps) {
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
    </div>
  );
}

function EmptyFeature({ title, detail }: { title: string; detail: string }) {
  return <div className="empty-feature"><span aria-hidden="true" /><h3>{title}</h3><p>{detail}</p></div>;
}

function Skeleton({ rows, text = false }: { rows: number; text?: boolean }) {
  return <div className={text ? "skeleton text-skeleton" : "skeleton"} aria-label="Loading text" aria-busy="true">{Array.from({ length: rows }, (_, index) => <span key={index} />)}</div>;
}
