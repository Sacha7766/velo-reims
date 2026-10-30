// Compiles the layered Icon Composer icon into Assets.car before electron-builder signs the app: macOS 26 and
// later draw that one (CFBundleIconName); older macOS uses icon.icns. Without it macOS 26 shows the .icns
// shrunk inside a gray square.
const { execFileSync } = require('node:child_process');
const { mkdtempSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;
  const app = join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  try {
    compile(app);
  } catch (e) {
    // a CI runner's Xcode may predate Icon Composer: the app keeps icon.icns (a gray square around it on macOS 26)
    if (!process.env.CI) throw e;
    console.warn(`afterPack: Assets.car not compiled (${e.message.split('\n')[0]}); the app keeps icon.icns`);
  }
};

function compile(app) {
  execFileSync('xcrun', [
    'actool', '--compile', join(app, 'Contents/Resources'), '--platform', 'macosx', '--target-device', 'mac',
    '--minimum-deployment-target', '12.0', '--app-icon', 'AppIcon', '--enable-on-demand-resources', 'NO',
    '--output-partial-info-plist', join(mkdtempSync(join(tmpdir(), 'actool-')), 'AppIcon.plist'),
    '--development-region', 'en', join(__dirname, 'icon/AppIcon.icon'),
  ], { stdio: 'ignore', env: { ...process.env, DEVELOPER_DIR: process.env.DEVELOPER_DIR || '/Applications/Xcode.app/Contents/Developer' } });
}
