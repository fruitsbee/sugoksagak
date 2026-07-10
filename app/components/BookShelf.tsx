import type { Book } from "./model";

type BookShelfProps = {
  readonly books: readonly Book[];
  readonly onOpen: (book: Book) => void;
};

export function BookShelf({ books, onOpen }: BookShelfProps) {
  return (
    <main className="shelf-page" id="main-content">
      <section className="shelf-heading">
        <p className="section-label">문집 서재</p>
        <h1>오늘 펼쳐볼 문집</h1>
        <p>완성된 문집을 그대로 읽고, 마음에 남는 페이지에는 다정한 반응을 남깁니다.</p>
      </section>
      <section className="shelf-grid" aria-label="발행된 문집">
        {books.map((book, index) => (
          <button className={`book-tile book-tile-${index}`} key={book.id} onClick={() => onOpen(book)} type="button">
            <span className="book-spine" aria-hidden="true" />
            <span className="book-cover-art" aria-hidden="true">
              {book.coverUrl ? <img alt="" src={book.coverUrl} /> : <span>PDF</span>}
            </span>
            <span className="book-tile-copy">
              <strong>{book.title}</strong>
              <small>{book.subtitle}</small>
              <small>{book.pageCount}쪽 · {book.createdAt}</small>
            </span>
          </button>
        ))}
      </section>
    </main>
  );
}
