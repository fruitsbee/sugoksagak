const app = document.querySelector("#app");
const libraryLinks = document.querySelectorAll("[data-library-link]");
const viewerLink = document.querySelector("[data-viewer-link]");
const cdnPdfJs = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs";
const cdnPdfWorker = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";
let books = [];
let activeBook = null;
let page = 1;
let pageCount = 1;
let wide = window.matchMedia("(min-width:1051px)").matches;
let pdfjs = null;
let primaryCanvas = null;
let secondaryCanvas = null;
let stickers = [];

function assetPath(value) {
  return value.startsWith("/") ? `.${value.startsWith("/books/") ? `/public${value}` : value}` : value;
}

function setRoute(route) {
  libraryLinks.forEach((link) => link.setAttribute("aria-current", route === "library" ? "page" : "false"));
  viewerLink.setAttribute("aria-current", route === "viewer" ? "page" : "false");
}

async function loadBooks() {
  const response = await fetch("./public/books/manifest.json");
  books = await response.json();
  renderLibrary();
}

function renderLibrary() {
  setRoute("library");
  app.innerHTML = `<section class="shelf"><p class="eyebrow">문집 서재</p><h1>오늘 펼쳐볼 문집</h1><p class="shelf-lead">완성된 문집을 그대로 읽고, 마음에 남는 페이지에는 다정한 반응을 남깁니다.</p><section class="shelf-grid" aria-label="발행된 문집">${books.map((book) => `<button class="book-tile" type="button" data-book-id="${book.id}"><span class="book-cover-art">${book.coverUrl ? `<img alt="" src="${assetPath(book.coverUrl)}">` : "<span>PDF</span>"}</span><span class="book-tile-copy"><strong>${book.title}</strong><small>${book.subtitle}</small><small>${book.pageCount}쪽 · ${book.createdAt}</small></span></button>`).join("")}</section></section>`;
  app.querySelectorAll("[data-book-id]").forEach((button) => button.addEventListener("click", () => openBook(books.find((book) => book.id === button.dataset.bookId))));
}

async function openBook(book) {
  if (!book) return;
  activeBook = book;
  page = 1;
  pageCount = book.pageCount;
  stickers = [];
  setRoute("viewer");
  app.innerHTML = `<main class="reader"><section class="reader-stage"><button class="page-hit page-hit-left" type="button" aria-label="이전 페이지"></button><div class="page-frame"></div><button class="page-hit page-hit-right" type="button" aria-label="다음 페이지"></button></section><aside class="reader-meta"><button class="back-link" type="button">서재</button><p class="eyebrow">읽는 중</p><h1>${book.title}</h1><p>${book.subtitle}</p><dl><div><dt>편집</dt><dd>${book.editor}</dd></div><div><dt>현재 쪽</dt><dd data-page-meta></dd></div></dl></aside><nav class="reader-toolbar"><div><button class="tool-button" data-prev type="button">이전</button><strong data-counter></strong><button class="tool-button" data-next type="button">다음</button></div><div class="sticker-tools">${["spark","heart","star","ribbon"].map((kind) => `<button class="sticker-button" data-sticker="${kind}" aria-label="스티커 추가" type="button"><img alt="" src="./public/stickers/${kind}.svg"></button>`).join("")}</div><button class="capture-button" data-capture type="button">현재 쪽 저장</button></nav></main>`;
  app.querySelector(".back-link").addEventListener("click", renderLibrary);
  app.querySelector("[data-prev]").addEventListener("click", () => turn(-1));
  app.querySelector("[data-next]").addEventListener("click", () => turn(1));
  app.querySelector("[data-capture]").addEventListener("click", capture);
  app.querySelectorAll("[data-sticker]").forEach((button) => button.addEventListener("click", () => addSticker(button.dataset.sticker)));
  renderReader();
}

async function getPdf() {
  if (!pdfjs) {
    pdfjs = await import(cdnPdfJs);
    pdfjs.GlobalWorkerOptions.workerSrc = cdnPdfWorker;
  }
  return pdfjs.getDocument(assetPath(activeBook.pdfUrl)).promise;
}

async function renderSheet(number, sheet) {
  sheet.innerHTML = `<p class="page-status">페이지를 여는 중입니다.</p><canvas class="pdf-canvas"></canvas><div class="sticker-layer"></div>`;
  const document = await getPdf();
  pageCount = document.numPages;
  const pdfPage = await document.getPage(number);
  const canvas = sheet.querySelector("canvas");
  const viewport = pdfPage.getViewport({ scale: 1.55 });
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  await pdfPage.render({ canvas, canvasContext: canvas.getContext("2d"), viewport }).promise;
  sheet.querySelector(".page-status")?.remove();
  sheet.querySelector(".sticker-layer").innerHTML = stickers.filter((sticker) => sticker.page === number).map((sticker) => `<button class="page-sticker" data-sticker-id="${sticker.id}" aria-label="스티커" style="left:${sticker.x * 100}%;top:${sticker.y * 100}%"><img alt="" src="./public/stickers/${sticker.kind}.svg"></button>`).join("");
  sheet.querySelectorAll("[data-sticker-id]").forEach((node) => node.addEventListener("pointerdown", (event) => dragSticker(event, node, number)));
  return canvas;
}

async function renderReader() {
  const frame = app.querySelector(".page-frame");
  frame.classList.toggle("is-spread", wide);
  frame.innerHTML = "";
  const left = document.createElement("div");
  left.className = "page-sheet";
  frame.append(left);
  primaryCanvas = await renderSheet(page, left);
  if (wide && page + 1 <= pageCount) {
    const right = document.createElement("div");
    right.className = "page-sheet";
    frame.append(right);
    secondaryCanvas = await renderSheet(page + 1, right);
  } else secondaryCanvas = null;
  app.querySelector("[data-counter]").textContent = `${page}${wide && page + 1 <= pageCount ? `-${page + 1}` : ""} / ${pageCount}`;
  app.querySelector("[data-page-meta]").textContent = `${page}${wide && page + 1 <= pageCount ? `-${page + 1}` : ""} / ${pageCount}`;
  app.querySelector("[data-prev]").disabled = page === 1;
  app.querySelector("[data-next]").disabled = page + (wide ? 2 : 1) > pageCount;
}

function turn(direction) {
  page = Math.min(Math.max(page + direction * (wide ? 2 : 1), 1), pageCount);
  renderReader();
}

function addSticker(kind) {
  stickers.push({ id: crypto.randomUUID(), page, kind, x: .66, y: .28 + (stickers.length % 4) * .14 });
  renderReader();
}

function dragSticker(event, node, number) {
  const sheet = node.closest(".page-sheet");
  const rect = sheet.getBoundingClientRect();
  const sticker = stickers.find((item) => item.id === node.dataset.stickerId);
  if (!sticker) return;
  event.preventDefault();
  node.setPointerCapture(event.pointerId);
  let position = { x: sticker.x, y: sticker.y };
  const move = (moveEvent) => { position = { x: Math.min(Math.max((moveEvent.clientX - rect.left) / rect.width, .08), .92), y: Math.min(Math.max((moveEvent.clientY - rect.top) / rect.height, .08), .92) }; node.style.left = `${position.x * 100}%`; node.style.top = `${position.y * 100}%`; };
  const finish = () => { sticker.x = position.x; sticker.y = position.y; node.removeEventListener("pointermove", move); node.removeEventListener("pointerup", finish); if (node.hasPointerCapture(event.pointerId)) node.releasePointerCapture(event.pointerId); };
  node.addEventListener("pointermove", move); node.addEventListener("pointerup", finish);
}

async function capture() {
  if (!primaryCanvas) return;
  const source = secondaryCanvas ? document.createElement("canvas") : primaryCanvas;
  if (secondaryCanvas) { source.width = primaryCanvas.width + secondaryCanvas.width; source.height = Math.max(primaryCanvas.height, secondaryCanvas.height); const context = source.getContext("2d"); context.fillStyle = "#fff"; context.fillRect(0, 0, source.width, source.height); context.drawImage(primaryCanvas, 0, 0); context.drawImage(secondaryCanvas, primaryCanvas.width, 0); }
  const anchor = document.createElement("a"); anchor.href = source.toDataURL("image/png"); anchor.download = `${activeBook.title}-${String(page).padStart(2, "0")}${secondaryCanvas ? `-${String(page + 1).padStart(2, "0")}` : ""}쪽.png`; anchor.click();
}

window.matchMedia("(min-width:1051px)").addEventListener("change", (event) => { wide = event.matches; if (activeBook) renderReader(); });
libraryLinks.forEach((link) => link.addEventListener("click", renderLibrary));
viewerLink.addEventListener("click", () => activeBook ? openBook(activeBook) : books[0] && openBook(books[0]));
loadBooks().catch(() => { app.innerHTML = "<div class=empty>문집 목록을 불러오지 못했습니다.</div>"; });
