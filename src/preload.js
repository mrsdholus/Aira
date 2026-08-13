const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aira', {
  getState: () => ipcRenderer.invoke('browser:get-state'),
  newTab: (url) => ipcRenderer.invoke('tabs:new', url),
  activateTab: (id) => ipcRenderer.invoke('tabs:activate', id),
  closeTab: (id) => ipcRenderer.invoke('tabs:close', id),
  reorderTab: (id, targetId, after) => ipcRenderer.invoke('tabs:reorder', id, targetId, after),
  go: (value) => ipcRenderer.invoke('nav:go', value),
  back: () => ipcRenderer.invoke('nav:back'),
  forward: () => ipcRenderer.invoke('nav:forward'),
  reload: () => ipcRenderer.invoke('nav:reload'),
  stop: () => ipcRenderer.invoke('nav:stop'),
  setOverlayBottom: (bottom) => ipcRenderer.invoke('ui:set-overlay-bottom', bottom),
  onState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('browser:state', listener);
    return () => ipcRenderer.removeListener('browser:state', listener);
  },
  onFocusAddress: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('browser:focus-address', listener);
    return () => ipcRenderer.removeListener('browser:focus-address', listener);
  }
});
