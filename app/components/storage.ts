import type { Book } from "./model";

const BOOKS_KEY = "sagaksagak-published-books";
const DB_NAME = "sagaksagak-library";
const STORE_NAME = "pdf-files";

type StoredBook = Omit<Book, "pdfUrl"> & { readonly pdfKey: string };

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("PDF 저장소를 열지 못했습니다."));
  });
}

async function putPdf(key: string, file: File): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(file, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("PDF를 저장하지 못했습니다."));
  });
  database.close();
}

async function getPdf(key: string): Promise<Blob | null> {
  const database = await openDatabase();
  const file = await new Promise<Blob | null>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : null);
    request.onerror = () => reject(request.error ?? new Error("PDF를 불러오지 못했습니다."));
  });
  database.close();
  return file;
}

export function readStoredBooks(): StoredBook[] {
  try {
    const raw = localStorage.getItem(BOOKS_KEY);
    const books: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(books) ? books as StoredBook[] : [];
  } catch {
    return [];
  }
}

export function writeStoredBooks(books: StoredBook[]): void {
  localStorage.setItem(BOOKS_KEY, JSON.stringify(books));
}

export async function saveUploadedBook(book: Book, file: File): Promise<void> {
  const pdfKey = `pdf-${book.id}`;
  await putPdf(pdfKey, file);
  const storedBook: StoredBook = {
    id: book.id,
    title: book.title,
    subtitle: book.subtitle,
    editor: book.editor,
    createdAt: book.createdAt,
    pageCount: book.pageCount,
    source: book.source,
    pdfKey,
  };
  writeStoredBooks([storedBook, ...readStoredBooks().filter((item) => item.id !== book.id)]);
}

export async function restoreUploadedBook(book: StoredBook): Promise<Book | null> {
  const file = await getPdf(book.pdfKey);
  if (!file) return null;
  return { ...book, pdfUrl: URL.createObjectURL(file) };
}
