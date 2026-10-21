import { Autosave } from './autosave.mjs';
const $=selector=>document.querySelector(selector);
const storage=window.desktop || (await import('./browser-storage.mjs')).browserStorage;
let state,filter='all',active=null,viewer=null,opening=false,revision=0,savedRevision=0,saveChain=Promise.resolve(),pointerDown=false;
let inverted=localStorage.getItem('inverted-pdf:inverted')!=='false';
let fingerDrawing=localStorage.getItem('inverted-pdf:fingerDrawing')==='true';
let toastTimer;
const covers=new Map();
function toast(message,error=false){$('#toast').textContent=message;$('#toast').classList.toggle('error',error);$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,error?10000:4500);}
function report(error){console.error(error);toast(error.message || String(error),true);}
function subject(id){return state.subjects.find(s=>s.id===id);}
function relative(value){if(!value)return 'Not opened yet';const days=Math.floor((Date.now()-new Date(value))/86400000);return days===0?'Today':days===1?'Yesterday':`${days} days ago`;}
function size(bytes){return bytes<1024*1024?`${Math.max(1,Math.round(bytes/1024))} KB`:`${(bytes/1024/1024).toFixed(1)} MB`;}
function subjectOptions(select,current){select.replaceChildren();for(const item of [{id:'',name:'Unsorted'},...state.subjects]){const option=document.createElement('option');option.value=item.id;option.textContent=item.name;option.selected=(current || '')===item.id;select.append(option);}}
function renderSidebar(){
 $('#all-count').textContent=state.documents.length;
 $('#all-documents').classList.toggle('active',filter==='all');$('#recent-documents').classList.toggle('active',filter==='recent');
 $('#subjects').replaceChildren();
 for(const item of state.subjects){const button=document.createElement('button');button.className='nav-item'+(filter===item.id?' active':'');const dot=document.createElement('span');dot.className='subject-dot';dot.style.background=item.color;const name=document.createElement('span');name.textContent=item.name;const count=document.createElement('span');count.className='subject-count';count.textContent=state.documents.filter(d=>d.subjectId===item.id).length;button.append(dot,name,count);button.onclick=()=>setFilter(item.id);$('#subjects').append(button);}
}
function renderLibrary(){
 renderSidebar();const label=filter==='all'?'All documents':filter==='recent'?'Recently opened':subject(filter)?.name || 'All documents';
 $('#breadcrumb').textContent=label;
 $('#library-title').replaceChildren();
 if(filter==='all')$('#library-title').innerHTML='Your next chapter<br>starts here<span>.</span>';
 else {$('#library-title').textContent=label;const dot=document.createElement('span');dot.textContent='.';$('#library-title').append(dot);}
 $('#library-description').textContent=filter==='all'?'A little space for big ideas. Pick up where you left off.':filter==='recent'?'Right where you left them. Ready when you are.':`All your ${label.toLowerCase()} reading and handwritten notes, together.`;
 $('#section-title').textContent=filter==='all'?'Your library':'Your documents';
 const query=$('#search').value.toLowerCase().trim();
 const docs=state.documents.filter(d=>(filter==='all'||filter==='recent'&&d.lastOpenedAt||d.subjectId===filter)&&(!query||`${d.name} ${subject(d.subjectId)?.name || ''}`.toLowerCase().includes(query)));
 const sort=$('#sort').value;
 docs.sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):(b[sort==='saved'?'lastSavedAt':sort==='added'?'addedAt':'lastOpenedAt']||b.addedAt).localeCompare(a[sort==='saved'?'lastSavedAt':sort==='added'?'addedAt':'lastOpenedAt']||a.addedAt));
 $('#document-count').textContent=`${docs.length} document${docs.length===1?'':'s'}`;$('#empty-state').hidden=docs.length>0;$('#documents').replaceChildren();
 for(const doc of docs){
  const card=document.createElement('article');card.className='document-card';
  const open=document.createElement('button');open.className='card-open';open.setAttribute('aria-label',`Open ${doc.name}`);open.onclick=()=>openDocument(doc.id).catch(report);
  const cover=document.createElement('div');cover.className='document-cover';const fallback=document.createElement('div');fallback.className='cover-fallback';fallback.textContent=doc.name;cover.append(fallback);
  const pages=document.createElement('span');pages.className='page-badge';pages.textContent=doc.pageCount?`${doc.pageCount} pages`:'PDF document';cover.append(pages);
  const info=document.createElement('div');info.className='card-info';const tag=document.createElement('span');tag.className='subject-tag';const dot=document.createElement('i');tag.append(dot,document.createTextNode(subject(doc.subjectId)?.name || 'Unsorted'));const title=document.createElement('h3');title.textContent=doc.name;title.title=doc.name;const meta=document.createElement('div');meta.className='card-meta';const date=document.createElement('span');date.textContent=doc.lastOpenedAt?`Opened ${relative(doc.lastOpenedAt).toLowerCase()}`:'Ready for your first read';const bytes=document.createElement('span');bytes.textContent=size(doc.size);meta.append(date,bytes);info.append(tag,title,meta);open.append(cover,info);
  const footer=document.createElement('div');footer.className='card-footer';const select=document.createElement('select');select.setAttribute('aria-label',`Subject for ${doc.name}`);subjectOptions(select,doc.subjectId);select.onchange=async()=>{try{state=await storage.updateDocument(doc.id,{subjectId:select.value || null});renderLibrary();}catch(error){report(error);}};const arrow=document.createElement('button');arrow.textContent='↗';arrow.title='Open PDF';arrow.setAttribute('aria-label',`Read ${doc.name}`);arrow.onclick=()=>openDocument(doc.id).catch(report);footer.append(select,arrow);card.append(open,footer);$('#documents').append(card);
  renderCover(doc,cover,fallback,pages).catch(error=>{console.warn('Cover unavailable:',error.message);});
 }
}
let pdfModule;
async function renderCover(doc,cover,fallback,pages){
 let item=covers.get(doc.id);
 if(!item){
  pdfModule ||= import('../vendor/pdfjs/build/pdf.mjs');const pdfjs=await pdfModule;pdfjs.GlobalWorkerOptions.workerSrc=new URL('../vendor/pdfjs/build/pdf.worker.mjs',import.meta.url).href;
  const task=pdfjs.getDocument({data:await storage.readDocument(doc.id),isEvalSupported:false,enableXfa:false,cMapUrl:new URL('../vendor/pdfjs/web/cmaps/',import.meta.url).href,cMapPacked:true,standardFontDataUrl:new URL('../vendor/pdfjs/web/standard_fonts/',import.meta.url).href,wasmUrl:new URL('../vendor/pdfjs/web/wasm/',import.meta.url).href});
  // Password-protected PDFs are opened in the reader, which has a password dialog.
  task.onPassword=()=>{task.destroy();};
  let pdf;
  try{pdf=await task.promise;const page=await pdf.getPage(1);const scale=380/page.getViewport({scale:1}).width;const viewport=page.getViewport({scale});const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;item={url:canvas.toDataURL(),pages:pdf.numPages};covers.set(doc.id,item);}
  finally{await task.destroy();}
 }
 if(!cover.isConnected)return;
 const image=new Image();image.src=item.url;image.alt='';image.style.cssText='width:100%;max-width:190px;height:auto;box-shadow:0 4px 18px #10180b66;filter:invert(.88) hue-rotate(180deg);opacity:.88;border-radius:2px 2px 0 0';fallback.replaceWith(image);pages.textContent=`${item.pages} page${item.pages===1?'':'s'}`;
}
async function setFilter(value){try{if(active)await closeReader();filter=value;renderLibrary();}catch(error){report(error);}}
async function importFiles(){const button=$('#import-button');button.disabled=true;try{state=await storage.importFiles(subject(filter)?filter:null);renderLibrary();}catch(error){report(error);}finally{button.disabled=false;}}
// Configure the upstream viewer before its initialization reads these options.
document.addEventListener('webviewerloaded',event=>{
 const source=event.detail.source;
 const options=source.PDFViewerApplicationOptions;
 options.set('disablePreferences',true);options.set('enableScripting',false);options.set('defaultUrl','');options.set('viewerCssTheme',2);options.set('defaultZoomValue','page-width');options.set('disableHistory',true);options.set('enableAltTextModelDownload',false);options.set('enableSignature',false);
});
function saveStatus(text){$('#save-status').textContent=text;}
function markChanged(){revision++;saveStatus('Unsaved notes · next autosave within 5 minutes');}
function applyReadingSettings(){
 if(viewer){const doc=$('#pdf-viewer').contentDocument;doc.documentElement.classList.toggle('inverted-page',inverted);doc.documentElement.classList.toggle('finger-drawing',fingerDrawing);}
 $('#invert-button').setAttribute('aria-pressed',String(inverted));$('#invert-button').textContent=inverted?'◐ Inverted':'◐ Normal';
 $('#touch-button').setAttribute('aria-pressed',String(fingerDrawing));$('#touch-button').textContent=fingerDrawing?'Finger drawing on':'Finger drawing off';
}
function nextEvent(bus,name){return new Promise(resolve=>{const listener=event=>{bus.off(name,listener);resolve(event);};bus.on(name,listener);});}
async function openDocument(id){
 if(opening)return;opening=true;
 try{
  if(active)await closeReader();
  const doc=state.documents.find(d=>d.id===id);if(!doc)throw Error('PDF not found.');
  const bytes=await storage.readDocument(id);
  $('#library-view').hidden=true;$('#reader-view').hidden=false;$('#reader-title').textContent=doc.name;$('#breadcrumb').textContent=doc.name;subjectOptions($('#reader-subject'),doc.subjectId);saveStatus('Opening PDF…');
  const frame=$('#pdf-viewer');
  await new Promise((resolve,reject)=>{frame.onload=resolve;frame.onerror=()=>reject(Error('The PDF viewer could not load.'));frame.src='../vendor/pdfjs/web/viewer.html?file=';});
  viewer=frame.contentWindow.PDFViewerApplication;await viewer.initializedPromise;
  const loaded=nextEvent(viewer.eventBus,'documentloaded');
  await viewer.open({data:bytes});await loaded;
  active=id;revision=0;savedRevision=0;
  const pdf=viewer.pdfDocument;
  const originalModified=pdf.annotationStorage.onSetModified;
  pdf.annotationStorage.onSetModified=()=>{originalModified?.();markChanged();};
  frame.contentDocument.addEventListener('input',markChanged,true);
  // Ink can stay in an active editor until focus changes. Commit before saving.
  frame.contentDocument.addEventListener('pointerdown',event=>{if(event.target.closest('#viewerContainer'))pointerDown=true;},true);
  frame.contentDocument.addEventListener('pointerup',()=>{if(pointerDown){pointerDown=false;if(viewer.pdfViewer.annotationEditorMode>0)markChanged();}},true);
  frame.contentDocument.addEventListener('pointercancel',()=>pointerDown=false,true);
  frame.contentDocument.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();event.stopImmediatePropagation();saveActive(true).catch(report);}},true);
  viewer.downloadOrSave=async()=>{await saveActive();await storage.exportDocument(active);};
  viewer.eventBus.on('pagechanging',()=>{if(active===id)saveStatus(revision===savedRevision?'Saved locally · Ctrl+S to save anytime':'Unsaved notes · next autosave within 5 minutes');});
  applyReadingSettings();
  const page=Math.min(doc.page || 1,pdf.numPages);viewer.page=page;
  state=await storage.updateDocument(id,{opened:true,pageCount:pdf.numPages,page});
  saveStatus('Saved locally · Ctrl+S to save anytime');
 }catch(error){active=null;viewer=null;$('#reader-view').hidden=true;$('#library-view').hidden=false;throw error;}
 finally{opening=false;}
}
function saveActive(showToast=false){
 const id=active,app=viewer;
 if(!id||!app?.pdfDocument)return Promise.resolve();
 const job=saveChain.catch(()=>{}).then(async()=>{
  saveStatus('Saving to this device…');
  app.pdfViewer._layerProperties.annotationEditorUIManager?.endCurrentEditing();
  const captured=revision;
  try{
   const data=await app.pdfDocument.saveDocument();
   const saved=await storage.saveDocument(id,data,{page:app.page});
   const index=state.documents.findIndex(d=>d.id===id);if(index>=0)state.documents[index]=saved;
   savedRevision=captured;saveStatus(revision===savedRevision?`Saved locally at ${new Date(saved.lastSavedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`:'New notes waiting to save');
   if(showToast)toast('PDF and notes saved on this device.');
  }catch(error){saveStatus('Save failed · your notes are still open. Try Save again.');throw error;}
 });
 saveChain=job;return job;
}
async function closeReader(){
 if(!active)return;
 $('#pdf-viewer').style.pointerEvents='none';
 try{await saveActive();await viewer.close();active=null;viewer=null;pointerDown=false;$('#pdf-viewer').src='about:blank';$('#reader-view').hidden=true;$('#library-view').hidden=false;renderLibrary();}
 finally{$('#pdf-viewer').style.pointerEvents='';}
}
const autosave=new Autosave({save:()=>saveActive(),canSave:()=>Boolean(active&&!opening&&!pointerDown),onError:report});autosave.start();
// A pen held down at the interval boundary gets saved shortly after it is lifted.
let retryTimer=setInterval(()=>{if(active&&!pointerDown&&revision!==savedRevision){const doc=state.documents.find(d=>d.id===active);if(doc&&Date.now()-new Date(doc.lastSavedAt)>=300000)autosave.tick();}},5000);
$('#all-documents').onclick=()=>setFilter('all');$('#recent-documents').onclick=()=>setFilter('recent');$('.brand').onclick=event=>{event.preventDefault();setFilter('all');};
$('#import-button').onclick=importFiles;$('#empty-import').onclick=importFiles;$('#search').oninput=renderLibrary;$('#sort').onchange=renderLibrary;
$('#add-subject').onclick=()=>{$('#subject-error').textContent='';$('#subject-name').value='';$('#subject-dialog').showModal();$('#subject-name').focus();};
$('#cancel-subject').onclick=()=>$('#subject-dialog').close();
$('#subject-form').onsubmit=async event=>{event.preventDefault();try{state=await storage.createSubject($('#subject-name').value);$('#subject-dialog').close();renderLibrary();toast('Subject added.');}catch(error){$('#subject-error').textContent=error.message;}};
$('#storage-button').onclick=()=>storage.revealLibrary().catch(report);
$('#back-button').onclick=()=>closeReader().catch(report);$('#save-button').onclick=()=>saveActive(true).catch(report);
$('#export-button').onclick=async()=>{const button=$('#export-button');button.disabled=true;try{await saveActive();if(await storage.exportDocument(active))toast('Annotated PDF exported.');}catch(error){report(error);}finally{button.disabled=false;}};
$('#reader-subject').onchange=async()=>{try{state=await storage.updateDocument(active,{subjectId:$('#reader-subject').value || null});renderSidebar();}catch(error){report(error);}};
$('#invert-button').onclick=()=>{inverted=!inverted;localStorage.setItem('inverted-pdf:inverted',String(inverted));applyReadingSettings();};
$('#touch-button').onclick=()=>{fingerDrawing=!fingerDrawing;localStorage.setItem('inverted-pdf:fingerDrawing',String(fingerDrawing));applyReadingSettings();};
document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'&&active){event.preventDefault();saveActive(true).catch(report);}if(event.key==='/'&&!active&&!['INPUT','TEXTAREA'].includes(event.target.tagName)){event.preventDefault();$('#search').focus();}});
window.addEventListener('beforeunload',event=>{if(!window.desktop&&active&&revision!==savedRevision){event.preventDefault();event.returnValue='';}});
storage.onBeforeClose?.(async()=>{try{await saveActive();storage.closeReady();}catch(error){storage.closeReady(error.message);}});
try{state=await storage.getState();renderLibrary();}catch(error){report(error);$('#library-description').textContent='The library could not open. Please restart the app.';}
