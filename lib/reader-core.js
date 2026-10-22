export function clampPage(value, count) {
  const number = Number(value);
  return Math.min(Math.max(Number.isFinite(number) ? Math.trunc(number) : 1, 1), count);
}

export function validateBooks(value) {
  if (!Array.isArray(value) || !value.length) throw new Error('문집 목록이 비어 있습니다.');
  const ids = new Set();
  for (const book of value) {
    if (!book || !/^[a-z0-9-]+$/.test(book.id) || ids.has(book.id) ||
        !['title', 'subtitle', 'editor', 'createdAt'].every(key => typeof book[key] === 'string') ||
        !Number.isInteger(book.pageCount) || book.pageCount < 1 ||
        !/^\/books\/[a-z0-9-]+\.pdf$/.test(book.pdfUrl) ||
        !/^\/books\/[a-z0-9-]+\.(png|jpg|webp)$/.test(book.coverUrl)) {
      throw new Error('문집 목록 형식을 확인해 주세요.');
    }
    ids.add(book.id);
  }
  return value;
}

// One loading task per open book. Rendering generations invalidate stale async work.
export class ReaderSession {
  constructor(load) { this.load = load; this.task = null; this.url = null; this.generation = 0; this.renders = new Set(); }
  invalidate() {
    this.generation++;
    for (const task of this.renders) task.cancel();
    this.renders.clear();
    return this.generation;
  }
  current(token) { return token === this.generation; }
  async document(url, progress) {
    if (this.url !== url || !this.task) {
      this.close();
      this.url = url;
      this.task = this.load(url);
      this.task.onProgress = progress;
    }
    return this.task.promise;
  }
  close() {
    this.invalidate();
    const task = this.task;
    this.task = null; this.url = null;
    if (task) Promise.resolve(task.destroy()).catch(() => {});
  }
  async paint(pdfPage, options) {
    const task = pdfPage.render(options);
    this.renders.add(task);
    try { await task.promise; } finally { this.renders.delete(task); }
  }
}
