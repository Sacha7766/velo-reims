# Roadmap

From the audit of 2026-10-24 (after the Mac app's 1.0.1): what to fix and build next, in order. Parked ideas
with no order yet live in [BACKLOG.md](BACKLOG.md).

## 1.0.2: safe to share

- [x] The Mac app's preload (and its bridge, settings mirror and Bluetooth) works only on Serpentine's own page,
  not on the Strava, Google or Apple sign-in pages shown in the same window. Those used to get the riders'
  names, weights and FTPs copied into their storage.
- [x] The local API refuses changes from other websites (a plain cross-site POST could replace the Strava app
  and drop every rider's tokens), and its errors no longer show paths or parser details.
- [x] A ride whose save fails at the end shows its summary with **Save again**; the copy kept every 5 s stays.
- [x] Trainer commands that fail or hang (3 s) are sent again on the next tick instead of being lost.
- [x] Battery warning that can't be missed: at 20 % or less, unplugged, a large warning at the top of the screen
  shows the minutes left and stays when the HUD is hidden. A chime sounds at 20, 10 and 5 %, and the start bar
  warns before the ride.
- [x] Help ▸ Copy Diagnostics and Show Log in Finder, for friends who need help.
- [x] Gaisberg comes first and is tagged "Most detailed", so a new rider starts on the best route instead of
  the 26 km Großglockner.
- [x] `npm test` (unit tests and the local API), `npm run check`, CI on every push, and the release script
  runs the checks too.
- [x] Small hardening: `.zwo` repeat counts capped, broken GPX points dropped; README fixes; two unused rock
  models removed (4 MB).

## 1.1: rides you can trust

- A trainer drop-out mid-ride: a banner on the HUD, and the gap kept out of NP/TSS instead of being counted
  as minutes at 0 W (`devices/index.ts` `onDisconnected`, `sim/session.ts`).
- Ride time from the clock, not from drawn frames: below 10 fps the ride runs in slow motion today
  (`Engine.ts` clamps a frame to 0.1 s), and a hidden Chrome tab stops it. Needed for multiplayer, too.
- Free everything a ride built when it ends: props, life, tunnels, landmarks, textures and pacer name tags
  are left in GPU memory today (`Engine.unloadWorld`). Check with `renderer.info.memory` over three rides.
- Tests for the ride session, the unfinished-ride copy, storage and the device hub (fake devices).

## 1.2: Strava for everyone

Rides go to Strava by themselves at the end, and friends can connect without creating their own Strava API
app. Decide first: one Serpentine Strava app with a tiny token service holding its secret (Strava caps new apps
at a single athlete until it approves more), or keep "bring your own app" for segments and add upload only.

## 1.3: ride with friends

The multiplayer plan: friends' rides as ghosts (share a ride file, it rides with you), then live rooms (a small
relay, e.g. Cloudflare Durable Objects) with group rides and races. Needs 1.1's clock fix.

## One world: ride freely

Today every route is its own small world: one road, the terrain, OSM, trees and scenery baked for a corridor
around it, and the rider moves along it in one dimension. The aim is open worlds where the routes are
connected by the real roads between them, so you can ride anywhere, take any turn and still ride the famous
climbs as named routes inside the world.

- **Regions first, not literally everything.** Salzburger Land (Gaisberg and Wolfgangsee via Koppl and Fuschl,
  later the Großglockner and Kitzbüheler Horn via the Pinzgau), Mallorca (Formentor and Sa Calobra via Pollença
  and Lluc), the Oisans (Alpe d'Huez), Provence (Ventoux), Stelvio, the Wachau. City loops stay their own worlds.
  A world map jumps between regions; Austria could later grow into one large world, since its routes are
  connected by real roads.
- **A road graph instead of one polyline:** OSM roads of the region with junctions and elevation profiles. The
  rider still rolls along one road at a time; at a junction the default is the main road, and the Zwift Ride's
  D-pad or the arrow keys pick another, shown on the HUD ahead of the turn.
- **Streaming instead of one bake per route:** terrain already streams by tiles; OSM, trees, buildings and
  roadside need to be built in chunks ahead of the rider and freed behind (1.1's dispose work is the first step).
- **What changes with it:** segments, ghosts, records and the FIT track move from distances along one route to
  positions on the graph; routes become start, end and a path through the world.
- **First step: a spike.** Link Gaisberg and Wolfgangsee over the real roads, with junction choice and chunk
  streaming, and measure memory and load times on the M5 Max and an older MacBook Air.

Effort: weeks, not days. It also makes multiplayer better: one shared world per region instead of everyone on
one road.

## Art: every route to APPROVE

No route has passed the art review yet (`docs/art/scorecard.md`; best scores 3.13 for the Kitzbüheler Horn and
Großglockner after round 3). One route per round through the brief → capture → review loop in CLAUDE.md, the
famous climbs first: Alpe d'Huez, Ventoux, Stelvio, then Gaisberg again with the shared fixes since its review.

## Later

- Weather and time of day, in the order of [BACKLOG.md](BACKLOG.md): live weather and the real sun first.
- Intel Macs (an x64 or universal build), if a friend needs one.
- Import `.fit` rides from Zwift or Garmin into History, and export drawn routes as `.gpx`.
