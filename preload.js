// preload.js — the safe bridge between backend and frontend
// It decides exactly what the renderer is ALLOWED to call.
// This is Electron's security model.

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {

  // Call this to open the folder picker dialog
  browseFolder: () => ipcRenderer.invoke('browse-folder'),

  // Call this to read a folder's contents
  readDirectory: (path) => ipcRenderer.invoke('read-directory', path),

  // Call this to recursively calcuate folder size
  getFolderSize: (path) => ipcRenderer.invoke('get-folder-size', path),

  // Call this to clear storage calculate cache
  clearCache: () => ipcRenderer.invoke('clear-cache'),

  // Call this to open a file
  openFile: (path) => ipcRenderer.invoke('open-file', path),

  // Call this to open the delete dialog box
  deleteEntry: (path) => ipcRenderer.invoke('delete-entry', path),

})