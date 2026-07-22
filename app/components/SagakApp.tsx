"use client";

import { useEffect, useState } from "react";
import { BookShelf } from "./BookShelf";
import type { Book } from "./model";
import { sampleBook } from "./model";
import { Reader } from "./Reader";

type Screen = "library" | "reader";

export function SagakApp() {
  const [screen, setScreen] = useState<Screen>("library");
  const [books, setBooks] = useState<readonly Book[]>([sampleBook]);
  const [selectedBook, setSelectedBook] = useState<Book>(sampleBook);

  useEffect(() => {
    let cancelled = false;
    async function loadManifest() {
      try {
        const response = await fetch("/books/manifest.json", { cache: "no-store" });
        if (!response.ok) return;
        const manifest = await response.json() as Book[];
        if (!cancelled && manifest.length > 0) setBooks(manifest);
      } catch {
      }
    }
    void loadManifest();
    return () => { cancelled = true; };
  }, []);

  function openBook(book: Book) {
    setSelectedBook(book);
    setScreen("reader");
  }

  return (
    <div className="app-shell" data-screen={screen}>
      <a className="skip-link" href="#main-content">본문으로 건너뛰기</a>
      <header className="topbar">
        <button className="brand" onClick={() => setScreen("library")} type="button"><span><strong>사각사각</strong><small>문집 서재와 읽기 뷰어</small></span></button>
        <nav className="route-tabs" aria-label="주요 화면"><button aria-current={screen === "library" ? "page" : undefined} onClick={() => setScreen("library")} type="button">서재</button><button aria-current={screen === "reader" ? "page" : undefined} onClick={() => setScreen("reader")} type="button">뷰어</button></nav>
      </header>
      {screen === "library" ? <BookShelf books={books} onOpen={openBook} /> : null}
      {screen === "reader" ? <Reader book={selectedBook} onBack={() => setScreen("library")} /> : null}
    </div>
  );
}
