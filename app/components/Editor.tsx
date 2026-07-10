"use client";

import { useRef, useState } from "react";
import { z } from "zod";
import type { Book } from "./model";

const publishSchema = z.object({
  title: z.string().trim().min(1, "문집 제목을 입력해 주세요.").max(50),
  subtitle: z.string().trim().min(1, "부제를 입력해 주세요.").max(70),
  editor: z.string().trim().min(1, "편집자 이름을 입력해 주세요.").max(50),
});

type EditorProps = {
  readonly onCancel: () => void;
  readonly onPublish: (book: Book, file: File) => Promise<void>;
};

export function Editor({ onCancel, onPublish }: EditorProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("PDF 원본은 발행 뒤에도 보관됩니다.");
  const [fileName, setFileName] = useState("");

  async function submit(formData: FormData) {
    const parsed = publishSchema.safeParse({
      title: formData.get("title"),
      subtitle: formData.get("subtitle"),
      editor: formData.get("editor"),
    });
    const file = fileRef.current?.files?.item(0);
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? "입력 내용을 확인해 주세요.");
      return;
    }
    if (!file || file.type !== "application/pdf") {
      setMessage("PDF 파일 한 부를 선택해 주세요.");
      return;
    }
    setMessage("PDF 쪽 수를 확인하는 중입니다...");
    const { GlobalWorkerOptions, getDocument } = await import("pdfjs-dist");
    GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    const pdf = await getDocument({ data: await file.arrayBuffer() }).promise;
    const pageCount = pdf.numPages;
    await pdf.destroy();
    await onPublish({
      id: crypto.randomUUID(),
      title: parsed.data.title,
      subtitle: parsed.data.subtitle,
      editor: parsed.data.editor,
      createdAt: new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).replaceAll(" ", "").replaceAll(".", ".").slice(0, -1),
      pageCount,
      source: "pdf",
    }, file);
  }

  return (
    <main className="editor-page" id="main-content">
      <section className="editor-intro">
        <p className="section-label">에디터</p>
        <h1>PDF 한 부를 문집으로</h1>
        <p>표지나 페이지를 다시 편집하지 않아도 됩니다. 완성된 PDF를 선택하고 발행 정보를 적으면 서재에 바로 놓입니다.</p>
      </section>
      <form className="publish-form" action={submit}>
        <label className="file-drop" htmlFor="pdf-file">
          <input id="pdf-file" name="pdf-file" ref={fileRef} onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} type="file" accept="application/pdf" />
          <span className="file-icon" aria-hidden="true">PDF</span>
          <strong>완성된 문집 PDF 선택</strong>
          <small>{fileName || "원본 레이아웃과 페이지 순서를 그대로 읽습니다."}</small>
        </label>
        <div className="form-fields">
          <label>문집 제목<input name="title" defaultValue="사각사각 특별호" /></label>
          <label>부제<input name="subtitle" defaultValue="우리 반의 오늘" /></label>
          <label>편집자<input name="editor" defaultValue="사각사각 편집부" /></label>
        </div>
        <p className="form-message" aria-live="polite">{message}</p>
        <div className="editor-actions">
          <button className="text-button" type="button" onClick={onCancel}>서재로</button>
          <button className="primary-button" type="submit">문집 발행</button>
        </div>
      </form>
    </main>
  );
}
