const { app, BrowserWindow, WebContentsView, ipcMain, session } = require('electron');
const path = require('node:path');

const TOOLBAR_HEIGHT = 150;
const START_PAGE = path.join(__dirname, 'renderer', 'newtab.html');
const CHROME_PAGE = path.join(__dirname, 'renderer', 'index.html');

let window;
let chromeView;
let tabs = [];
let activeTabId = null;
let nextTabId = 1;
let history = [];
let chromeHeight = TOOLBAR_HEIGHT;

function activeTab() {
  return tabs.find((tab) => tab.id === activeTabId);
}

function pageState(tab) {
  const contents = tab.view.webContents;
  const rawUrl = contents.getURL();
  return {
    id: tab.id,
    title: tab.title || 'Новая вкладка',
    url: rawUrl.startsWith('file:') ? '' : rawUrl,
    favicon: tab.favicon,
    loading: contents.isLoading(),
    canGoBack: contents.canGoBack(),
    canGoForward: contents.canGoForward()
  };
}

function browserState() {
  return { activeTabId, tabs: tabs.map(pageState), history };
}

function broadcastState() {
  if (!chromeView || chromeView.webContents.isDestroyed()) return;
  chromeView.webContents.send('browser:state', browserState());
}

function rememberPage(tab) {
  const url = tab.view.webContents.getURL();
  if (!url || url.startsWith('file:')) return;
  history = [
    { title: tab.title || url, url, favicon: tab.favicon || '' },
    ...history.filter((item) => item.url !== url)
  ].slice(0, 60);
}

function layoutViews() {
  if (!window || window.isDestroyed()) return;
  const [width, height] = window.getContentSize();
  for (const tab of tabs) {
    tab.view.setBounds({
      x: 0,
      y: TOOLBAR_HEIGHT,
      width,
      height: Math.max(0, height - TOOLBAR_HEIGHT)
    });
  }
  if (chromeView) {
    chromeView.setBounds({ x: 0, y: 0, width, height: Math.min(height, chromeHeight) });
    window.contentView.addChildView(chromeView);
  }
}

function normalizeAddress(value) {
  const input = String(value || '').trim();
  if (!input) return null;
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(input)) return input;
  if (/^(localhost|\d{1,3}(\.\d{1,3}){3})(:\d+)?(\/.*)?$/.test(input)) return `http://${input}`;
  if (/^[^\s]+\.[^\s]+/.test(input)) return `https://${input}`;
  return `https://duckduckgo.com/?q=${encodeURIComponent(input)}`;
}

function focusAddress() {
  chromeView?.webContents.focus();
  chromeView?.webContents.send('browser:focus-address');
}

function switchRelative(direction) {
  if (tabs.length < 2) return;
  const current = tabs.findIndex((tab) => tab.id === activeTabId);
  const next = (current + direction + tabs.length) % tabs.length;
  activateTab(tabs[next].id);
}

function reorderTab(id, targetId, after = false) {
  const from = tabs.findIndex((tab) => tab.id === Number(id));
  if (from < 0) return;
  const [moved] = tabs.splice(from, 1);
  let target = tabs.findIndex((tab) => tab.id === Number(targetId));
  if (target < 0) {
    tabs.splice(from, 0, moved);
    return;
  }
  if (after) target += 1;
  tabs.splice(target, 0, moved);
  broadcastState();
}

function moveActiveTab(direction) {
  const from = tabs.findIndex((tab) => tab.id === activeTabId);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= tabs.length) return;
  [tabs[from], tabs[to]] = [tabs[to], tabs[from]];
  broadcastState();
}

function handleShortcut(event, input) {
  if (input.type !== 'keyDown') return;
  const key = input.key.toLowerCase();
  const primary = process.platform === 'darwin' ? input.meta : input.control;

  if (input.control && key === 'tab') {
    event.preventDefault();
    switchRelative(input.shift ? -1 : 1);
    return;
  }
  if (input.control && /^[1-9]$/.test(key)) {
    event.preventDefault();
    const index = Number(key) - 1;
    if (tabs[index]) activateTab(tabs[index].id);
    return;
  }
  if (!primary) return;

  if (input.shift && (key === 'arrowleft' || key === 'arrowright')) {
    event.preventDefault();
    moveActiveTab(key === 'arrowleft' ? -1 : 1);
  } else if (key === 'l') {
    event.preventDefault();
    focusAddress();
  } else if (key === 't') {
    event.preventDefault();
    createTab();
  } else if (key === 'w') {
    event.preventDefault();
    closeTab(activeTabId);
  } else if (key === 'r') {
    event.preventDefault();
    activeTab()?.view.webContents.reload();
  } else if (key === '[') {
    event.preventDefault();
    const contents = activeTab()?.view.webContents;
    if (contents?.canGoBack()) contents.goBack();
  } else if (key === ']') {
    event.preventDefault();
    const contents = activeTab()?.view.webContents;
    if (contents?.canGoForward()) contents.goForward();
  }
}

function wireShortcuts(contents) {
  contents.on('before-input-event', handleShortcut);
}

function wireTabEvents(tab) {
  const contents = tab.view.webContents;
  const update = () => broadcastState();
  contents.on('page-title-updated', (_event, title) => {
    tab.title = title;
    update();
  });
  contents.on('page-favicon-updated', (_event, favicons) => {
    tab.favicon = favicons[0] || '';
    update();
  });
  contents.on('did-start-loading', update);
  contents.on('did-stop-loading', update);
  contents.on('did-navigate', () => {
    rememberPage(tab);
    update();
  });
  contents.on('did-navigate-in-page', update);
  contents.on('render-process-gone', () => {
    tab.title = 'Страница перестала отвечать';
    update();
  });
  contents.setWindowOpenHandler(({ url }) => {
    createTab(url);
    return { action: 'deny' };
  });
  wireShortcuts(contents);
}

function createTab(url) {
  const view = new WebContentsView({
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  view.setBackgroundColor('#111425');
  const tab = { id: nextTabId++, title: 'Новая вкладка', favicon: '', view };
  tabs.push(tab);
  window.contentView.addChildView(view);
  wireTabEvents(tab);
  activateTab(tab.id);
  if (chromeView) window.contentView.addChildView(chromeView);

  const address = normalizeAddress(url);
  if (address) view.webContents.loadURL(address);
  else view.webContents.loadFile(START_PAGE);
  return tab.id;
}

function activateTab(id) {
  if (!tabs.some((tab) => tab.id === Number(id))) return;
  activeTabId = Number(id);
  for (const tab of tabs) tab.view.setVisible(tab.id === activeTabId);
  layoutViews();
  broadcastState();
}

function closeTab(id) {
  const index = tabs.findIndex((tab) => tab.id === Number(id));
  if (index < 0) return;
  if (tabs.length === 1) {
    window.close();
    return;
  }
  const [removed] = tabs.splice(index, 1);
  window.contentView.removeChildView(removed.view);
  removed.view.webContents.close();
  if (activeTabId === removed.id) activateTab(tabs[Math.min(index, tabs.length - 1)].id);
  else broadcastState();
}

function createChromeView() {
  chromeView = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  chromeView.setBackgroundColor('#00000000');
  window.contentView.addChildView(chromeView);
  wireShortcuts(chromeView.webContents);
  chromeView.webContents.on('did-finish-load', broadcastState);
  chromeView.webContents.loadFile(CHROME_PAGE);
}

function createWindow() {
  window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 760,
    minHeight: 520,
    title: 'Aira',
    backgroundColor: '#0b0d18',
    vibrancy: 'under-window',
    visualEffectState: 'active',
    backgroundMaterial: 'acrylic',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    titleBarOverlay: process.platform === 'darwin' ? false : {
      color: '#00000000', symbolColor: '#eeeefe', height: 30
    }
  });
  window.setMenuBarVisibility(false);
  window.on('resize', layoutViews);
  window.on('closed', () => {
    tabs = [];
    activeTabId = null;
    chromeView = null;
    window = null;
  });
  createTab();
  createChromeView();
  layoutViews();
}

ipcMain.handle('tabs:new', (_event, url) => createTab(url));
ipcMain.handle('tabs:activate', (_event, id) => activateTab(id));
ipcMain.handle('tabs:close', (_event, id) => closeTab(id));
ipcMain.handle('tabs:reorder', (_event, id, targetId, after) => reorderTab(id, targetId, after));
ipcMain.handle('nav:go', (_event, value) => {
  const url = normalizeAddress(value);
  if (url) activeTab()?.view.webContents.loadURL(url);
});
ipcMain.handle('nav:back', () => {
  const contents = activeTab()?.view.webContents;
  if (contents?.canGoBack()) contents.goBack();
});
ipcMain.handle('nav:forward', () => {
  const contents = activeTab()?.view.webContents;
  if (contents?.canGoForward()) contents.goForward();
});
ipcMain.handle('nav:reload', () => activeTab()?.view.webContents.reload());
ipcMain.handle('nav:stop', () => activeTab()?.view.webContents.stop());
ipcMain.handle('ui:set-overlay-bottom', (_event, bottom) => {
  chromeHeight = Math.max(TOOLBAR_HEIGHT, Math.round(Number(bottom) || TOOLBAR_HEIGHT));
  layoutViews();
});
ipcMain.handle('browser:get-state', () => browserState());

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
