export type Book = {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly editor: string;
  readonly createdAt: string;
  readonly pageCount: number;
  readonly source: "sample" | "pdf";
  readonly pdfUrl?: string;
  readonly coverUrl?: string;
};

export const sampleBook: Book = {
  id: "sugok-spring",
  title: "사각사각",
  subtitle: "수곡초 봄 이야기",
  editor: "수곡초 어린이 글 모음",
  createdAt: "2026.07.09",
  pageCount: 71,
  source: "pdf",
  pdfUrl: "/books/2026-spring.pdf",
  coverUrl: "/books/2026-spring-cover.png",
};
