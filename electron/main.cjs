const { app, BrowserWindow, ipcMain, dialog, protocol, net, shell, Menu } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { pathToFileURL } = require('node:url');
const { Library } = require('./library.cjs');
protocol.registerSchemesAsPrivileged([{scheme:'study',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true,codeCache:true}}]);
if (process.env.INVERTED_PDF_DATA_DIR) app.setPath('userData', path.resolve(process.env.INVERTED_PDF_DATA_DIR));
if(!app.requestSingleInstanceLock()){app.quit();process.exit(0);}
app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.focus();}});
let window, library, closing = false, closePending = false;
const root = path.resolve(__dirname, '..');
app.whenReady().then(async () => {
  protocol.handle('study', request => {
    const url = new URL(request.url);
    const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (url.hostname !== 'app' || !file.startsWith(root + path.sep) || !['app','vendor','assets'].includes(path.relative(root,file).split(path.sep)[0])) return new Response('Forbidden', {status:403});
    return net.fetch(pathToFileURL(file).href);
  });
  library = new Library(path.join(app.getPath('userData'), 'library'));
  try {
    await library.init();
    if(!library.state.documents.length && !(await fs.stat(path.join(library.root, '.welcome-imported')).catch(()=>null))) {
      await library.importPdf('Welcome to your study desk.pdf', await fs.readFile(path.join(root,'assets','welcome.pdf')), 'mathematics');
      await fs.writeFile(path.join(library.root, '.welcome-imported'), '1');
    }
  } catch(error) { dialog.showErrorBox('Unable to open your library', error.message); app.quit(); return; }
  const trusted = event => {
    if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) throw new Error('Untrusted request.');
  };
  const handle = (name, action) => ipcMain.handle(name, async (event,...args) => { trusted(event); return action(...args); });
  handle('library:state',()=>library.snapshot());
  handle('library:subject',name=>library.createSubject(name));
  handle('library:read',id=>library.read(id));
  handle('library:save',(id,bytes,metadata)=>library.save(id,bytes,metadata));
  handle('library:update',(id,changes)=>library.update(id,changes));
  handle('library:import',async subjectId=>{
    const result=await dialog.showOpenDialog(window,{title:'Add PDFs to your library',properties:['openFile','multiSelections'],filters:[{name:'PDF documents',extensions:['pdf']}]});
    if(result.canceled) return library.snapshot();
    for(const file of result.filePaths) {
      const stat=await fs.stat(file); if(stat.size>512*1024*1024) throw new Error(`${path.basename(file)} is larger than 512 MB.`);
      await library.importPdf(path.basename(file),await fs.readFile(file),subjectId);
    }
    return library.snapshot();
  });
  handle('library:export',async (id, bytes)=>{
    const doc=library.document(id);
    const result=await dialog.showSaveDialog(window,{title:'Export annotated PDF',defaultPath:doc.name.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_')+'.pdf',filters:[{name:'PDF document',extensions:['pdf']}]});
    if(result.canceled) return false;
    if(path.resolve(result.filePath).startsWith(path.resolve(library.root)+path.sep)) throw new Error('Export outside the app library to keep recovery files safe.');
    const {atomicWrite}=require('./library.cjs');
    const data=bytes ? require('./library.cjs').pdfBytes(bytes) : await library.read(id);
    await atomicWrite(result.filePath,data); return true;
  });
  handle('library:reveal',()=>shell.openPath(library.root));
  Menu.setApplicationMenu(null);
  window=new BrowserWindow({width:1440,height:960,minWidth:900,minHeight:650,title:'Inverted PDF Writer',backgroundColor:'#161918',autoHideMenuBar:true,icon:path.join(root,'assets','icon.png'),webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,spellcheck:false}});
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',event=>event.preventDefault());
  window.webContents.on('will-attach-webview',event=>event.preventDefault());
  window.webContents.session.setPermissionRequestHandler((_webContents,_permission,callback)=>callback(false));
  window.on('close',event=>{
    if(closing) return;
    event.preventDefault();
    if(closePending) return;
    closePending=true;
    window.webContents.send('app:before-close');
  });
  ipcMain.on('app:close-ready',async(event,error)=>{
    trusted(event); closePending=false;
    if(error) { await dialog.showMessageBox(window,{type:'error',title:'Your notes could not be saved',message:error,detail:'The app will stay open. Free some disk space or export your PDF, then try again.'}); return; }
    closing=true; window.close();
  });
  await window.loadURL('study://app/app/index.html');
  if(process.env.INVERTED_PDF_SMOKE) {
    await window.webContents.executeJavaScript(`window.__desktopReady = true`);
  }
});
app.on('window-all-closed',()=>app.quit());
