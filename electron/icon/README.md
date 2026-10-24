# Serpentine's icon: "The climb"

A road in three legs and two hairpins, each leg climbing, warming from red at the bottom to amber at the top,
with the rider as a white dot nearly at the top. Night-blue tile.

- `appicon.svg`: the app icon (1024 × 1024, macOS icon grid, 824 px tile). `icon.icns` holds it at 64 px and up.
- `appicon-small.svg`: the road alone, thicker, without the centre line or the rider, which turn to noise when
  small. `icon.icns` holds it at 16 and 32 px.
- `AppIcon.icon`: the same design as layers for macOS 26 and later (an Icon Composer document: a #1D2B3F →
  #0C121C fill, the road and the rider as glass layers). `electron/after-pack.cjs` compiles it into
  `Assets.car`; `CFBundleIconName` points at it.

To rebuild `icon.icns` after editing a source, render both SVGs to an iconset with a renderer that draws SVG
blur filters (`resvg`, or a browser): `icon_16x16.png`, `icon_16x16@2x.png` and `icon_32x32.png` from
`appicon-small.svg`, the other seven sizes (64 to 1024 px) from `appicon.svg`. Then
`iconutil -c icns icon.iconset -o icon.icns`.

Colours: tile #1D2B3F → #0C121C; road #E8442E → #FFB15C (bottom to top), centre line #0C121C at 55 %; rider
#F7F7F2.
