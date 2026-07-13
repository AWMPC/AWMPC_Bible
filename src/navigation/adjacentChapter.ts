import type { Book } from "../data/contracts";

export type ChapterDirection = -1 | 1;
export type ChapterLocation = Readonly<{ book: string; chapter: string }>;

export function adjacentChapter(books: readonly Book[], current: ChapterLocation, direction: ChapterDirection): ChapterLocation | null {
  const bookIndex = books.findIndex(({ name }) => name === current.book);
  if (bookIndex < 0) return null;
  const chapterIndex = books[bookIndex].chapters.indexOf(current.chapter);
  if (chapterIndex < 0) return null;

  const chapter = books[bookIndex].chapters[chapterIndex + direction];
  if (chapter) return { book: current.book, chapter };

  for (let index = bookIndex + direction; index >= 0 && index < books.length; index += direction) {
    const chapters = books[index].chapters;
    const adjacent = direction > 0 ? chapters[0] : chapters.at(-1);
    if (adjacent) return { book: books[index].name, chapter: adjacent };
  }
  return null;
}
