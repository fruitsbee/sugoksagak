import { clampPage, validateBooks, ReaderSession } from './lib/reader-core.js';

const app = document.querySelector('#app');
const libraryLinks = document.querySelectorAll('[data-library-link]');
const viewerLink = document.querySelector('[data-viewer-link]');
const media = window.matchMedia('(min-width:1051px)');
let books = [], activeBook = null, screen = 'library', page = 1, pageCount = 1;
let wide = media.matches, pdfModule, session, opening = 0, canvases = [], zoom = false;
let gestureStart = null, suppressUntil = 0;
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const assetPath = value => `./public${value}`;
const savedPage = book => { try { return localStorage.getItem(`sagak-page:${book.id}`) || 1; } catch { return 1; } };
function savePage() { try { localStorage.setItem(`sagak-page:${activeBook.id}`, String(page)); } catch {} }
function setRoute(value) {
  screen = value;
  libraryLinks.forEach(link => link.setAttribute('aria-current', value === 'library' ? 'page' : 'false'));
  viewerLink.setAttribute('aria-current', value === 'reader' ? 'page' : 'false');
}
function setHash() { history.replaceState(null, '', `#book=${encodeURIComponent(activeBook.id)}&page=${page}`); }
function showLibrary() {
  opening++; session?.close(); canvases = []; gestureStart = null;
  setRoute('library'); history.replaceState(null, '', location.pathname + location.search);
  app.innerHTML = `<section class="shelf"><p class="eyebrow">문집 서재</p><h1>오늘 펼쳐볼 문집</h1><p class="shelf-lead">수곡초 어린이들의 글과 그림을 책처럼 펼쳐 읽어 보세요. 읽던 쪽은 이 기기에 기억됩니다.</p><section class="shelf-grid" aria-label="발행된 문집">${books.map(book => `<button class="book-tile" type="button" data-book-id="${book.id}"><span class="book-cover-art"><img alt="" src="${assetPath(book.coverUrl)}" loading="lazy"></span><span class="book-tile-copy"><strong>${escape(book.title)}</strong><small>${escape(book.subtitle)}</small><small>${book.pageCount}쪽 · ${escape(book.createdAt)}</small></span></button>`).join('')}</section></section>`;
  app.querySelectorAll('[data-book-id]').forEach(button => button.addEventListener('click', () => openBook(books.find(book => book.id === button.dataset.bookId))));
}
async function getSession() {
  if (!pdfModule) pdfModule = import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs').catch(error => { pdfModule = null; throw error; });
  const pdfjs = await pdfModule;
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
  session ??= new ReaderSession(url => pdfjs.getDocument(url));
  return session;
}
async function openBook(book, target = savedPage(book)) {
  if (!book) return;
  const request = ++opening;
  session?.close(); activeBook = book; pageCount = book.pageCount; page = clampPage(target, pageCount); canvases = []; zoom = false;
  setRoute('reader'); setHash();
  app.innerHTML = `<section class="reader"><section class="reader-stage" aria-label="문집 페이지"><button class="page-hit page-hit-left" aria-label="이전 페이지"></button><div class="page-frame"></div><button class="page-hit page-hit-right" aria-label="다음 페이지"></button></section><aside class="reader-meta"><button class="back-link" type="button">서재</button><h1>${escape(book.title)}</h1><p>${escape(book.subtitle)}</p><p>${escape(book.editor)}</p><a href="${assetPath(book.pdfUrl)}" target="_blank" rel="noopener">원본 PDF 열기</a></aside><nav class="reader-toolbar" aria-label="읽기 도구"><div><button data-prev>이전</button><span data-counter></span><button data-next>다음</button></div><form data-jump><label>쪽 <input name="page" type="number" min="1" max="${pageCount}" value="${page}" aria-label="이동할 쪽" required></label><button>이동</button></form><div><button data-zoom aria-pressed="false">확대</button><button data-share>주소 복사</button><button data-capture disabled>현재 쪽 저장</button></div></nav><p class="reader-status" role="status"></p></section>`;
  app.querySelector('.back-link').onclick = showLibrary;
  app.querySelector('[data-prev]').onclick = () => turn(-1);
  app.querySelector('[data-next]').onclick = () => turn(1);
  app.querySelector('.page-hit-left').onclick = () => { if (Date.now() > suppressUntil) turn(-1); };
  app.querySelector('.page-hit-right').onclick = () => { if (Date.now() > suppressUntil) turn(1); };
  app.querySelector('[data-jump]').onsubmit = event => { event.preventDefault(); page = clampPage(new FormData(event.currentTarget).get('page'), pageCount); renderReader(); };
  app.querySelector('[data-capture]').onclick = capture;
  app.querySelector('[data-share]').onclick = async () => { try { await navigator.clipboard.writeText(location.href); status('현재 문집과 쪽 주소를 복사했습니다.'); } catch { status('주소창의 주소를 복사해 주세요.'); } };
  app.querySelector('[data-zoom]').onclick = event => {
    zoom = !zoom; app.querySelector('.reader-stage').classList.toggle('is-zoomed', zoom);
    event.currentTarget.setAttribute('aria-pressed', String(zoom)); event.currentTarget.textContent = zoom ? '축소' : '확대';
  };
  const stage = app.querySelector('.reader-stage');
  stage.onpointerdown = event => { if (!zoom && event.isPrimary && event.button === 0) gestureStart = {x:event.clientX,y:event.clientY}; };
  stage.onpointercancel = () => { gestureStart = null; };
  stage.onpointerleave = () => { gestureStart = null; };
  stage.onpointerup = event => {
    const start = gestureStart; gestureStart = null; if (!start || zoom) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy)) { suppressUntil = Date.now() + 400; turn(dx < 0 ? 1 : -1); }
  };
  status('문집을 여는 중입니다…'); updateControls();
  try {
    const reader = await getSession();
    if (opening !== request) return;
    const pdfPromise = reader.document(assetPath(book.pdfUrl), ({loaded,total}) => {
      if (opening === request && screen === 'reader') status(total ? `문집을 불러오는 중… ${Math.min(100, Math.round(loaded / total * 100))}%` : '문집을 불러오는 중…');
    });
    await pdfPromise;
    if (opening !== request) return;
    await renderReader();
  } catch { if (opening === request) showError(); }
}
function status(text) { const node = app.querySelector('.reader-status'); if (node) node.textContent = text; }
function showError() {
  app.querySelector('.page-frame')?.replaceChildren();
  canvases = []; updateControls(); status('문집을 열지 못했습니다. 다시 시도하거나 원본 PDF를 열어 주세요.');
  const button = document.createElement('button'); button.textContent = '다시 시도'; button.onclick = () => openBook(activeBook, page);
  app.querySelector('.reader-status')?.append(' ', button);
}
function updateControls() {
  if (screen !== 'reader') return;
  const end = Math.min(page + (wide ? 1 : 0), pageCount);
  app.querySelector('[data-counter]').textContent = `${page}${end !== page ? `–${end}` : ''} / ${pageCount}`;
  app.querySelector('[data-prev]').disabled = page <= 1;
  app.querySelector('[data-next]').disabled = end >= pageCount;
  app.querySelector('.page-hit-left').disabled = page <= 1;
  app.querySelector('.page-hit-right').disabled = end >= pageCount;
  app.querySelector('[data-capture]').disabled = !canvases.length;
  const input = app.querySelector('[name=page]'); input.max = pageCount; input.value = page;
}
async function renderReader() {
  if (screen !== 'reader' || !session?.task) return;
  const token = session.invalidate(), reader = session, requestedPage = page, spread = wide;
  canvases = []; updateControls(); status('페이지를 여는 중입니다…');
  const frame = app.querySelector('.page-frame'); frame.setAttribute('aria-busy', 'true');
  try {
    const pdf = await reader.task.promise;
    if (!reader.current(token)) return;
    pageCount = pdf.numPages; page = clampPage(requestedPage, pageCount);
    const first = page;
    const numbers = spread && first < pageCount ? [first, first + 1] : [first];
    const sheets = await Promise.all(numbers.map(async number => {
      const pdfPage = await pdf.getPage(number);
      if (!reader.current(token)) return null;
      const sheet = document.createElement('div'); sheet.className = 'page-sheet';
      const canvas = document.createElement('canvas'); canvas.className = 'pdf-canvas';
      canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', `${activeBook.subtitle} ${number}쪽`);
      const viewport = pdfPage.getViewport({ scale:1.55 }); canvas.width = Math.floor(viewport.width); canvas.height = Math.floor(viewport.height);
      sheet.append(canvas); await reader.paint(pdfPage, {canvas,canvasContext:canvas.getContext('2d'),viewport});
      return sheet;
    }));
    if (!reader.current(token) || screen !== 'reader') return;
    frame.replaceChildren(...sheets); frame.classList.toggle('is-spread', sheets.length === 2); frame.setAttribute('aria-busy','false');
    canvases = sheets.map(sheet => sheet.firstChild); updateControls(); savePage(); setHash(); status('');
  } catch (error) { if (reader.current(token) && screen === 'reader') { frame.setAttribute('aria-busy','false'); showError(); } }
}
function turn(direction) {
  if (screen !== 'reader') return;
  const target = clampPage(page + direction * (wide ? 2 : 1), pageCount);
  if (target === page) return;
  page = target; renderReader();
}
function capture() {
  if (!canvases.length) return;
  const output = document.createElement('canvas'); output.width = canvases.reduce((sum,c) => sum+c.width,0); output.height = Math.max(...canvases.map(c => c.height));
  const context = output.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0,0,output.width,output.height);
  let x = 0; for (const canvas of canvases) { context.drawImage(canvas,x,0); x += canvas.width; }
  const filename = `${activeBook.subtitle}-${page}쪽.png`;
  output.toBlob(blob => { if (!blob) return; const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000); });
}
media.addEventListener('change', event => { wide = event.matches; if (screen === 'reader') renderReader(); });
window.addEventListener('keydown', event => {
  if (screen !== 'reader' || event.target.closest('input,textarea,select,[contenteditable=true]') || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); turn(event.key === 'ArrowLeft' ? -1 : 1); }
});
libraryLinks.forEach(link => link.onclick = showLibrary);
viewerLink.onclick = () => { if (screen !== 'reader') { const book = activeBook || books[0]; if (book) openBook(book); } };
function openHash() { const params = new URLSearchParams(location.hash.slice(1)), book = books.find(book => book.id === params.get('book')); if (book) { openBook(book,params.get('page') || 1); return true; } return false; }
window.addEventListener('hashchange', () => { if (!openHash()) showLibrary(); });
async function loadBooks() {
  try {
    const response = await fetch('./public/books/manifest.json',{cache:'no-store'}); if (!response.ok) throw new Error();
    books = validateBooks(await response.json()); if (!openHash()) showLibrary();
  } catch { app.innerHTML = '<section class="empty"><p>문집 목록을 불러오지 못했습니다.</p><button>다시 시도</button></section>'; app.querySelector('button').onclick = loadBooks; }
}
loadBooks();
