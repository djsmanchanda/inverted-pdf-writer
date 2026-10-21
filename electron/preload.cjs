const { contextBridge, ipcRenderer } = require('electron');
if (process.isMainFrame) contextBridge.exposeInMainWorld('desktop', {
  getState: () => ipcRenderer.invoke('library:state'),
  importFiles: subjectId => ipcRenderer.invoke('library:import', subjectId),
  createSubject: name => ipcRenderer.invoke('library:subject', name),
  readDocument: id => ipcRenderer.invoke('library:read', id),
  saveDocument: (id, bytes, metadata) => ipcRenderer.invoke('library:save', id, bytes, metadata),
  updateDocument: (id, changes) => ipcRenderer.invoke('library:update', id, changes),
  exportDocument: id => ipcRenderer.invoke('library:export', id),
  revealLibrary: () => ipcRenderer.invoke('library:reveal'),
  onBeforeClose: callback => ipcRenderer.on('app:before-close', callback),
  closeReady: error => ipcRenderer.send('app:close-ready', error),
  platform: process.platform,
});
