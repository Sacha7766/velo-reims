// In-app updates from GitHub releases (electron-updater reads latest-mac.yml there). A new version downloads in
// the background and installs when the app quits, so it never cuts into a ride; the page shows a small notice
// with "Restart now" for whoever wants it sooner.

import { app, dialog, ipcMain, type BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';

const EVERY_MS = 4 * 3600_000;

export function attachUpdates(win: BrowserWindow, log: (...a: unknown[]) => void) {
  let ready: string | null = null;
  // SERPENTINE_UPDATE_URL points a test copy at a local folder of builds instead of GitHub
  const local = process.env.SERPENTINE_UPDATE_URL;
  autoUpdater.setFeedURL(
    local ? { provider: 'generic', url: local } : { provider: 'github', owner: 'chrisperkles', repo: 'serpentine', releaseType: 'release' },
  );
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = { info: (m) => log('update', m), warn: (m) => log('update warn', m), error: (m) => log('update error', m), debug: () => undefined };
  autoUpdater.on('update-downloaded', (info) => {
    log('update ready', info.version);
    ready = info.version;
    win.webContents.send('update:ready', info.version);
  });
  // the notice survives a reload
  win.webContents.on('did-finish-load', () => ready && win.webContents.send('update:ready', ready));
  ipcMain.on('update:install', (e) => {
    if (e.sender === win.webContents && ready) autoUpdater.quitAndInstall();
  });

  const check = () => void autoUpdater.checkForUpdates().catch((e: unknown) => log('update check failed', e));
  if (app.isPackaged) {
    setTimeout(check, 10_000);
    setInterval(check, EVERY_MS);
  }

  /** Menu ▸ Check for Updates…: the same check, with an answer either way. */
  return async function checkNow() {
    if (!app.isPackaged) {
      await dialog.showMessageBox(win, { message: 'Updates work in the installed app only.' });
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
