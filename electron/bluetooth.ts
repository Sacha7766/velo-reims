// Web Bluetooth in Electron has no device chooser and no getDevices(), so Chrome's "pick your trainer" list
// and "reconnect saved devices" are rebuilt here. The chooser is drawn by the preload over the page; this side
// feeds it the devices Chromium finds. For reconnecting, every device the rider picks is remembered by the
// page's id, and on the next start the page asks for those again: each one is a requestDevice that this side
// answers by itself the moment the remembered device shows up, without a click. The page keeps asking for a
// while (src/devices), and the rider opening the chooser ends a search that is under way.

import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { app, ipcMain, type BrowserWindow } from 'electron';
import { fromApp, isAppUrl } from './origin.ts';

interface Known {
  /** Chromium's address for the device, stable on this Mac. */
  address: string;
  name: string;
  /** The requestDevice options it was found with, as JSON: asking again with them finds it again. */
  options: string;
}

interface Pending {
  callback: (deviceId: string) => void;
  /** Set when this request is a silent reconnect, not the rider choosing. */
  target?: { address: string };
  timer?: ReturnType<typeof setTimeout>;
  /** The chooser's next refresh, when one is due. */
  refresh?: ReturnType<typeof setTimeout>;
  list: Electron.BluetoothDevice[];
}

/** How long a silent reconnect looks for a remembered device before giving up (a trainer wakes up in seconds). */
const SEARCH_MS = 12_000;

export function attachBluetooth(win: BrowserWindow, log: (...a: unknown[]) => void) {
  const file = join(app.getPath('userData'), 'bluetooth.json');
  let known: Record<string, Known> = {};
  try {
    known = JSON.parse(readFileSync(file, 'utf8')) as Record<string, Known>;
  } catch {
    /* first start */
  }
  const save = () => {
    writeFileSync(`${file}.tmp`, JSON.stringify(known, null, 1));
    renameSync(`${file}.tmp`, file);
  };

  let pending: Pending | null = null;
  let nextTarget: Pending['target'] | undefined;
  let chosen: string | null = null;
  // a silent reconnect under way, and whether the rider's own pick asked it to stop
  let searching: Promise<string[]> | null = null;
  let silent = false;
  let cancelled = false;
  // logged once per start: the page asks again every few seconds while a device sleeps
  const notFound = new Set<string>();
  // the active rider's devices, tagged in the chooser (a household has two trainers of one model)
  let mine = new Set<string>();
  const wc = win.webContents;

  const finish = (deviceId: string) => {
    const p = pending;
    if (!p) return;
    pending = null;
    clearTimeout(p.timer);
    clearTimeout(p.refresh);
    if (!p.target) wc.send('bt:close');
    p.callback(deviceId);
  };

  wc.on('select-bluetooth-device', (event, list, callback) => {
    event.preventDefault();
    // devices are for Serpentine's own page, not for a sign-in page shown in the same window
    if (!isAppUrl(wc.getURL())) return callback('');
    if (!pending) {
      // a silent search the rider's pick cancelled before it began: end it without a chooser
      if (silent && !nextTarget) return callback('');
      pending = { callback, target: nextTarget, list: [] };
      nextTarget = undefined;
      if (pending.target) pending.timer = setTimeout(() => finish(''), SEARCH_MS);
      else wc.send('bt:open');
    }
    pending.callback = callback;
    const target = pending.target;
    if (target) {
      // by address only: a name can be shared (two controllers, a household's two trainers of one model)
      if (list.some((d) => d.deviceId === target.address)) finish(target.address);
      return;
    }
    // Chromium sends the whole list dozens of times a second while it scans: the chooser gets the latest
    // one at most four times a second
    const p = pending;
    p.list = list;
    p.refresh ??= setTimeout(() => {
      p.refresh = undefined;
      if (pending !== p) return;
      wc.send(
        'bt:list',
        p.list
          .filter((d) => d.deviceName)
          .map((d) => ({ id: d.deviceId, name: d.deviceName, lastUsed: mine.has(d.deviceId) }))
          .sort((a, b) => Number(b.lastUsed) - Number(a.lastUsed) || a.name.localeCompare(b.name)),
      );
    }, 250);
  });

  // a reload or navigation ends the page's request; don't leave the chooser up
  wc.on('did-start-navigation', (details) => {
    if (details.isMainFrame && !details.isSameDocument) finish('');
  });

  ipcMain.on('bt:choose', (e, deviceId: string) => {
    if (e.sender !== wc || !fromApp(e) || pending?.target) return;
    chosen = deviceId || null;
    finish(deviceId);
  });

  ipcMain.on('bt:picked', (e, id: string, name: string, options: string) => {
    if (e.sender !== wc || !fromApp(e) || !chosen) return;
    const address = chosen;
    chosen = null;
    try {
      // re-serialised here because it goes back into executeJavaScript as a literal
      known[id] = { address, name: String(name), options: JSON.stringify(JSON.parse(options)) };
      save();
    } catch (err) {
      log('bluetooth: could not remember', name, err);
    }
  });

  ipcMain.handle('bt:reconnect', (e, ids: string[]) => {
    if (e.sender !== wc || !fromApp(e) || !Array.isArray(ids) || searching) return [];
    cancelled = false;
    searching = (async () => {
      const found: string[] = [];
      for (const id of new Set(ids)) {
        const k = known[id];
        if (!k || pending || cancelled) continue;
        nextTarget = { address: k.address };
        silent = true;
        // requestDevice needs a user gesture; executeJavaScript can lend one
        const ok = await wc
          .executeJavaScript(`window.__serpentineFind(${JSON.stringify(id)}, ${k.options})`, true)
          .catch(() => false);
        silent = false;
        nextTarget = undefined;
        if (ok) {
          found.push(id);
          notFound.delete(id);
          log('bluetooth reconnect', k.name, 'found');
        } else if (!cancelled && !notFound.has(id)) {
          notFound.add(id);
          log('bluetooth reconnect', k.name, 'not found yet');
        }
      }
      return found;
    })().finally(() => {
      searching = null;
    });
    return searching;
  });

  // the rider opens the chooser: a silent search under way stops first (one requestDevice at a time)
  ipcMain.handle('bt:cancel', async (e) => {
    if (e.sender !== wc || !fromApp(e) || !searching) return;
    cancelled = true;
    nextTarget = undefined;
    if (pending?.target) finish('');
    await Promise.race([searching.catch(() => undefined), new Promise((r) => setTimeout(r, 3000))]);
  });

  ipcMain.on('bt:mine', (e, ids: unknown) => {
    if (e.sender !== wc || !fromApp(e) || !Array.isArray(ids)) return;
    mine = new Set(ids.flatMap((id) => (typeof id === 'string' && known[id] ? [known[id].address] : [])));
  });

  // the page's device events (connected, lost, back after n s) for Help ▸ Show Log in Finder
  ipcMain.on('bt:log', (e, line: unknown) => {
    if (e.sender !== wc || !fromApp(e)) return;
    log('device', String(line).slice(0, 300));
  });
}
