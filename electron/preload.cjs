// Sandboxed preloads must be CommonJS.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sculptglDesktop', {
  listAlphas: () => ipcRenderer.invoke('sculptgl:list-alphas')
});
