// In-app updates from GitHub releases (electron-updater reads latest-mac.yml there). On start the app looks
// first: a new version found then is installed straight away, with a progress screen and a restart, before
// anyone rides. One found later (a check every four hours) downloads in the background and installs when the
// app quits, so it never cuts into a ride; the page shows a small notice with "Restart now".

import { app, dialog, ipcMain, shell, type BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** This fork's releases (electron-builder.yml publishes there too). */
const OWNER = 'Sacha7766';
const REPO = 'velo-reims';
const EVERY_MS = 4 * 3600_000;
/** The start-up check only takes over the window if it finds something this quickly. */
const STARTUP_MS = 15_000;

/**
 * A copy signed ad hoc (the DMG GitHub Actions builds without a Developer ID) can't replace itself: Squirrel checks
 * the new version's signature against the running one. That build says so in its package.json.
 */
function canSelfUpdate(): boolean {
  try {
    return JSON.parse(readFileSync(join(app.getAppPath(), 'package.json'), 'utf8')).selfUpdate !== false;
  } catch {
    return true;
  }
}

export function attachUpdates(win: BrowserWindow, log: (...a: unknown[]) => void) {
  const wc = win.webContents;
  const auto = app.isPackaged && canSelfUpdate();
  let ready: string | null = null;
  let startup = auto;
  let installing: { version: string; percent: number } | null = null;
  const showInstalling = () => wc.send('update:installing', installing);

  // SERPENTINE_UPDATE_URL points a test copy at a local folder of builds instead of GitHub
  const local = process.env.SERPENTINE_UPDATE_URL;
  autoUpdater.setFeedURL(
    local ? { provider: 'generic', url: local } : { provider: 'github', owner: OWNER, repo: REPO, releaseType: 'release' },
  );
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = { info: (m) => log('update', m), warn: (m) => log('update warn', m), error: (m) => log('update error', m), debug: () => undefined };

  autoUpdater.on('update-available', (info) => {
    if (!startup) return;
    installing = { version: info.version, percent: 0 };
    showInstalling();
  });
  autoUpdater.on('download-progress', (p) => {
    if (!startup || !installing) return;
    installing.percent = p.percent;
    showInstalling();
  });
  autoUpdater.on('update-not-available', () => (startup = false));
  autoUpdater.on('error', () => {
    if (!startup) return;
    // offline or GitHub unreachable: ride the installed version
    startup = false;
    installing = null;
    showInstalling();
  });
  autoUpdater.on('update-downloaded', (info) => {
    log('update ready', info.version);
    ready = info.version;
    if (startup) {
      log('update: installing at start');
      autoUpdater.quitAndInstall(true, true);
      return;
    }
    wc.send('update:ready', info.version);
  });
  // the notices survive a reload
  wc.on('did-finish-load', () => {
    if (installing) showInstalling();
    else if (ready) wc.send('update:ready', ready);
  });
  ipcMain.on('update:install', (e) => {
    if (e.sender === wc && ready) autoUpdater.quitAndInstall();
  });
  ipcMain.on('update:skip', (e) => {
    if (e.sender !== wc) return;
    // the download goes on; it installs when the app quits
    startup = false;
    installing = null;
    showInstalling();
  });

  const check = () => void autoUpdater.checkForUpdates().catch((e: unknown) => log('update check failed', e));
  if (auto) {
    check();
    setTimeout(() => {
      if (!installing) startup = false;
    }, STARTUP_MS);
    setInterval(check, EVERY_MS);
  }

  /** Menu ▸ Check for Updates…: the same check, with an answer either way. */
  return async function checkNow() {
    if (!app.isPackaged) {
      await dialog.showMessageBox(win, { message: 'Updates work in the installed app only.' });
      return;
    }
    if (!auto) {
      const { response } = await dialog.showMessageBox(win, {
        message: 'This copy updates by hand.',
        detail: `Version ${app.getVersion()}. Newer versions are DMGs on the GitHub releases page; install one over this copy.`,
        buttons: ['Open Releases', 'Close'],
        defaultId: 0,
        cancelId: 1,
      });
      if (response === 0) void shell.openExternal(`https://github.com/${OWNER}/${REPO}/releases`);
      return;
    }
    if (ready) {
      const { response } = await dialog.showMessageBox(win, {
        message: `Serpentine ${ready} is ready.`,
        detail: 'It installs when you quit Serpentine.',
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
        cancelId: 1,
      });
      if (response === 0) autoUpdater.quitAndInstall();
      return;
    }
    try {
      const result = await autoUpdater.checkForUpdates();
      const latest = result?.updateInfo.version;
      if (result?.isUpdateAvailable && latest) {
        await dialog.showMessageBox(win, {
          message: `Serpentine ${latest} is downloading.`,
          detail: 'You can keep riding. It installs when you quit Serpentine.',
        });
      } else {
        await dialog.showMessageBox(win, { message: 'Serpentine is up to date.', detail: `Version ${app.getVersion()}` });
      }
    } catch (e) {
      log('update check failed', e);
      await dialog.showMessageBox(win, {
        type: 'warning',
        message: 'Could not check for updates.',
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  };
}
