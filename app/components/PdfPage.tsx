"use client";

import { useEffect, useState } from "react";
import type { RefObject } from "react";

type PdfPageProps = {
  readonly url: string;
  readonly page: number;
  readonly onPageCount: (pageCount: number) => void;
  readonly canvasRef: RefObject<HTMLCanvasElement | null>;
};

export function PdfPage({ url, page, onPageCount, canvasRef }: PdfPageProps) {
  const [status, setStatus] = useState("페이지를 여는 중입니다.");

  useEffect(() => {
    let cancelled = false;
    let task: ReturnType<typeof import("pdfjs-dist").getDocument> | null = null;
    async function render() {
      try {
        const { GlobalWorkerOptions, getDocument } = await import("pdfjs-dist");
        GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        task = getDocument(url);
        const document = await task.promise;
        if (cancelled) return;
        onPageCount(document.numPages);
        const pdfPage = await document.getPage(page);
        const viewport = pdfPage.getViewport({ scale: 1.55 });
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context || cancelled) return;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        await pdfPage.render({ canvas, canvasContext: context, viewport }).promise;
        if (!cancelled) setStatus("");
      } catch (error) {
        if (!cancelled) setStatus(error instanceof Error ? error.message : "PDF를 열지 못했습니다.");
      }
    }
    void render();
    return () => {
      cancelled = true;
      void task?.destroy();
    };
  }, [canvasRef, onPageCount, page, url]);

  return <>{status ? <p className="page-status">{status}</p> : null}<canvas className="pdf-canvas" ref={canvasRef} /></>;
}
