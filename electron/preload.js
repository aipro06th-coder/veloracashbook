const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  changeIp: () => ipcRenderer.send('open-change-ip-modal'),
});
