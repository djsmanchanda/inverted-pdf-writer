const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const MAX_PDF_BYTES = 512 * 1024 * 1024;
function pdfBytes(value) {
  const bytes = Buffer.from(value);
  if (bytes.length > MAX_PDF_BYTES || !bytes.subarray(0, 1024).includes(Buffer.from('%PDF-'))) {
    throw new Error('Choose a valid PDF smaller than 512 MB.');
  }
  return bytes;
}
async function atomicWrite(file, bytes) {
  const temp = `${file}.${randomUUID()}.tmp`;
  await fs.mkdir(path.dirname(file), { recursive: true });
  try {
    const handle = await fs.open(temp, 'wx');
    try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
    await fs.rename(temp, file);
  } finally { await fs.rm(temp, { force: true }); }
}
class Library {
  constructor(root) { this.root = root; this.queue = Promise.resolve(); }
  run(action) {
    const next = this.queue.then(action);
    this.queue = next.catch(() => {});
    return next;
  }
  async init() {
    await fs.mkdir(this.root, { recursive: true });
    try { this.state = JSON.parse(await fs.readFile(path.join(this.root, 'library.json'), 'utf8')); }
    catch (error) {
      if (error.code === 'ENOENT') this.state = { version: 1, subjects: [
        { id: 'mathematics', name: 'Mathematics', color: '#e1aa79' },
        { id: 'physics', name: 'Physics', color: '#a5b9a0' },
        { id: 'chemistry', name: 'Chemistry', color: '#b6abcf' },
      ], documents: [] };
      else {
        try { this.state = JSON.parse(await fs.readFile(path.join(this.root, 'library.previous.json'), 'utf8')); }
        catch { throw new Error('The library index could not be read. Your PDFs are still in the documents folder. Restore library.previous.json from your backup.'); }
      }
    }
    if (this.state.version !== 1 || !Array.isArray(this.state.documents) || !Array.isArray(this.state.subjects)) throw new Error('Unsupported library format.');
    await this.persist();
    return this.snapshot();
  }
  snapshot() { return structuredClone(this.state); }
  document(id) {
    const doc = this.state.documents.find(d => d.id === id);
    if (!doc || !/^[a-f0-9-]{36}$/.test(id)) throw new Error('This PDF is not in the library.');
    return doc;
  }
  file(id, name = 'document.pdf') { this.document(id); return path.join(this.root, 'documents', id, name); }
  async persist() {
    const target = path.join(this.root, 'library.json');
    try { await fs.copyFile(target, path.join(this.root, 'library.previous.json')); } catch(e) { if(e.code !== 'ENOENT') throw e; }
    await atomicWrite(target, JSON.stringify(this.state, null, 2));
  }
  createSubject(name) { return this.run(async () => {
    name = String(name).trim();
    if (!name || name.length > 60) throw new Error('Use a subject name between 1 and 60 characters.');
    if (this.state.subjects.some(s => s.name.toLowerCase() === name.toLowerCase())) throw new Error('That subject already exists.');
    this.state.subjects.push({ id: randomUUID(), name, color: ['#e1aa79','#a5b9a0','#b6abcf','#8fb7cb'][this.state.subjects.length % 4] });
    await this.persist(); return this.snapshot();
  }); }
  importPdf(name, data, subjectId = null) { return this.run(async () => {
    if(subjectId && !this.state.subjects.some(s=>s.id===subjectId)) throw new Error('Unknown subject.');
    const bytes = pdfBytes(data), id = randomUUID(), now = new Date().toISOString();
    const dir = path.join(this.root, 'documents', id);
    await atomicWrite(path.join(dir, 'original.pdf'), bytes);
    await atomicWrite(path.join(dir, 'document.pdf'), bytes);
    const doc = { id, name: path.basename(name).replace(/\.pdf$/i, ''), subjectId, addedAt: now, lastSavedAt: now, lastOpenedAt: null, page: 1, pageCount: null, size: bytes.length };
    this.state.documents.push(doc); await this.persist(); return structuredClone(doc);
  }); }
  read(id) { return this.run(async()=>new Uint8Array(await fs.readFile(this.file(id)))); }
  save(id, data, metadata = {}) { return this.run(async () => {
    const doc = this.document(id), bytes = pdfBytes(data), target = this.file(id);
    await fs.copyFile(target, this.file(id, 'previous.pdf'));
    await atomicWrite(target, bytes);
    Object.assign(doc, { lastSavedAt: new Date().toISOString(), size: bytes.length });
    if (Number.isInteger(metadata.page) && metadata.page > 0) doc.page = metadata.page;
    await this.persist(); return structuredClone(doc);
  }); }
  update(id, changes) { return this.run(async () => {
    const doc = this.document(id);
    if ('subjectId' in changes) {
      if(changes.subjectId !== null && !this.state.subjects.some(s=>s.id===changes.subjectId)) throw new Error('Unknown subject.');
      doc.subjectId = changes.subjectId;
    }
    if ('name' in changes) { const name = String(changes.name).trim(); if(!name || name.length>180) throw new Error('Use a title between 1 and 180 characters.'); doc.name = name; }
    for (const key of ['page', 'pageCount']) if(Number.isInteger(changes[key]) && changes[key]>0) doc[key] = changes[key];
    if(changes.opened) doc.lastOpenedAt = new Date().toISOString();
    await this.persist(); return this.snapshot();
  }); }
}
module.exports = { Library, atomicWrite, pdfBytes };
