"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import type { Book } from "./model";
import { PdfPage } from "./PdfPage";

type ReaderProps = {
  readonly book: Book;
  readonly onBack: () => void;
};

export function Reader({ book, onBack }: ReaderProps) {
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(book.pageCount);
  const [isWide, setIsWide] = useState(false);
  const primaryCanvasRef = useRef<HTMLCanvasElement>(null);
  const secondaryCanvasRef = useRef<HTMLCanvasElement>(null);
  const gestureStartRef = useRef<{ x: number; y: number } | null>(null);
  const spreadSize = isWide ? 2 : 1;
  const nextPage = page + 1;

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1051px)");
    const update = () => setIsWide(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const turn = useCallback((delta: number) => {
    setPage((current) => {
      const next = current + delta * spreadSize;
      return Math.min(Math.max(next, 1), Math.max(1, pageCount - (spreadSize - 1)));
    });
  }, [pageCount, spreadSize]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") turn(-1);
      if (event.key === "ArrowRight") turn(1);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [turn]);

  function startPageGesture(event: ReactPointerEvent<HTMLElement>) {
    gestureStartRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function finishPageGesture(event: ReactPointerEvent<HTMLElement>) {
    const start = gestureStartRef.current;
    gestureStartRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!start) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    turn(deltaX < 0 ? 1 : -1);
  }

  async function capture() {
    const primary = primaryCanvasRef.current ?? await sampleCanvas(page);
    const secondary = isWide && nextPage <= pageCount ? secondaryCanvasRef.current : null;
    if (!primary) return;
    const source = secondary ? document.createElement("canvas") : primary;
    if (secondary) {
      source.width = primary.width + secondary.width;
      source.height = Math.max(primary.height, secondary.height);
      const context = source.getContext("2d");
      if (!context) return;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, source.width, source.height);
      context.drawImage(primary, 0, 0);
      context.drawImage(secondary, primary.width, 0);
    }
    const anchor = document.createElement("a");
    anchor.href = source.toDataURL("image/png");
    const pageLabel = secondary ? `${String(page).padStart(2, "0")}-${String(nextPage).padStart(2, "0")}쪽` : `${String(page).padStart(2, "0")}쪽`;
    anchor.download = `${book.title}-${pageLabel}.png`;
    anchor.click();
  }

  return (
    <main className="reader-page" id="main-content">
      <section className="reader-stage" aria-label={`${book.title} 읽기`} onPointerCancel={() => { gestureStartRef.current = null; }} onPointerDown={startPageGesture} onPointerUp={finishPageGesture}>
        <div className={`page-frame${isWide ? " is-spread" : ""}`}>
          <PageSheet book={book} canvasRef={primaryCanvasRef} onPageCount={setPageCount} page={page} />
          {isWide && nextPage <= pageCount ? <PageSheet book={book} canvasRef={secondaryCanvasRef} onPageCount={setPageCount} page={nextPage} /> : null}
        </div>
      </section>
      <aside className="reader-meta">
        <button className="back-link" type="button" onClick={onBack}>서재</button>
        <p className="section-label">읽는 중</p>
        <h1>{book.title}</h1>
        <p>{book.subtitle}</p>
        <dl><div><dt>편집</dt><dd>{book.editor}</dd></div><div><dt>현재 쪽</dt><dd>{page}{isWide && nextPage <= pageCount ? `-${nextPage}` : ""} / {pageCount}</dd></div></dl>
      </aside>
      <nav className="reader-toolbar" aria-label="읽기 도구">
        <div><button className="tool-button" disabled={page === 1} onClick={() => turn(-1)} type="button">이전</button><strong>{page}{isWide && nextPage <= pageCount ? `-${nextPage}` : ""} / {pageCount}</strong><button className="tool-button" disabled={page + spreadSize > pageCount} onClick={() => turn(1)} type="button">다음</button></div>
        <button className="capture-button" onClick={capture} type="button">현재 쪽 저장</button>
      </nav>
    </main>
  );
}

type PageSheetProps = {
  readonly book: Book;
  readonly canvasRef: RefObject<HTMLCanvasElement | null>;
  readonly onPageCount: (pageCount: number) => void;
  readonly page: number;
};

function PageSheet({ book, canvasRef, onPageCount, page }: PageSheetProps) {
  return (
    <div className="page-sheet">
      {book.pdfUrl ? <PdfPage canvasRef={canvasRef} onPageCount={onPageCount} page={page} url={book.pdfUrl} /> : null}
    </div>
  );
}

async function sampleCanvas(page: number): Promise<HTMLCanvasElement | null> {
  const image = new Image();
  image.src = `/sample/page-${String(page).padStart(2, "0")}.png`;
  await new Promise<void>((resolve) => {
    image.onload = () => resolve();
    image.onerror = () => resolve();
  });
  if (image.naturalWidth === 0 || image.naturalHeight === 0) return null;
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.drawImage(image, 0, 0);
  return canvas;
}
