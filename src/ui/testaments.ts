import type { Book } from "../data/contracts";

const OLD_TESTAMENT_BOOKS = new Set([
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth",
  "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah",
  "Esther", "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah",
  "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah",
  "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
  "창세기", "출애굽기", "레위기", "민수기", "신명기", "여호수아", "사사기", "룻기",
  "사무엘상", "사무엘하", "열왕기상", "열왕기하", "역대상", "역대하", "에스라", "느헤미야",
  "에스더", "욥기", "시편", "잠언", "전도서", "아가", "이사야", "예레미야",
  "예레미야 애가", "에스겔", "다니엘", "호세아", "요엘", "아모스", "오바댜", "요나", "미가",
  "나훔", "하박국", "스바냐", "학개", "스가랴", "말라기",
]);

const NEW_TESTAMENT_BOOKS = new Set([
  "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians",
  "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians",
  "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter",
  "1 John", "2 John", "3 John", "Jude", "Revelation",
  "마태복음", "마가복음", "누가복음", "요한복음", "사도행전", "로마서", "고린도전서", "고린도후서",
  "갈라디아서", "에베소서", "빌립보서", "골로새서", "데살로니가전서", "데살로니가후서",
  "디모데전서", "디모데후서", "디도서", "빌레몬서", "히브리서", "야고보서", "베드로전서", "베드로후서",
  "요한1서", "요한2서", "요한3서", "유다서", "요한계시록",
]);

export type TestamentBooks = Readonly<{
  old: Book[];
  new: Book[];
  other: Book[];
}>;

export function groupBooksByTestament(books: Book[]): TestamentBooks {
  const old: Book[] = [];
  const next: Book[] = [];
  const other: Book[] = [];
  for (const book of books) {
    if (OLD_TESTAMENT_BOOKS.has(book.name)) old.push(book);
    else if (NEW_TESTAMENT_BOOKS.has(book.name)) next.push(book);
    else other.push(book);
  }
  return { old, new: next, other };
}
