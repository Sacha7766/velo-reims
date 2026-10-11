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
- **The GPU ran flat out, even on an M5 Max (45–57 fps at 1×, 31 fps at full Retina).** The logarithmic depth
  buffer writes `gl_FragDepth` in every fragment shader, which switches off early depth testing and the hidden-surface
  removal of Apple's tile GPUs: every hidden tree card and blade of grass was shaded. Fix: a reversed float depth
  buffer (`reversedDepthBuffer`, needs `EXT_clip_control`) keeps the near-to-horizon precision without depth writes.
  Forest climb: 31 → 87 fps at 2×; at the real settings 44 fps at 1× → a steady 60 fps at 1.6×, GPU busy 89 % → 63 %.
  Trees went from the dearest feature (+40 % fps when hidden) to nearly free. Where: `Engine` constructor.
- **Reversed depth: black frame, then darkened slopes, then self-shadowed walls.** Three library gaps, each found
  by rendering the same paused frame with `?depth=log` and without and diffing (`atmo.uTime` fixed, AO and sun
  shadows toggled one at a time). A bare `THREE.Camera` throws when three re-projects it (use an
  `OrthographicCamera`, `TerrainShadow.ts`); N8AO 2.0.1's full-screen quads depth-test and fail, and its post pass
  builds the half-res depth shader without `REVERSEDEPTH` (wrong normals); three 0.186's PCF shadow lookup adds the
  bias without flipping it. Fixes in `Engine` (AO render wrapper, `shadow.bias` sign). After them the frames match
  to under 1/255 on average at six spots. Re-check with `?depth=log` after upgrading three or N8AO.

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
  made 45–57 fps on an M5 Max, so a 60 fps cap changed nothing there. The real cause was the logarithmic depth buffer
  (see Rendering). Fix: reversed depth, plus a battery saver when unplugged: 30 fps, Beautiful drops to Balanced
  (GPU busy 42 % → 36 % at 30 fps; Fast without MSAA only 2 points less and loses the soft tree edges). Measure with
  `ioreg -r -c IOAccelerator` "Device Utilization %" in a visible window; busy % is relative to the GPU clock, so
  compare frame rate and render scale too. `SystemLoad` in AppleSmartBattery updates only every few minutes.
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
