// Bundles the main process and the preload into dist-electron/. Everything they import, electron-updater
// included, goes into the bundle, so the packaged app needs no node_modules.
import { build } from 'rolldown';

for (const name of ['main', 'preload']) {
  await build({
    input: `electron/${name}.ts`,
    platform: 'node',
    external: ['electron'],
    logLevel: 'warn',
    output: { file: `dist-electron/${name}.cjs`, format: 'cjs', sourcemap: name === 'main' },
  });
}
