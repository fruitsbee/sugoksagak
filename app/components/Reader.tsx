"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import type { Book, Sticker, StickerKind } from "./model";
import { stickerOptions } from "./model";
import { PdfPage } from "./PdfPage";

type ReaderProps = {
  readonly book: Book;
  readonly stickers: readonly Sticker[];
  readonly onBack: () => void;
  readonly onAddSticker: (page: number, kind: StickerKind, label: string) => void;
  readonly onMoveSticker: (id: string, x: number, y: number) => void;
};

export function Reader({ book, stickers, onBack, onAddSticker, onMoveSticker }: ReaderProps) {
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(book.pageCount);
  const [isWide, setIsWide] = useState(false);
  const primaryCanvasRef = useRef<HTMLCanvasElement>(null);
  const secondaryCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1051px)");
    const update = () => setIsWide(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const spreadSize = isWide ? 2 : 1;
  const nextPage = page + 1;

  function turn(delta: number) {
    setPage((current) => {
      const next = current + delta * spreadSize;
      return Math.min(Math.max(next, 1), Math.max(1, pageCount - (spreadSize - 1)));
    });
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
      <section className="reader-stage" aria-label={`${book.title} 읽기`}>
        <button aria-label="이전 페이지" className="page-hit page-hit-left" disabled={page === 1} onClick={() => turn(-1)} type="button" />
        <div className={`page-frame${isWide ? " is-spread" : ""}`}>
          <PageSheet book={book} canvasRef={primaryCanvasRef} onMoveSticker={onMoveSticker} onPageCount={setPageCount} page={page} stickers={stickers} />
          {isWide && nextPage <= pageCount ? <PageSheet book={book} canvasRef={secondaryCanvasRef} onMoveSticker={onMoveSticker} onPageCount={setPageCount} page={nextPage} stickers={stickers} /> : null}
        </div>
        <button aria-label="다음 페이지" className="page-hit page-hit-right" disabled={page + spreadSize > pageCount} onClick={() => turn(1)} type="button" />
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
        <div className="sticker-tools">{stickerOptions.map((option) => <button aria-label={option.label} className={`sticker-button sticker-button-${option.kind}`} key={option.kind} onClick={() => onAddSticker(page, option.kind, option.label)} type="button"><img alt="" src={`/stickers/${option.kind}.svg`} /></button>)}</div>
        <button className="capture-button" onClick={capture} type="button">현재 쪽 저장</button>
      </nav>
    </main>
  );
}

type PageSheetProps = {
  readonly book: Book;
  readonly canvasRef: RefObject<HTMLCanvasElement | null>;
  readonly onMoveSticker: (id: string, x: number, y: number) => void;
  readonly onPageCount: (pageCount: number) => void;
  readonly page: number;
  readonly stickers: readonly Sticker[];
};

function PageSheet({ book, canvasRef, onMoveSticker, onPageCount, page, stickers }: PageSheetProps) {
  return (
    <div className="page-sheet">
      {book.pdfUrl ? <PdfPage canvasRef={canvasRef} onPageCount={onPageCount} page={page} url={book.pdfUrl} /> : null}
      <div className="sticker-layer">
        {stickers.filter((sticker) => sticker.page === page).map((sticker) => (
          <button
            aria-label={sticker.label}
            className={`page-sticker sticker-${sticker.kind}`}
            key={sticker.id}
            onPointerDown={(event) => startStickerDrag(event, sticker, onMoveSticker)}
            style={{ left: `${sticker.x * 100}%`, top: `${sticker.y * 100}%` }}
            type="button"
          >
            <img alt="" src={`/stickers/${sticker.kind}.svg`} />
          </button>
        ))}
      </div>
    </div>
  );
}

function startStickerDrag(event: ReactPointerEvent<HTMLButtonElement>, sticker: Sticker, onMoveSticker: (id: string, x: number, y: number) => void) {
  const node = event.currentTarget;
  const sheet = node.closest<HTMLElement>(".page-sheet");
  if (!sheet) return;
  event.preventDefault();
  node.setPointerCapture(event.pointerId);
  const rect = sheet.getBoundingClientRect();
  let position = { x: sticker.x, y: sticker.y };
  const update = (moveEvent: globalThis.PointerEvent) => {
    moveEvent.preventDefault();
    position = {
      x: Math.min(Math.max((moveEvent.clientX - rect.left) / rect.width, 0.08), 0.92),
      y: Math.min(Math.max((moveEvent.clientY - rect.top) / rect.height, 0.08), 0.92),
    };
    node.style.left = `${position.x * 100}%`;
    node.style.top = `${position.y * 100}%`;
  };
  const finish = () => {
    node.removeEventListener("pointermove", update);
    node.removeEventListener("pointerup", finish);
    node.removeEventListener("pointercancel", finish);
    if (node.hasPointerCapture(event.pointerId)) node.releasePointerCapture(event.pointerId);
    onMoveSticker(sticker.id, position.x, position.y);
  };
  node.addEventListener("pointermove", update);
  node.addEventListener("pointerup", finish);
  node.addEventListener("pointercancel", finish);
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
