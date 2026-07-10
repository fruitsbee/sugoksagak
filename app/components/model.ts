export type StickerKind = "spark" | "heart" | "star" | "ribbon";

export type Sticker = {
  readonly id: string;
  readonly page: number;
  readonly x: number;
  readonly y: number;
  readonly kind: StickerKind;
  readonly label: string;
};

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

export const stickerOptions = [
  { kind: "spark", label: "좋았어요", color: "#4f9a78" },
  { kind: "heart", label: "마음에 남아요", color: "#d28a63" },
  { kind: "star", label: "최고 문장", color: "#d5a433" },
  { kind: "ribbon", label: "다시 읽고 싶어요", color: "#8e6684" },
] as const;

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
