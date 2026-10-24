# Releasing the Mac app

Riders install the DMG once; every later version arrives in the app. `electron/updates.ts` (electron-updater)
reads `latest-mac.yml` from the newest GitHub release. On start a new version is installed right away (progress
screen, restart, "Skip, update later"); found later (a check every four hours) it downloads in the background
and installs when the app quits. The repository and its releases have to stay public for that.

## Cutting a release

```sh
npm version 1.1.0 --no-git-tag-version
git commit -am "Release 1.1.0"
NOTES='What changed, in a line or two.' ./scripts/release-app.sh --publish
```

`release-app.sh` refuses a dirty tree or a version that is already released. It builds the web app and the
Electron bundles, has electron-builder sign the app with the Developer ID (hardened runtime), notarize and
staple it and pack the DMG and the ZIP, then signs, notarizes and staples the DMG as well. With `--publish` it
pushes HEAD to `main` (fast-forward only) and creates the release `v1.1.0` with the DMG, the ZIP, their
blockmaps and `latest-mac.yml`. Without `--publish` it stops after the build; everything is in `dist-app/`.

Installed copies only take a higher version, so the version in `package.json` always goes up.

## One-time setup

1. **Developer ID Application certificate** for team AF86JFLJ32 in the login keychain (Xcode ▸ Settings ▸
   Accounts ▸ Manage Certificates ▸ + ▸ Developer ID Application).
2. **Notarization credentials** as a notarytool keychain profile. The script uses the profile `CallScribe`
   (made for CallScribe, valid for every app of the team); `NOTARY_PROFILE=<name>` picks another.

## How the pieces fit

- `electron/main.ts`: window, menu, permissions, and the local server on `http://localhost:5198`
  (`electron/server.ts`: `dist/` plus the same `/api` the dev server mounts). The port is part of the origin
  that owns localStorage, IndexedDB and the tile cache: never change it.
- `electron/preload.ts`: restores riders' settings into an empty localStorage from
  `~/Documents/Serpentine/data/local-settings.json` and mirrors them back every 15 s; draws the Bluetooth
  chooser and the update notice; installs `navigator.bluetooth.getDevices()`.
- `electron/bluetooth.ts`: Electron has no device chooser and no `getDevices()`. Devices the rider picks are
  remembered in `~/Library/Application Support/Serpentine/bluetooth.json`; on the next start each one is asked
  for again with a lent user gesture and selected automatically as soon as it advertises (12 s at most).
- `electron/icon/`: the app icon (see its README). `electron/after-pack.cjs` compiles the Icon Composer
  version into `Assets.car` before signing.
- Logs: `~/Library/Logs/Serpentine/main.log` (start, update checks, Bluetooth reconnects, errors).

## Testing an update without publishing

Build two versions, serve the newer one's ZIP, blockmap and `latest-mac.yml` from a folder, and start the older
one with `SERPENTINE_UPDATE_URL=http://127.0.0.1:<port>/`. `SERPENTINE_PORT`, `SERPENTINE_DATA` and
`SERPENTINE_USER_DATA` keep a test copy away from the real data:

```sh
npx electron-builder --mac --publish never -c.mac.notarize=false -c.extraMetadata.version=1.0.1
```
