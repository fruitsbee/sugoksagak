import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {ReaderSession,clampPage,validateBooks} from '../lib/reader-core.js';

test('reuses the same loading task across pages; closes old book on switch', async () => {
  let loaded=0,destroyed=0;
  const reader=new ReaderSession(url=>{loaded++;return {promise:Promise.resolve({url}),destroy(){destroyed++;}};});
  const first=await reader.document('a');
  assert.equal(await reader.document('a'),first); assert.equal(loaded,1);
  await reader.document('b'); assert.equal(loaded,2); assert.equal(destroyed,1);
  reader.close(); assert.equal(destroyed,2); reader.close(); assert.equal(destroyed,2);
});
test('new navigation cancels painting and invalidates stale completion', async()=>{
  const reader=new ReaderSession(()=>({promise:Promise.resolve({}),destroy(){}}));
  await reader.document('a'); const old=reader.invalidate(); let reject,cancelled=0;
  const painting=reader.paint({render:()=>({promise:new Promise((_,r)=>{reject=r;}),cancel(){cancelled++;reject(new Error('cancelled'));}})},{});
  const outcome=assert.rejects(painting,/cancelled/);
  const latest=reader.invalidate(); assert.equal(reader.current(old),false); assert.equal(reader.current(latest),true);
  await outcome; assert.equal(cancelled,1); assert.equal(reader.renders.size,0);
  reader.close(); assert.equal(reader.current(latest),false);
});
test('failed load can be retried after close',async()=>{
  let calls=0;const reader=new ReaderSession(()=>({promise:++calls===1?Promise.reject(new Error('offline')):Promise.resolve('ok'),destroy(){}}));
  await assert.rejects(reader.document('a'),/offline/);reader.close();assert.equal(await reader.document('a'),'ok');
});
test('page bounds handle malformed, negative, fractional and last-page links',()=>{
  for(const [value,expected] of [['bad',1],[-4,1],[999,60],[3.8,3],['60',60]]) assert.equal(clampPage(value,60),expected);
});
test('published manifest has unique safe entries and every local asset exists',async()=>{
  const books=validateBooks(JSON.parse(await readFile(new URL('../public/books/manifest.json',import.meta.url),'utf8')));
  for(const book of books) for(const path of [book.pdfUrl,book.coverUrl]) await access(new URL(`../public${path}`,import.meta.url));
  assert.throws(()=>validateBooks([...books,books[0]]));
  assert.throws(()=>validateBooks([{...books[0],pdfUrl:'javascript:alert(1)'}]));
  assert.throws(()=>validateBooks([{...books[0],pageCount:0}]));
});
