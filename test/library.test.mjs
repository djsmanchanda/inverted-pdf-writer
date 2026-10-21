import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { Autosave, AUTOSAVE_INTERVAL_MS } from '../app/autosave.mjs';
const { Library } = createRequire(import.meta.url)('../electron/library.cjs');
const fixture = await fs.readFile(new URL('../assets/welcome.pdf',import.meta.url));
async function library(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'inverted-pdf-test-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));const store=new Library(dir);await store.init();return store;}
test('import, annotate, save, restart, and preserve original and previous PDF',async t=>{
 const store=await library(t);const doc=await store.importPdf('lecture.pdf',fixture,'physics');
 const changed=Buffer.concat([fixture,Buffer.from('\n% handwritten annotation fixture\n')]);
 await store.save(doc.id,changed,{page:2});
 const restarted=new Library(store.root);await restarted.init();
 assert.deepEqual(Buffer.from(await restarted.read(doc.id)),changed);
 assert.deepEqual(await fs.readFile(restarted.file(doc.id,'original.pdf')),fixture);
 assert.deepEqual(await fs.readFile(restarted.file(doc.id,'previous.pdf')),fixture);
 assert.equal(restarted.snapshot().documents[0].page,2);
 assert.ok(restarted.snapshot().documents[0].lastSavedAt);
});
test('subjects and document assignments survive restart; untrusted IDs and malformed PDFs fail',async t=>{
 const store=await library(t);await store.createSubject('Biology');const id=store.snapshot().subjects.at(-1).id;
 const doc=await store.importPdf('Cells.pdf',fixture);
 await store.update(doc.id,{subjectId:id,pageCount:3,opened:true,name:'Cell structure'});
 const restarted=new Library(store.root);await restarted.init();assert.equal(restarted.snapshot().documents[0].subjectId,id);assert.equal(restarted.snapshot().documents[0].name,'Cell structure');
 await assert.rejects(store.read('../library.json'));
 await assert.rejects(store.importPdf('fake.pdf',Buffer.from('not a PDF')));
 await assert.rejects(store.update(doc.id,{subjectId:'no-such-subject'}));
 await assert.rejects(store.createSubject(' biology '));
 assert.equal(store.snapshot().documents.length,1);
});
test('serialized concurrent saves retain latest PDF and previous recovery version',async t=>{
 const store=await library(t),doc=await store.importPdf('Notes.pdf',fixture);
 const first=Buffer.concat([fixture,Buffer.from('\n%first')]),last=Buffer.concat([fixture,Buffer.from('\n%last')]);
 await Promise.all([store.save(doc.id,first),store.save(doc.id,last)]);
 assert.deepEqual(Buffer.from(await store.read(doc.id)),last);assert.deepEqual(await fs.readFile(store.file(doc.id,'previous.pdf')),first);
});
test('damaged index recovers its previous version without changing stored PDFs',async t=>{
 const store=await library(t),doc=await store.importPdf('Recovery.pdf',fixture);
 await store.update(doc.id,{page:2});await fs.writeFile(path.join(store.root,'library.json'),'damaged');
 const restarted=new Library(store.root);await restarted.init();assert.equal(restarted.snapshot().documents[0].id,doc.id);assert.deepEqual(Buffer.from(await restarted.read(doc.id)),fixture);
});
test('autosave uses exactly five minutes, coalesces overlapping saves, and reports disk failures',async()=>{
 assert.equal(AUTOSAVE_INTERVAL_MS,300000);let calls=0,release;const errors=[];
 const saver=new Autosave({save:()=>{calls++;return new Promise(resolve=>release=resolve);},onError:e=>errors.push(e.message)});
 const first=saver.tick();await Promise.resolve();await saver.tick();assert.equal(calls,1);release();await first;
 saver.save=()=>{throw Error('Disk full');};await saver.tick();assert.deepEqual(errors,['Disk full']);assert.equal(saver.pending,null);
 let held=true;saver.canSave=()=>!held;saver.save=async()=>calls++;await saver.tick();assert.equal(calls,1);held=false;await saver.tick();assert.equal(calls,2);
});
test('failed index writes roll back in-memory changes and keep the queue usable',async t=>{
 const store=await library(t),persist=store.persist.bind(store);
 store.persist=async()=>{throw Error('Disk full');};
 await assert.rejects(store.createSubject('Should not remain'),/Disk full/);
 assert.equal(store.snapshot().subjects.some(s=>s.name==='Should not remain'),false);
 store.persist=persist;await store.createSubject('Recovered');assert.equal(store.snapshot().subjects.at(-1).name,'Recovered');
});
test('recovering a damaged index preserves a valid previous index',async t=>{
 const store=await library(t),doc=await store.importPdf('Recovery.pdf',fixture);
 await store.update(doc.id,{page:2});await fs.writeFile(path.join(store.root,'library.json'),'damaged');
 const recovered=new Library(store.root);await recovered.init();
 const previous=JSON.parse(await fs.readFile(path.join(store.root,'library.previous.json'),'utf8'));
 assert.equal(previous.documents[0].id,doc.id);
});
