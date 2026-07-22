import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Sagaksagak reading service", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>사각사각 \| 문집 서재<\/title>/i);
  assert.match(html, /사각사각/);
  assert.match(html, /문집 서재와 읽기 뷰어/);
});

test("ships the library and gesture-ready PDF reader", async () => {
  const [page, layout, reader, pdfPage, styles, manifest] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/Reader.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/PdfPage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../public/books/manifest.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /export const metadata:\s*Metadata/);
  assert.match(page, /<SagakApp \/>/);
  assert.match(layout, /title:\s*"사각사각 \| 문집 서재"/);
  assert.match(pdfPage, /getDocument\(/);
  assert.match(reader, /현재 쪽 저장/);
  assert.match(reader, /is-spread/);
  assert.match(reader, /secondaryCanvasRef/);
  assert.match(reader, /primary.width \+ secondary.width/);
  assert.match(reader, /startPageGesture/);
  assert.match(reader, /finishPageGesture/);
  assert.doesNotMatch(reader, /sticker/i);
  assert.match(styles, /@media \(max-width:720px\)/);
  assert.match(manifest, /2026-spring\.pdf/);

  await assert.rejects(
    access(new URL("public/_sites-preview", templateRoot)),
  );
  await access(new URL("public/books/2026-spring.pdf", templateRoot));
});
