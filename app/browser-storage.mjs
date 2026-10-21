// The browser preview uses IndexedDB. The Windows app always uses real local PDFs.
const DEFAULT_STATE = {version:1,subjects:[{id:'mathematics',name:'Mathematics',color:'#e1aa79'},{id:'physics',name:'Physics',color:'#a5b9a0'},{id:'chemistry',name:'Chemistry',color:'#b6abcf'}],documents:[]};
const dbPromise = new Promise((resolve,reject)=>{
 const request=indexedDB.open('inverted-pdf-writer',1);
 request.onupgradeneeded=()=>request.result.createObjectStore('data');
 request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
});
async function get(key) {const db=await dbPromise;return new Promise((resolve,reject)=>{const r=db.transaction('data').objectStore('data').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function put(entries) {const db=await dbPromise;return new Promise((resolve,reject)=>{const tx=db.transaction('data','readwrite');for(const [key,value] of entries)tx.objectStore('data').put(value,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error || Error('Browser storage could not be written.'));});}
let state;
async function importBytes(name,bytes,subjectId){
 const header=new TextDecoder().decode(bytes.slice(0,1024));
 if(!header.includes('%PDF-') || bytes.length>512*1024*1024)throw Error('Choose a valid PDF smaller than 512 MB.');
 const now=new Date().toISOString();const doc={id:crypto.randomUUID(),name:name.replace(/\.pdf$/i,''),subjectId,addedAt:now,lastSavedAt:now,lastOpenedAt:null,page:1,pageCount:null,size:bytes.length};
 state.documents.push(doc);await put([[doc.id,bytes],['state',state]]);return doc;
}
const initialized=(async()=>{
 state=await get('state');
 if(!state){state=structuredClone(DEFAULT_STATE);const response=await fetch('../assets/welcome.pdf');if(!response.ok)throw Error('The welcome PDF is missing.');await importBytes('Welcome to your study desk.pdf',new Uint8Array(await response.arrayBuffer()),'mathematics');}
})();
export const browserStorage={
 platform:'browser',
 async getState(){await initialized;return structuredClone(state);},
 async importFiles(subjectId){
  await initialized;const input=document.querySelector('#browser-file-input');
  const files=await new Promise(resolve=>{input.value='';input.onchange=()=>resolve([...input.files]);input.oncancel=()=>resolve([]);input.click();});
  for(const file of files)await importBytes(file.name,new Uint8Array(await file.arrayBuffer()),subjectId);
  return structuredClone(state);
 },
 async createSubject(name){await initialized;name=name.trim();if(!name||name.length>60)throw Error('Use a name between 1 and 60 characters.');if(state.subjects.some(s=>s.name.toLowerCase()===name.toLowerCase()))throw Error('That subject already exists.');state.subjects.push({id:crypto.randomUUID(),name,color:'#8fb7cb'});await put([['state',state]]);return structuredClone(state);},
 async readDocument(id){await initialized;const bytes=await get(id);if(!bytes)throw Error('PDF not found.');return bytes;},
 async saveDocument(id,bytes,metadata){await initialized;const doc=state.documents.find(d=>d.id===id);if(!doc)throw Error('PDF not found.');await put([[id,bytes]]);Object.assign(doc,{lastSavedAt:new Date().toISOString(),size:bytes.length,page:metadata.page});await put([['state',state]]);return structuredClone(doc);},
 async updateDocument(id,changes){await initialized;const doc=state.documents.find(d=>d.id===id);if(!doc)throw Error('PDF not found.');for(const key of ['subjectId','name','page','pageCount'])if(key in changes)doc[key]=changes[key];if(changes.opened)doc.lastOpenedAt=new Date().toISOString();await put([['state',state]]);return structuredClone(state);},
 async exportDocument(id,bytes){await initialized;const doc=state.documents.find(d=>d.id===id);const url=URL.createObjectURL(new Blob([bytes || await get(id)],{type:'application/pdf'}));const link=document.createElement('a');link.href=url;link.download=doc.name+'.pdf';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);return true;},
 async revealLibrary(){throw Error('This is the browser preview. The Windows app stores real PDFs in your local app-data folder; use Export PDF here to download a copy.');},
};
