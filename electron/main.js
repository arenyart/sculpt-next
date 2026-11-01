import { app, BrowserWindow, ipcMain, shell } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWindowState, trackWindowState } from './windowState.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');
const alphaDir = path.join(distDir, 'resources', 'alpha');

// Popups that must stay inside the app (Sketchfab OAuth reads the popup URL back).
const IN_APP_POPUP_HOSTS = new Set(['sketchfab.com']);

ipcMain.handle('sculptgl:list-alphas', async () => {
  try {
    const files = await fs.readdir(alphaDir);
    return files.filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
  } catch {
    return [];
  }
});

async function createWindow() {
  const state = await loadWindowState({ width: 1366, height: 768 });

  const win = new BrowserWindow({
    ...state.bounds,
    useContentSize: true,
    backgroundColor: '#3c3c3c',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  });

  if (state.isMaximized) win.maximize();
  win.removeMenu();
  trackWindowState(win);

  win.webContents.setWindowOpenHandler(({ url }) => {
    const { hostname, protocol } = new URL(url);
    if (IN_APP_POPUP_HOSTS.has(hostname)) return { action: 'allow' };
    if (protocol === 'https:' || protocol === 'http:') shell.openExternal(url);
    return { action: 'deny' };
  });

  win.once('ready-to-show', () => win.show());

  if (process.env.SCULPTGL_DEV_URL) await win.loadURL(process.env.SCULPTGL_DEV_URL);
  else await win.loadFile(path.join(distDir, 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
