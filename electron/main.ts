// Serpentine as a Mac app. Electron's Chromium runs the same build that runs in Chrome (the renderer is tuned
// for it), a server in this process serves it with the rides API, and electron-updater keeps it current.
// Riders' settings live in the browser's localStorage; they are mirrored to the data folder so a new install
// (or the first start after the Chrome version) begins with them.

import { appendFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { app, BrowserWindow, dialog, ipcMain, Menu, screen, session, shell } from 'electron';
import { attachBluetooth } from './bluetooth.ts';
import { startServer } from './server.ts';
import { attachUpdates } from './updates.ts';

// The port is part of the origin, and storage belongs to the origin: keep it fixed.
const PORT = Number(process.env.SERPENTINE_PORT) || 5198;
const ORIGIN = `http://localhost:${PORT}`;
const DATA = process.env.SERPENTINE_DATA ?? join(homedir(), 'Documents', 'Serpentine');
const SETTINGS = join(DATA, 'data', 'local-settings.json');

if (process.env.SERPENTINE_USER_DATA) app.setPath('userData', process.env.SERPENTINE_USER_DATA);
// a trainer keeps riding while the window is behind another app
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');

function log(...parts: unknown[]) {
  const line = `${new Date().toISOString()} ${parts.map((p) => (p instanceof Error ? p.stack : typeof p === 'string' ? p : JSON.stringify(p))).join(' ')}\n`;
  try {
    mkdirSync(app.getPath('logs'), { recursive: true });
    appendFileSync(join(app.getPath('logs'), 'main.log'), line);
  } catch {
    /* logging must never stop the app */
  }
}

/** Pages Serpentine may open in its own window: itself and Strava's sign-in. */
function staysInApp(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.origin === ORIGIN) return true;
    const host = u.hostname;
    return (
      u.protocol === 'https:' &&
      (host === 'strava.com' ||
        host.endsWith('.strava.com') ||
        host === 'accounts.google.com' ||
        host === 'appleid.apple.com' ||
        host.endsWith('.facebook.com'))
    );
  } catch {
    return false;
  }
}

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as T;
  } catch {
    return null;
  }
}

function writeJson(file: string, value: unknown) {
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(`${file}.tmp`, JSON.stringify(value, null, 1));
  renameSync(`${file}.tmp`, file);
}

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
  maximized?: boolean;
}

function createWindow(): BrowserWindow {
  const boundsFile = join(app.getPath('userData'), 'window.json');
  const saved = readJson<Bounds>(boundsFile);
  const area = screen.getPrimaryDisplay().workArea;
  const visible = saved && screen.getAllDisplays().some((d) => {
    const a = d.workArea;
    return saved.x < a.x + a.width && saved.x + saved.width > a.x && saved.y < a.y + a.height && saved.y + saved.height > a.y;
  });
  const win = new BrowserWindow({
    ...(visible ? saved : { width: Math.min(1600, area.width), height: Math.min(1000, area.height) }),
    minWidth: 960,
    minHeight: 600,
    title: 'Serpentine',
    backgroundColor: '#0C121C',
    show: false,
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false,
      spellcheck: false,
    },
  });
  if (visible && saved.maximized) win.maximize();
  win.once('ready-to-show', () => win.show());
  win.on('close', () => {
    try {
      writeJson(boundsFile, { ...win.getNormalBounds(), maximized: win.isMaximized() });
    } catch {
      /* not worth stopping a quit for */
    }
  });

  const wc = win.webContents;
  // The ride screen asks before the page goes away; Chromium leaves that question to the app.
  wc.on('will-prevent-unload', (event) => {
    const choice = dialog.showMessageBoxSync(win, {
      type: 'question',
      message: 'Leave the ride?',
      detail: 'Serpentine keeps it: on the next start, Home offers to carry on, save it or discard it.',
      buttons: ['Keep Riding', 'Leave'],
      defaultId: 0,
      cancelId: 0,
    });
    if (choice === 1) event.preventDefault();
  });
  wc.on('will-navigate', (event, url) => {
    if (staysInApp(url)) return;
    event.preventDefault();
    if (/^https?:/.test(url)) void shell.openExternal(url);
  });
  wc.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  wc.on('render-process-gone', (_e, details) => log('renderer gone', details.reason, details.exitCode));
  return win;
}

function buildMenu(checkForUpdates: () => Promise<void>) {
  const rides = join(DATA, 'rides');
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: 'Serpentine',
        submenu: [
          { role: 'about' },
          { label: 'Check for Updates…', click: () => void checkForUpdates() },
          { type: 'separator' },
          {
            label: 'Show Rides Folder',
            click: () => {
              mkdirSync(rides, { recursive: true });
              void shell.openPath(rides);
            },
          },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' },
        ],
      },
      { role: 'editMenu' },
      {
        label: 'View',
        submenu: [
          { role: 'togglefullscreen' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'reload' },
          { role: 'toggleDevTools', accelerator: 'Alt+Command+I' },
        ],
      },
      { role: 'windowMenu' },
      {
        role: 'help',
        submenu: [{ label: 'Serpentine on GitHub', click: () => void shell.openExternal('https://github.com/chrisperkles/serpentine') }],
      },
    ]),
  );
}

function attachSettings() {
  // read once by the preload before the app's own code runs; empty storage is then filled from it
  ipcMain.on('settings:seed', (e) => {
    e.returnValue = readJson<Record<string, string>>(SETTINGS);
  });
  let last = '';
  ipcMain.on('settings:backup', (_e, snapshot: Record<string, string>) => {
    const text = JSON.stringify(snapshot);
    if (text === last || !Object.keys(snapshot).length) return;
    last = text;
    try {
      writeJson(SETTINGS, snapshot);
    } catch (err) {
      log('settings backup failed', err);
    }
  });
  ipcMain.on('app:version', (e) => {
    e.returnValue = app.getVersion();
  });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let win: BrowserWindow | null = null;
  app.on('second-instance', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });
  app.on('window-all-closed', () => app.quit());

  void app.whenReady().then(async () => {
    log('start', app.getVersion(), ORIGIN);
    app.setAboutPanelOptions({
      applicationName: 'Serpentine',
      applicationVersion: app.getVersion(),
      copyright: 'MIT License · github.com/chrisperkles/serpentine',
    });
    const allowed = new Set(['screen-wake-lock', 'fullscreen', 'clipboard-sanitized-write', 'persistent-storage', 'pointerLock']);
    session.defaultSession.setPermissionRequestHandler((_wc, permission, done) => done(allowed.has(permission)));

    try {
      await startServer(join(app.getAppPath(), 'dist'), PORT);
    } catch (e) {
      log('server failed', e);
      dialog.showErrorBox(
        'Serpentine cannot start',
        `Port ${PORT} is already in use. Quit whatever uses it (another copy of Serpentine?) and open Serpentine again.\n\n${String(e)}`,
      );
      app.quit();
      return;
    }

    attachSettings();
    win = createWindow();
    attachBluetooth(win, log);
    buildMenu(attachUpdates(win, log));
    await win.loadURL(`${ORIGIN}/`);
  });
}
