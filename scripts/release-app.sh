#!/usr/bin/env bash
# Builds the Mac app: signed with the Developer ID, notarized and stapled, as a DMG (the first install) and a
# ZIP (what installed copies update from). With --publish it pushes and puts both on the GitHub release
# v<version>; installed apps find it through latest-mac.yml within a few hours. See docs/releasing.md.
#
#   ./scripts/release-app.sh             build and notarize into dist-app/
#   ./scripts/release-app.sh --publish   then push and create the GitHub release
#
# NOTES='What changed, in a line or two.' becomes the release text.
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION=$(node -p "require('./package.json').version")
# notarytool credentials for team AF86JFLJ32 (the profile was made for CallScribe; it fits any app of the team)
NOTARY_PROFILE="${NOTARY_PROFILE:-CallScribe}"
APP="dist-app/mac-arm64/Serpentine.app"
DMG="dist-app/Serpentine-${VERSION}.dmg"
ZIP="dist-app/Serpentine-${VERSION}-mac.zip"
PUBLISH=0
[ "${1:-}" = "--publish" ] && PUBLISH=1

# A release is a commit on main (--publish pushes HEAD there, fast-forward only), and its version has to be
# new: installed copies only take a higher one.
if [ -n "$(git status --porcelain)" ]; then
    echo "ERROR: commit first — the working tree has changes." >&2
    exit 1
fi
if gh release view "v${VERSION}" >/dev/null 2>&1; then
    echo "ERROR: v${VERSION} is already released — bump the version (npm version <x.y.z> --no-git-tag-version)." >&2
    exit 1
fi
IDENTITY=$(security find-identity -v -p codesigning | awk -F'"' '/Developer ID Application/ {print $2; exit}')
if [ -z "$IDENTITY" ]; then
    echo "ERROR: no Developer ID Application certificate in the keychain (Xcode ▸ Settings ▸ Accounts ▸ Manage Certificates)." >&2
    exit 1
fi
if ! xcrun notarytool history --keychain-profile "$NOTARY_PROFILE" >/dev/null 2>&1; then
    cat >&2 <<MSG
ERROR: no notarization credentials stored as "$NOTARY_PROFILE". Create an app-specific password at
https://account.apple.com ▸ Sign-In and Security, then once:
  xcrun notarytool store-credentials "$NOTARY_PROFILE" --apple-id <your Apple ID> --team-id AF86JFLJ32
MSG
    exit 1
fi

rm -rf dist-app
npm run build
node electron/build.mjs
# electron-builder signs and notarizes the app (and staples the ticket) before it packs the DMG and the ZIP
APPLE_KEYCHAIN_PROFILE="$NOTARY_PROFILE" npx electron-builder --mac --publish never

codesign --verify --deep --strict "$APP"
xcrun stapler validate "$APP"
spctl --assess --type execute --verbose=2 "$APP"

# The DMG too, so opening the download raises no warning. Stapling changes the file: its entry in
# latest-mac.yml gets the new size and hash (installed copies update from the ZIP, but the feed stays true).
codesign --force --sign "$IDENTITY" --timestamp "$DMG"
echo "Notarizing the DMG…"
xcrun notarytool submit "$DMG" --keychain-profile "$NOTARY_PROFILE" --wait
xcrun stapler staple "$DMG"
node --input-type=module - "$DMG" <<'JS'
import { createHash } from 'node:crypto';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
const dmg = process.argv[2];
const feed = 'dist-app/latest-mac.yml';
const sha512 = createHash('sha512').update(readFileSync(dmg)).digest('base64');
const lines = readFileSync(feed, 'utf8').split('\n');
const at = lines.findIndex((l) => l.trim() === `- url: ${basename(dmg)}`);
if (at < 0) throw new Error(`${basename(dmg)} is not in ${feed}`);
for (let i = at + 1; i < lines.length && !lines[i].trimStart().startsWith('- url:') && lines[i].startsWith('  '); i++) {
  if (lines[i].trim().startsWith('sha512:')) lines[i] = lines[i].replace(/sha512: .*/, `sha512: ${sha512}`);
  if (lines[i].trim().startsWith('size:')) lines[i] = lines[i].replace(/size: .*/, `size: ${statSync(dmg).size}`);
}
writeFileSync(feed, lines.join('\n'));
JS
spctl --assess --type open --context context:primary-signature --verbose=2 "$DMG"
echo "Built $DMG and $ZIP (v${VERSION})"

if [ "$PUBLISH" = "0" ]; then
    echo "To publish: ./scripts/release-app.sh --publish (it rebuilds), or upload dist-app/{*.dmg,*.zip,*.blockmap,latest-mac.yml} to a release v${VERSION}."
    exit 0
fi

git push origin HEAD:main
gh release create "v${VERSION}" "$DMG" "$ZIP" dist-app/*.blockmap dist-app/latest-mac.yml \
    --target "$(git rev-parse HEAD)" --title "Serpentine ${VERSION}" --notes "${NOTES:-Serpentine ${VERSION}}"
echo "Published ${VERSION}. Installed copies pick it up within a few hours, or at Serpentine ▸ Check for Updates…"
