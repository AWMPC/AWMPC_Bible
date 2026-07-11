import type { Book, Verse } from "../data/contracts";
import { groupBooksByTestament } from "./testaments";
import { Skeleton } from "./Skeleton";

export type NavigationPanelProps = {
  books: Book[];
  book: string;
  chapters: string[];
  chapter: string;
  verses: Verse[];
  initialLoading: boolean;
  versesLoading: boolean;
  error?: string;
  onBook: (book: string) => void;
  onChapter: (chapter: string) => void;
  onVerse: (verse: string) => void;
};

export function NavigationPanel({ books, book, chapters, chapter, verses, initialLoading, versesLoading, error, onBook, onChapter, onVerse }: NavigationPanelProps) {
  if (initialLoading) return <Skeleton rows={8} />;
  const testamentBooks = groupBooksByTestament(books);
  return (
    <div className="navigation-panel">
      <section aria-labelledby="books-title">
        <h3 id="books-title">Books</h3>
        <TestamentBookGroup id="old-testament-title" title="Old Testament" books={testamentBooks.old} currentBook={book} onBook={onBook} />
        <TestamentBookGroup id="new-testament-title" title="New Testament" books={testamentBooks.new} currentBook={book} onBook={onBook} />
        {testamentBooks.other.length > 0 && <TestamentBookGroup id="other-books-title" title="Other Books" books={testamentBooks.other} currentBook={book} onBook={onBook} />}
      </section>
      <section aria-labelledby="chapters-title">
        <h3 id="chapters-title">Chapters</h3>
        <div className="choice-grid chapter-grid">{chapters.map((item) => (
          <button key={item} type="button" aria-current={chapter === item ? "page" : undefined} onClick={() => onChapter(item)}>{item}</button>
        ))}</div>
      </section>
      <section aria-labelledby="verses-title" aria-busy={versesLoading || undefined}>
        <h3 id="verses-title">Verses</h3>
        {versesLoading ? <Skeleton rows={3} /> : error ? <p className="navigation-error" role="status">{error}</p> : (
          <div className="choice-grid verse-grid">{verses.map((item) => (
            <button key={item.number} type="button" onClick={() => onVerse(item.number)}>{item.number}</button>
          ))}</div>
        )}
      </section>
    </div>
  );
}

function TestamentBookGroup({ id, title, books, currentBook, onBook }: { id: string; title: string; books: Book[]; currentBook: string; onBook: (book: string) => void }) {
  return (
    <section className="testament-group" aria-labelledby={id}>
      <h4 id={id}>{title}</h4>
      <div className="choice-grid books-grid">{books.map((item) => (
        <button key={item.name} type="button" aria-current={currentBook === item.name ? "page" : undefined} onClick={() => onBook(item.name)}>{item.name}</button>
      ))}</div>
    </section>
  );
}
