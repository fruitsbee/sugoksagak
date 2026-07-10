import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "사각사각 | 문집 서재",
  description: "완성된 문집 PDF를 책처럼 읽고, 페이지에 다정한 반응을 남기는 사각사각",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
