# Lessons

Every fix adds an entry here, so the next route (and the next session) starts smarter. Each entry gives the
symptom (what it looked like), cause, fix and where. Newest at the bottom of each section.

## Rendering and shaders

- **GLSL redefinition errors on GLB models.** A material was patched twice (loaded model plus its clone). Fix:
  `patchMaterial` is idempotent through an `atmo` flag. Where: `src/engine/atmosphere.ts`.
- **Black environment lighting.** `PMREMGenerator.fromScene` uses a default far plane of 100, smaller than the sky
  radius. Fix: `fromScene(scene, 0.04, 0.5, 3000)`. Where: `Engine.updateEnvironment`.
- **Bloom blacks out the whole frame.** GLSL `pow()` of a negative base gives NaN, and bloom spreads it. Fix: clamp
  the bases before `pow`.
- **WebGL frame turns white or washed out.** A 2D canvas read back on ANGLE/Metal. Fix:
  `getContext('2d', { willReadFrequently: true })`.
- **Pines rendered white.** The bark-tint exclusion covered all of v < 0.5 of the atlas. Fix: restrict it to the
  bark cell (`uv.y` 0.25–0.5, `uv.x` < 0.5). Where: `treeModels.ts` `preserveCoverage`.
- **Every house turned brown.** A shared `THREE.Color` constant was mutated for the alm timber. Fix: clone shared
  colours before changing them.
- **Hard square shadow on the summit meadow.** It was the real transmitter platform, not a bug; the hard edge came
  from the shadow-map border. Fix: fade shadows near the shadow-map edge (`atmoShadowFade`). Lesson: check reality
  before "fixing" a shadow.
- **Grey band along the road edge.** The road's shoulder alpha ramp was wide and light (the terrain wasn't the
  cause). Fix: a narrow, dark gravel seam. Where: `Road.ts`.

## Placement and geometry

- **Floating trunks and buildings.** They were placed on the raw DEM, but the road corridor is flattened. Fix:
  place with `terrain.groundHeight`. Where: `Vegetation.ts`, `Buildings.ts`.
- **Huge smeared carve beside the road.** The cut band reached far beyond the road. Fix: limit cut and fill to
  about 10 m and blend back to the natural slope. Where: `Terrain.flatten`.
- **Blue sky strip at the bottom of the tunnel.** The bore had no floor. Fix: a closed floor profile. Where: `Tunnel.ts`.
- **Paved discs inside real roundabouts.** A synthetic fill was drawn into loops OSM already has. Fix: removed;
  only synthesised turning circles get pavement.
- **Fake sea on coastal flats.** The "dark and flat" photo test caught shaded farmland. Fix: a stricter threshold
  where photo-sea is on, and never on canopy or verge. Where: `terrainMaterial.ts`.

## Data and bakes

- **Turnaround bake found no loop.** `shortestCycle` returned `[]`, which is not null. Fix: a simple-cycle DFS with
  an explicit null, entry at the nearest end, a spur-trim limit of 150 m, and tunnels recomputed after trimming.
  Where: `scripts/bake-turnarounds.mjs`.
- **Overpass is flaky.** Bake OSM per route from a local dump (`bake-osm.mjs --from=`). Never fetch at runtime.
- **Dark smears on slopes in drone views (Formentor).** Shadows are baked into the PNOA orthophotos. De-lighting
  dark photo pixels helps only partly; the real fix needs another imagery source or a ground shader that ignores
  the photo on steep shaded faces.
- **The route started on a side street.** BRouter snapped the Gaisberg start to a service road beside the B158, so a
  lead-in along the B158 never reached `coords[0]`. Fix: the lead-in joins at the first route point on the same road
  and replaces the route before it (`leadIn.join`). Where: `scripts/bake-leadin.py`, `src/geo/leadIn.ts`.
- **BRouter cuts switchbacks.** On the B158 at Obergnigl it took a side street and a cycle path. Fix: follow the OSM
  ways of one `ref` with a shortest path instead. Where: `scripts/bake-leadin.py`.
- **Commons titles lie.** "meadow-kuehberg-autumn-01" is a trail signpost. Check reference photos by eye before
  they go on a board or into a brief.

## Capture and review

- **A screenshot with pending tiles shows blurry or low-detail terrain** that looks like a bug. Re-shoot after
  `pending` reaches 0 (`engine.stats`).
- **HMR reloaded the page mid-flyover.** Don't edit `src/` while `flyover.mjs` or `shots-set.mjs` runs.
- **Large videos can't be sent to the phone (30 MB limit).** Re-encode at crf 28, 1280 px.

## Devices and riding

- **Closing the app tabs dropped Chris's ride.** The tabs were closed to protect his wife's KICKR. Never close,
  reload or restart anything at :5199 without asking.
- **A dead battery lost a whole Gaisberg ride.** The Mac hibernated at 2 %, woke on the charger with the tab intact,
  and then Vite's client ("server connection lost. Polling for restart…") reloaded the page: the ride only lived in
  memory until "End ride". Fix: the ride is kept in IndexedDB every 5 s and on pagehide; Home offers Carry on / Save
  ride / Discard; a ride asks before the page unloads; a screen wake lock keeps the display on. Where:
  `src/sim/unfinished.ts`, `RideSession.snapshot/resume`, `App.tsx`.
- **The battery drained 50 % an hour.** The GPU was flat out the whole ride: at 1× on the forest climbs the scene
  makes 45–57 fps on an M5 Max, so a 60 fps cap changes nothing there. Trees and 4× MSAA cost the most (each about
  +40 % fps when off); AO and the sun shadows little. Fix: unplugged, the Fast preset without MSAA at 30 fps (GPU
  busy ~90 % → ~40 %); the cap still stops 120 Hz rendering where the GPU has room. Measure with
  `ioreg -r -c IOAccelerator` "Device Utilization %" in a visible window; `SystemLoad` is useless while charging.
  Where: `Engine.setBatterySaver`, `Engine.loop`.
- **Opening the app could take over someone else's trainer.** `reconnectKnown` silently reconnected the last
  trainer. Fix: rider profiles each keep their own saved devices; "Who's riding?" comes before any reconnect; a
  toggle for reconnecting saved devices; `?nobt=1`.
- **A slight rise in the road needed far more watts.** At 100 % difficulty the physics is right, but a trainer
  flywheel carries far less momentum than 85 kg of rider and bike. Fix: gradient increases ease in (tau 4 s); new
  riders start at 50 %. Where: `session.ts`, `profiles.ts`.
- **An easy lead-in on a real 6–7 % road.** No flat road leads to the Gaisberg; Gnigl to Guggenthal climbs 150 m.
  Fix: in the lead-in the felt gradient (trainer, speed and pacers) is a third of the real one, at most 2 %, blending
  into the real one over the last 200 m; the climb segment gets its own id so old times stay honest. Ghosts and
  "your best" compare only rides with the same lead-in setting. Where: `session.ts` `feltGrade`, `segments.ts`.
- **Number fields jumped to 500 W, 150 kg or 20 kg.** Clamping on every keystroke. Fix: `NumberInput` applies
  in-range values live and clamps on blur. Where: `src/ui/home/shared.tsx`.
