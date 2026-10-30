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
- **The second tunnel was dark but had no portal cut.** The tunnel shader handled only a route's first tunnel.
  Fix: per-tunnel spans, bounds and lamp flags in one point list (`MAX_TUNNELS` 4). Where: `atmosphere.ts`
  `TUNNEL_GLSL`, `Tunnel.ts`.
- **Sa Calobra's road cuts looked like smooth beige plaster.** Most of a "cut" is the ~50° bank above the rock
  face, which the karst shader kept as garrigue, and the cliff scan leans warm ochre (right for Formentor, wrong for
  grey Tramuntana limestone). Fix: per-route `biomeTweaks` in `scenes/<id>.json` (`cliffSlope` where the scan takes
  over, `rockOchre`); grey rock is lifted and its streaks flattened. Where: `biome.ts`, `terrainMaterial.ts`.
- **Stelvio's forest floor and pastures were white.** basemap.at answers tiles outside Austria at zoom 12–15
  and 18 with white JPEGs (2.4 KB, decoded as 253 in Chrome), not 404s, and the size check only caught placeholders
  under 800 bytes. Stelvio lies inside the bounds box used for Austria. Lesson: when ground looks wrong, dump the
  tile textures off the terrain meshes before tuning the shader (two shader "fixes" changed nothing). Fix: a tile
  that is over a tenth near-white and neutral falls back to Esri; a national source that only misses for a world is
  skipped. Where: `src/geo/imagery.ts`.
- **Alpe d'Huez and Bédoin had Salzburg farmhouses** (green shutters, geraniums). Fix: building styles are data
  (palettes, pitch, timber storeys, balcony kind, shutter colours) picked by the biome's `buildings`, overridable in a
  scene's `biomeTweaks` (`savoie`, `provence`). Where: `Buildings.ts` `STYLES`, `scenes/<id>.json`.
- **Mont Ventoux had no summit tower.** OSM towers and masts were skipped as buildings and only appeared where a
  scene placed a model. Fix: communication towers render as shaft, drum and banded antenna, small mapped masts as
  steel poles; towers near a scene model are left to it; industrial blocks are bare concrete. Where: `osm.ts`
  `towers`, `Props.towers`.
- **Shaded slopes went near-black** (Großglockner valley, Kitzbüheler Horn pastures). Not AO, terrain or cloud
  shadows (toggling each changed nothing): the orthophoto is near-black there itself (the flight's shadows), and a
  face turned from our sun only gets skylight. Fix: divide out the photo's summer-midday sun by the terrain normal,
  lift photo shadows to a floor of 0.085 (was 0.055), and add light bounced off the lit slopes opposite to faces
  turned from the sun. Shade is 20–35 % brighter, sunlit flats unchanged. Measure pixel means in a fixed box: the
  change is easy to miss on a contact sheet. Where: `terrainMaterial.ts`.
- **Grass read as tall spiky blades on every Alpine verge.** Fix: the verge (1.8 m from the asphalt) gets low mown
  tufts, and Alpine tufts are wider than tall (height factor 1.1 → 0.82); carritx unchanged. Where: `GroundCover.ts`.
- **Every tuft was half black ("dark olive spikes", flagged on all six new routes).** The grass cards carry an up
  normal so they light like the ground, but three.js flips the normal on the back faces of double-sided materials,
  so every card seen from behind was unlit. Fix: tufts keep their normal on back faces, and each tuft takes the
  ground normal under it (instanced `gNormal`), so on a shaded bank it is as dark as the turf, not a bright clump.
  Check any double-sided card material with a faked normal for the same flip. Where: `GroundCover.ts`.
- **Shaded meadow was teal** (blue above green: Kitzbüheler Horn banks 68/95/82, Wolfgangsee verge 61/80/83). The
  photo's own shadows are blue already and the sky fill added more. Fix: the terrain's indirect light loses 20 % of
  its blue, so shade is a darker ground colour. Where: `terrainMaterial.ts` (aomap_fragment).
- **Lakes were a pale white sheet from the road.** At a grazing view the fresnel reflection is mostly the horizon
  sky, which is pale. In the Alps the low reflected rays hit the mountains across the lake. Fix: low reflected rays
  take a dark, hazed shore colour, steeper ones the sky (sea unchanged). Where: `terrainMaterial.ts` water block.
- **The Champagne plain rendered as Alpine meadows, with near-white chalk fields.** No biome matched the Marne, so
  it fell back to the Alpine one (Salzburg farmhouses, spruce, Austrian posts), and the Alpine photo grade (gain
  1.32) plus the meadow push bleached the bright IGN chalk. Fix: a Champagne biome picked by bounds, a photo grade per
  biome (`photoGrade`), no meadow push. Where: `biome.ts`, `terrainMaterial.ts`.
- **A spring orthophoto for a late-August ride.** IGN BD ORTHO shows the plain in spring: winter cereals green, the
  ground for beet and maize bare chalk; by late August it is the other way round. Fix (`fieldSeason`): every parcel
  keeps its photographed outline and its blurred tone picks its state (green then: stubble now; bare then: beet,
  maize or potatoes), OSM meadows dry to hay, vineyards get leaf colour, the verge's spring green dries to olive. The
  3D crops by the road read the same photo the same way (`Terrain.photoAt`, `fieldState` in `GroundCover.ts`), so a
  maize wall stands where the ground is maize-green. Where: `terrainMaterial.ts`, `GroundCover.ts`, `Terrain.ts`.
- **Shutters, roller boxes and brick dressings were half drawn, as pixel speckle.** The facade shader hashed the
  building's base height, an interpolated varying whose last bits differ from pixel to pixel; a sin hash turns
  1e-5 into a different value. Fix: hash the base height quantised to 25 cm (`bid`). Where: `Buildings.ts`
  `facadeMaterial`. Hash only what is constant across a face.
- **The ride took 300 s to start instead of 50.** The ground cover's photo sample read each new terrain tile back
  from a GPU-backed 2D canvas, and every readback waited for the renderer. Fix: draw the decoded tile bitmaps into a
  small CPU canvas (`willReadFrequently`) instead. Where: `Terrain.loadTexture`.
- **No crops by the road, every field read as stubble.** The ground cover was built at the start, when only tiles of
  hundreds of metres per pixel covered the fields, and never rebuilt. Fix: `photoAt` returns its metres per pixel;
  chunks read from tiles coarser than 8 m are marked and rebuilt once the fine tiles are in. Where: `GroundCover`.
- **Dark winter wheat stayed dark green in August, and pale chalk counted as green.** The first field rule wanted
  a strong green (spring wheat in the IGN photo is near black-green at 3 m per pixel) and measured green as
  g − 0.93·max(r, b), which is positive for any bright grey. Fix: green over red and blue without the factor, dark
  saturated parcels count as crops, bare soil is any light, moderately saturated tone. Checked on probed colours
  before changing the shader and `fieldState` together. Where: `terrainMaterial.ts`, `GroundCover.ts`.
- **Stubble read near white** (198, 193, 167) where the Panoramax frames of 26 August show about (150, 135, 118).
  Fix: straw albedo around 0.4, a straw grain and tone patches. Where: `terrainMaterial.ts`.
- **Vine rows looked like rows of little trees.** The atlas leaf cluster is round, so each metre of row was a
  lollipop. Fix: the vine walls use only the dense middle of the cluster, under a flat top (vines are trimmed square
  in summer). Where: `GroundCover.vineGeometry`.
- **Village squares beside the road read near white and blue-violet (Berru, km 23.8).** The photo's bright concrete
  and gravel, JPEG colour noise included, went through the photo grade untouched. Fix: in built-up land, bright photo
  pixels become worn concrete grey. Where: `terrainMaterial.ts` field-season block.
- **Village ground smeared violet, white and black beside the road (qa3, finding 1).** At riding height the spring
  photo's yards (roofs leaning over their footprints, parked cars, building shadows, JPEG colour noise) smeared into
  blotches whatever each colour was graded to, and lifting the photo's shadows turned them lilac. Fix: in built-up
  land the photo only tells a garden (green in spring, at parcel scale) from paved or gravelled ground; each takes an
  even late-summer colour with the photo's light and dark kept at a quarter, the verge band included. Where:
  `terrainMaterial.ts` field season (`tTown`).
- **Noon shadows read blue-black and the golden hour dusk-blue (qa3, findings 8, 11, 13).** The presets' sky light
  suits Alpine meadows in October. On the chalk plain in August the sunlit stubble bounces warm light into every
  shade, and the evening air is dusty. Fix: `biome.light` sets the ambient sky and ground light per time of day
  (Champagne: warmer and stronger), the terrain's skylight warms over the fields, and `biome.warmHaze` warms the sky
  and haze away from a low sun. Where: `biome.ts`, `Engine.setTime`, `atmosphere.ts` (`uWarmHaze`),
  `terrainMaterial.ts`.
- **Walls read as stamped concrete blocks (qa3, finding 3).** One grid of 0.32 m courses at ±11 % per block covered
  every chalk house, barn and church. Fix: a course height per house (0.27–0.37 m, rubble 0.22–0.32 m on churches),
  blocks a shade apart (±5 %) with pale lime joints, broad weather stains and rising damp on every wall. Where:
  facade shader, `fChalk`.
- **One "accent" material dressed a sleeve end, a sock cuff and a shoe's trim (the rider model).** Tinting it per
  kit coloured all three alike. Fix: the rider's materials are chosen per part and material name (`torso:accent`,
  `shin:accent`…), so an outfit dresses each part on its own; the shin's own skin carries the taller sock. Where:
  `Rider.upgrade`, `outfits.ts`.
- **Knees and elbows read as a doll's ball joints (the rider model).** Each limb was two rigid parts meeting at the
  joint; both rounded ends showed and the crease between them read as a ball. Fix: one modelled leg (hip, knee,
  ankle) and one arm (shoulder, elbow, hand), skinned when loaded to three bones: the upper, the lower and one
  turned half-way between them across a 4–5 cm band, so the bend keeps its volume. Both bones keep the limb's
  lateral side towards +X (a shortest-arc turn from +Y twists a near-vertical shin), and the right limb is the left
  one mirrored. Where: `b_rider_body.py` (`leg`, `arm`), `Rider.ts` `SkinnedLimb`.
- **The Origami print made round red discs on the sleeve caps (avatar review round 2).** The triangle lattice was
  laid flat across the part (x and z), which pinches to a point where a sleeve's round end faces along its axis.
  Fix: on the arm the print is unrolled round the arm (angle × 5 cm, height). Where: `Rider.ts` `printed` (`round`).
- **Lettering on the right-hand limb read backwards.** That limb is the left one mirrored, so a print mapped in the
  part's own space comes out mirror-written there. Fix: a side uniform (+1 left, −1 right) turns the reading
  direction, so the sleeves' and thighs' "PAS" read from outside on both sides; the lettering is drawn once into a
  canvas and stamped in the kit's ink. Where: `Rider.ts` `DECALS`, `printed`.
- **A shader that set `roughnessFactor` at `color_fragment` failed to compile.** MeshStandardMaterial declares it
  later, in `roughnessmap_fragment`. Fix: write it after that chunk. Where: `Rider.ts` `sockedShin`.
- **The terrain read and graded the wide photo average for every pixel.** Only the ground within 180 m of the camera
  blends it in. Fix: read it there only, with the gradients taken before the branch (`textureGrad`). Where:
  `terrainMaterial.ts`.

- **The terrain shader was most of the frame (74 % in the software-renderer probe at Berru km 23.85).** Every pixel paid
  for everything: seven tri-planar rock reads on the flat chalk plain, karst-only noise in Champagne, meadow, litter
  and scree work where their weights were 0, a second read of the land mask for water, and the wide photo average
  only steep faces use. Fix: branches on the weights (`wRock * near`, `canopy`, `steep`, meadow `push`, `photoRoad`,
  `uKarst`, `scree`); each flips where its weight has faded to nothing, so the frame doesn't change, and the water
  reads the land mask's red channel. Terrain -42 %, frame -31 % (`probe-perf2.cjs`, 960×540, detail 1.4), with the
  RPG fields added. Where: `terrainMaterial.ts`.
- **The terrain shader could discard on every route.** Only tunnels, underpasses and a photographed sea cut the
  ground, and a shader that can discard keeps the GPU from dropping hidden ground before shading it. Fix: a
  `TERRAIN_CUTS` define on those routes only. Where: `terrainMaterial.ts`.
- **Stubble grain shimmered as the road went by.** Its 0.37 m noise aliases once a pixel spans more ground, about
  15 m ahead of a chase camera at grazing angle. Fix: fade the grain to its mean by the pixel's footprint
  (`fwidth`), which also skips the noise there. Where: `terrainMaterial.ts` field season.
- **Long house shadows at Midday on the Champagne plain (review 2026-10-29, finding 15).** The time presets are
  Salzburg in mid-October, 35° at noon. Fix: `biome.sun`, the region's sun per time of day; over Reims on 26 August
  it stands at 51° at noon, rises in the east and sets west-north-west. Where: `biome.ts`, `Engine.setTime`.
- **Copses never stood on the plain's horizon (reviews 2026-10-29, hero 2).** Woods beyond the tree corridor were
  only the orthophoto's flat dark patches, invisible at a grazing angle. Fix: the bake's landmark pass takes woods out
  to 4 km and `FarWoods.ts` puts low canopy domes along their edges (one in ten inside), instanced. The first pass
  domed the whole 3,000 ha around the Berru loop: 25,000 domes, 2 M triangles, trees 2 % → 18 % of the probe frame.
  The edge alone makes the silhouette from the road: 20-triangle domes on it, about a tenth of that. Where:
  `FarWoods.ts`, `scripts/bake-osm.mjs` `LANDMARKS`.
- **The adaptive resolution had nothing left on a slow GPU.** At 1× it could not lower the cost further. Fix: at 1×
  and still slow, terrain detail steps down to two thirds of the preset's and back up with headroom at full
  resolution; below 15 fps (loading hitches, the software renderer of the captures) it leaves detail alone. Where:
  `Engine.adaptScale`.

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
- **The Nus de sa Corbata was a flat X-junction.** The DEM gives both passes of a self-crossing one height. Fix: a
  route `underpasses` entry; the loader finds the crossing in world space (a hand-measured s was 37 m off), drops
  the lower pass 7 m over the 160 m before it, builds a short underpass whose bore is the Blender bridge, and gives
  the ground under the bridge a flat floor (sloped terrain triangles stuck out of the arch as pale spikes before).
  Where: `route.ts` `findUnderpasses`, `Tunnel.ts`, `Terrain.flatten`.
- **No retaining walls although OSM has 168 on Sa Calobra.** They are hillside terrace walls (marges), a median
  120 m from the road; OSM rarely maps a road's own walls. And the old test read the ground at the wall line, which
  is flattened to the road, so every wall looked "at road level". Fix: classify walls by the ground 3 m further out,
  and face road cuts with masonry where the scene says so (`cutWalls` spans, cuts over 2.5 m), at the asphalt edge
  with a battered foot that hides the terrain's coarse teeth at the cut base. Where: `Roadside.ts` `cutWalls`.
- **A conifer hung in the air over the road in the knot's loop.** Trees stood on the flattened ground where the road
  cut had removed theirs (or on fresh fill), and the coarse terrain mesh showed the slope below them. Fix: no tree
  where the road works moved the ground more than 1.5 m (2.6 % of Sa Calobra's trees, under 1 % elsewhere).
  Where: `Vegetation.placeBaked` (`rawHeightAt`).
- **Großglockner ended in the middle of the Hochtor tunnel** and its turning circle sat on the ridge above:
  BRouter trims a climb at its highest sample, which was inside the tunnel. Fix: `bake-turnarounds` runs a route
  that stops inside a tunnel on to the far portal and ~70 m beyond (following the short OSM ways there), so the
  tunnel is found and ridden whole. Where: `scripts/bake-turnarounds.mjs` `throughTunnel`.
- **Kitzbüheler Horn ran 1.45 km past the end of the road** on a track, the Karstweg footpath and gravel. Check
  which OSM highways the last kilometres follow before trusting a climb's end. The first trim cut at the junction
  where the BRouter line left the paved road, 680 m and 70 m of climbing short of the Alpenhaus: the Panoramastraße
  went on. Follow the named road to its real end, not to where the GPX turned off. Fix: the paved ways on to the
  Alpenhaus are appended from OSM with DEM heights (10.13 km). Old ride times include the footpath.
- **Turnarounds stood on a plateau with a step where they met the road.** The smoothed profile ends metres below the
  raw DEM on a climb, the loop took raw DEM heights, only one end was pinned, and the square end of the asphalt left a
  wedge of ground showing where the loop leaves at an angle. Fix: the loop follows the DEM's shape measured from the
  end point, pinned at both ends; the route's ribbon runs one sample under the loop, which draws with more depth
  bias. Where: `route.ts` `samplePath`, `Road.ts`.
- **Houses stood on the road in old towns** (St. Wolfgang, Kitzbühel): OSM footprints reach the street edge and
  our ribbon is wider than the real street. Fix: a building whose footprint comes within the asphalt is left out.
  Where: `Buildings.ts` `reachesRoad`.
- **A wall crossed the road at the Hochtor.** Alpine OSM walls and fences were drawn without a road check. Fix: no
  barrier piece on the carriageway, and retaining walls at the road edge are left to Roadside. Where: `Props.fences`.
- **Mont Ventoux's white top was a meadow of grass tufts.** OSM scree and bare rock were parsed (class `rock`) but
  never drawn into the land mask, and OSM maps little scree along the Ventoux road anyway. Fix: rock goes into the
  canopy mask's blue channel (terrain: stone, no meadow push; ground cover: bare but for the odd boulder), and a
  scene's `biomeTweaks.bareAbove` does the same above a height (Ventoux 1450 m, above Chalet Reynard). Where:
  `Engine.buildWaterMask`, `terrainMaterial.ts`, `GroundCover.ts`.
- **Editing `src/` during a shot batch broke a capture** (fps 0, no tiles) and mixed two versions in one set.
  Re-shoot the whole set after the last edit.

- **A meadow shed stood as a white two-storey house with a flower box** (Kitzbüheler Horn km 4.7, "invented
  landmark"). OSM had a 24 m² `building=yes`; untagged buildings default to 7 m. Fix: footprints under 40 m² without
  height tags are one storey, and untagged unnamed ones are sheds (timber); `building=container` and
  `building=service` are low bare boxes (the Hochtor "chalet", a 9 m² Ventoux substation that stood as a 7 m tower).
  Where: `osm.ts`, `Buildings.ts`.
- **The "Alpenhaus" the reviewer saw (white chalets) were two farm buildings by the old route end;** the real one
  stood 680 m further up the road, out of shot. Fix: the route goes on to it (see Data and bakes). OSM maps a 713 m²
  footprint inside the 1448 m² one; the scene's `osmTags` set `building=no` on the nested one (now honoured) and dark
  timber walls and grey metal roofs on the rest. A Blender model was built first and dropped: the ground falls 10 m
  across the footprint and a model sits at one height, while the OSM building drops its walls to the lowest corner
  like the real downhill façade. Where: `public/scenes/kitzbueheler-horn.json`.

- **Neighbouring houses had the same shutters, doors and windows (review 2026-10-29, finding 6).** The facade hash
  came from the base height, quantised: on the flat plain whole streets shared it, and the window grid was one
  world-aligned 3.1 m rhythm for every house. Fix: a building id in the surface attribute's upper bits (surface ids
  stay below 64), and a window grid per house (bays 2.7–3.5 m, windows 0.95–1.25 m, its own phase). Where:
  `Buildings.ts` `Builder.setBase`, facade shader.
- **Village streets read as empty sets (review 2026-10-29, findings 9 and 10).** No parked car, person, lamp, kerb or
  memorial. Fix: from sign to sign (`builtUpRuns`), kerbs and 1.5 m pavements broken where side roads and driveways
  leave the route (`Signs.junctionsAlong`), cars parked on the pavement and people behind it, instanced per village
  (`Life.buildVillages`); street lamps at the OSM `street_lamp` points and war memorials at `historic=memorial`
  (not graves or plaques), each merged into one mesh (`Props.lamps`, `Props.memorials`). Where: `Road.pavements`,
  `Life.ts`, `Props.ts`.
- **A pavement ended in a floating slab (qa2-23850).** Where the ground falls away beside the road the slab's back
  face (0.5 m) didn't reach it, and a stretch's end was open. Fix: the back face goes 1.2 m down, no pavement where
  the ground lies lower than that, and each stretch's ends are capped. Where: `Road.pavements`.
- **Steel halls on the village streets, one hiding the Époye church (qa2, finding 1).** Untagged footprints over
  380 m² became corrugated sheds anywhere; in the villages these are the farm courtyards' stone and brick barns.
  Fix: in a village's built-up stretch only footprints over 3,000 m² are halls (700 m² outside). Where:
  `Buildings.ts` `addBuilding` (`village`).
- **Every house the same height (qa2, finding 9).** One 2.9 m storey everywhere. Fix: in Champagne a storey step per
  house (2.72–3.14 m) rides above the building id in the surface attribute, so walls and window rows agree; a
  quarter of the houses get a hipped roof. Where: `Buildings.ts` `Builder.setBase`, facade shader.
- **Pavement ends stood as slabs and wedges on the verge (qa3 finding 12, qa4-10920).** The road flattening leaves the
  verge 0.4 m below the road surface, so every pavement stood above the ground beside it; a capped end read as a
  slab, a ramped one as a grey wedge. Fix: the terrain knows the plain's built-up stretches (`Terrain.setTowns`,
  set before anything is placed there) and brings the ground up to just under the pavement, easing in over 20 m
  at each end, rebuilding the tiles already loaded. At each end of a stretch the pavement ramps down to the ground
  and the kerb to the asphalt (sunk to the ground under the road's edge, the kerb dived away as a wedge). Side roads
  and driveways no longer break the pavement: the kerb drops to the asphalt across them. Cut there, each end's face
  stood over the dip the road leaves beside its edge (the terrain grid, 1.6 m, can't come up within the kerb's
  width), and short stretches between driveways stood as wedges (qa4-10920). The mountain villages keep their
  approved profile. Where: `Terrain.flatten`, `Road.pavements`, `Engine.loadWorld`.
- **A 4 m white pillar on a Berru pavement (qa3, finding 12).** Walls and lean-tos mapped as narrow buildings, and
  garden sheds, each took a storey and a hipped roof; untagged sheds took the 13 m guessed for a commercial block and
  towered over the houses. Fix (Champagne): under 4 m² nothing is drawn; under 14 m² or 2.6 m wide, 2.2–2.6 m high,
  the narrow ones flat; untagged steel sheds 6–8 m. Where: `Buildings.ts` `footprint`, `addBuilding`.
- **Village churches were cathedrals.** The 14 m guessed for any church gave the Époye nave 12 m walls and a 45 m
  tower. Fix (Champagne): nave 7–8.5 m to the eaves, the tower twice that plus 3 m under its spire, with belfry
  openings (a blank shaft read as a chimney). Where: `addBuilding`.
- **The Époye church never in frame (reviews qa1 to qa3, the blocker).** It closes the street that turns at km 10.89,
  then stands beside and behind the rider; from km 10.88 a barn on the corner hides it. Fix: the hero frame at
  km 10.92, the church at the end of the street. Where: the brief's hero 3.
- **Mairies didn't read as mairies (qa3, finding 9).** Berru's is a point inside an untagged building. Fix: the
  building around an `amenity=townhall` point is the mairie (stone, slate); every mairie flies the tricolour and the
  European flag over its door, on the wall facing the road. Where: `osm.ts` `parseOsm`, `Buildings.ts`.
- **Clone houses with no doors (qa3, finding 5).** Fix: each house's render and tiles drift in hue, saturation and
  value; one bay in four has a front door on the ground floor, a quarter of the houses a farm's carriage gate; brick
  on 1.5 % of houses and 15 % of barns, weathered brown-red (saturated brick read as new blocks). Doors, gates and
  weathering are the masonry style's only (`uMasonry`): the other regions keep their approved faces. Where:
  `addBuilding`, facade shader.
- **Beet under the trees at L'Ermitage (qa3, finding 14).** Off the RPG parcels the ground cover still guessed crops
  from the spring photo, under baked tree crowns too. The RPG covers nearly all farmland, so land outside it is
  gardens, waste ground or wood edges. Fix: with parcels loaded, land outside them grows grass; no crop grows under a
  crown; volunteers in stubble are a few short shoots. Where: `GroundCover.ts` (`parcels`).
- **Land off the parcels became a flowering meadow (qa4-4700, outside Lavannes).** Without a guessed crop it fell
  through to the meadow tufts, tall and dense. At a village's edge it is gardens, paddocks and waste ground, mown
  or grazed by late August. Fix: off the parcels the tufts are few and short. Where: `GroundCover.build` (`unfarmed`).
- **No zebra crossing in any village (qa2, qa3).** Fix: white bands 0.5 m wide, 2.5 m long and 0.5 m apart across the
  carriageway, a few metres before the side-road junction nearest the middle of each built-up stretch (and a
  quarter of the way in on stretches over 600 m), following the grade. Where: `Road.crossings`.
- **Verge tufts in rows (qa1 to qa3).** Tufts spread evenly over both verges read as planted rows. Fix: a mown strip
  along the asphalt, then a band of tall dry grass at the field edge whose width comes and goes along the road. Where:
  `GroundCover.build`.
- **Vines read as clipped hedges (qa3, finding 7).** Every segment of a vineyard cell had the same shade: the instance
  tint hashed the heading, which a cell's rows share. Fix: tint by position, height per segment, shoots above the
  trimmed top, a stake every 6 m standing above the leaves, a vine missing here and there. Where:
  `GroundCover.vineGeometry`, `postGeometry`, `vineRow`.

- **The bib shorts read as a bucket from behind, and the saddle's tail came out of the seat.** The torso ended in a
  flat cap, a dark disc from the chase camera, and the 27 cm saddle ran through the glutes. Fix: a domed seat, the
  glutes either side of a cleft, a 24 cm short-nosed saddle. Where: `b_rider_body.py` torso, `b_rider_bike.py`.
- **A helmet's raked vent slots came out as stairs.** Cut from the shell's 72 × 22 cells, a slot that crosses them
  diagonally is a staircase. Fix: only openings that follow the cells (the brow intake, the exhaust, the top port)
  are cut; the raked and flank slots are dark strips drawn onto the shell. Through the intake the liner let the
  forehead show; a dark floor 4 mm in closes it (8 mm in, it fell behind the forehead). Where: `b_rider_body.py`
  helmet.
- **The helmet read as a round dome, the old one with new decals (avatar review, finding 1).** An ellipsoid shell
  is as deep as it is long. Fix: lower (crown 1 cm over the scalp) and longer, the rear rows kept full up high
  (`sin(th) ** (1 - 0.4 * back)`) so the top runs level back past the ears, the tail cut square 9 cm behind the
  skull and the red V brought out to its cut face as a fin. Where: `b_rider_body.py` `shell_pt`.
- **The jersey's pocket band came out as stairs.** The torso's rows follow the jersey's hem, which drops at the
  back, so a band of faces chosen at one height crosses them on a slant; the pockets' 1 cm edges fell between ring
  vertices too. Fix: no band material, the elastic is a bump, and the pockets' edges fade over 2–4 cm. Where:
  `b_rider_body.py` torso.
- **Strips shrink-wrapped onto a curved part sank into it.** Points along the spline lie on chords under the
  surface, and the nearest-point wrap keeps each vertex on the side it came from, so the offset pushed half of them
  inside: the helmet's slots showed in pieces. Fix: `wrap_mode = 'ABOVE_SURFACE'`. Where: `borg.ribbon_on` (the
  jersey's zip and the bib straps use it too).

## Data and bakes

- **A loop through a village list turned into spurs and doubled roads (2026-10-30 loops).** A point at each
  village's place node sends BRouter into the centre and back out the same street wherever the centre is off the
  through road (Écueil, Beaumont-sur-Vesle: 1.5–3 km spurs), and a list in map order can return along the road it
  came out on (19 km doubled on a first Loivre–Bourgogne try). Fix: snap each village to the best-class road within
  300 m (class rank × 90 m + distance, as `scripts/villages.py` does), order villages so the loop enters and leaves
  each one by different roads, run the spur fixer (via point moved to the spur's base), and check doubled metres,
  U-turns and the villages passed within 450 m before baking. Where a forest has no road across (the Petite
  Montagne between Chamery and Courmas), split the list into two loops. Where: `scripts/bake-routes.mjs` presets.
- **A route drawn village to village had no fields.** Parcels are baked per preset id, so a drawn route in the
  Champagne fell back to the spring photo's guesses. Fix: when nothing is baked and the route starts in the
  Champagne box, the parcels come from the IGN WFS (CORS open), a box every 3 km of road, four requests at a
  time: about 1.4 s for a 29 km loop. Where: `src/geo/fields.ts` `fetchParcels`.
- **The rider's road names don't always match OSM.** "The D 23 between Ludes and Ville-en-Selve" is tagged D 33 in
  OSM; check refs against the extract and say which was used in the brief. Where: `docs/art/grands-crus.md`.
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
- **Formentor climbed 87 m into its tunnel and dropped 56 m out of it (±25 %).** In the cut leading to a portal the
  DEM is still the hillside above the road, and the tunnel straightening started at the portal. Fix: across every
  tunnel the profile takes its lower hull from 150 m before to 150 m after; `cuts` spans do the same where a cutting
  fakes a ramp (Sa Calobra's 21 % at 2.7 km, now 9 %). Not a global gradient cap: the Kitzbüheler Horn really has
  22 %. Find them with a scan for runs over 12 %. Where: `route.ts` `lowerHull`.
- **One OSM building was three storeys too tall.** OSM had no levels for the bar at the knot. Fix: per-route tag
  fixes in `scenes/<id>.json` `osmTags` (`{ "<element id>": { "building:levels": "1" } }`). Where: `Engine.loadWorld`.
- **Five routes still had their first OSM bake** (no meadows, barriers, power lines, benches, bus stops,
  crosses). Re-bake every preset after `bake-osm.mjs` learns a new feature; compare tag counts with Gaisberg's file.
- **The plain had none of its landmarks.** Water towers mapped as nodes were not in the bake query; an untyped
  `man_made=tower` with a height (the 71 m TDF tower on the Mont de Berru) was not an antenna; cadastre silos carry no
  height (7 m default); all of them stand outside the 420 m corridor. Fix: water towers, silos, chimneys, wind
  turbines and village names baked from 4 km (`FAR`), untyped towers of 25 m or more drawn as transmitters, silo
  heights by footprint (15, 28, 36 m), water towers and turbines in `Props.towers`. Where: `bake-osm.mjs`, `osm.ts`,
  `Props.ts`.
- **Loops planned through each village's centre point made detours.** BRouter rides into the centre and back out
  the same street. Plan from a point on the most important road inside the village's built-up area, drop the points
  the route crosses anyway, move a point that still causes an out-and-back onto the spur's base, then check for
  U-turns, doubled road and yard spurs; the D 944 near Loivre has no minor-road alternative, so say so in the brief.
  Tooling lives with the session's route scripts (not in the repo).

- **Fields mottled, blotched and dotted with green (review 2026-10-29, findings 4, 5 and 17).** The spring photo's
  tone chose each patch's late-August crop: a sparse crop with chalk showing through flipped between stubble and
  beet inside one parcel. Fix: the real parcels and crops of the RPG (IGN / ASP, Licence Ouverte), baked by
  `scripts/bake-fields.mjs`; each parcel takes one state from its crop and harvest date (`geo/fields.ts`
  `lateSummer`: winter barley mostly disced by then, spring barley still stubble, beet standing), drawn as its
  colour into the field texture, and the ground cover reads the same states. The photo guess remains for land no
  farmer declared. Where: `Engine.buildWaterMask`, `terrainMaterial.ts` `fieldColour`, `GroundCover.ts`.
- **Which year are the photo's fields?** The Marne BD ORTHO around Berru was flown 28 April to 9 May 2025 (IGN
  mosaic graph, WFS `ORTHOIMAGERY.ORTHOPHOTOS.GRAPHE-MOSAIQUAGE:graphe_bdortho`); RPG.LATEST is that 2025 campaign.
- **Memory held twice.** Each terrain tile kept its 512×512 ImageBitmap beside the GPU texture (1 MB each, 500 tiles
  in view at Beautiful), and the land, canopy and field masks kept their canvas beside the pixel copy the CPU reads
  (50 MB each on a 12 km loop). Fix: the bitmap closes once uploaded (`tex.onUpdate`, a tile is uploaded once), the
  masks are DataTextures sharing that copy. Unloading a world now disposes the textures its materials hold (village
  signs, models) and the props, traffic and landmarks it built. Where: `Terrain.loadTexture`,
  `Engine.buildWaterMask`, `Engine.unloadWorld`.
- **No vine was planted since the fields became RPG states (qa2, qa3 at km 21.1 and 22.85).** `vineRow` still
  compared `fieldAt` with the old OSM class code 3; the states put vines at 9 with the seed as a fraction, so every
  segment was skipped. Fix: compare the state. Beyond the 3D rows' 24 m, vineyards were flat green: the terrain now
  draws their rows, in the 3D rows' direction per 60 m cell, which the land mask's alpha carries. Where:
  `GroundCover.vineRow`, `vineDirection`, `Engine.buildWaterMask`, `terrainMaterial.ts`.

## Capture and review

- **A screenshot with pending tiles shows blurry or low-detail terrain** that looks like a bug. Re-shoot after
  `pending` reaches 0 (`engine.stats`).
- **HMR reloaded the page mid-flyover.** Don't edit `src/` while `flyover.mjs` or `shots-set.mjs` runs.
- **Large videos can't be sent to the phone (30 MB limit).** Re-encode at crf 28, 1280 px.
- **Shots were taken 70 m past their spot.** The simulator rode on (or rolled downhill) during the capture wait, so
  "9495" showed the loop behind the knot and "13500" the road after the tunnel; the reviewer then reported the arch
  and the tunnel missing. Fix: `shots-set.mjs` pauses the ride once loaded. Where: `scripts/shots-set.mjs`.
- **Check a reviewer blocker against the frame before fixing it.** Three of the first Mallorca blockers were the
  capture or the reviewer opening the wrong file, not the scene.
- **Shots changed when the Mac went on battery.** The app's battery saver drops to 30 fps and Balanced, so frames
  stop being comparable. Capture scripts now report a charging battery (`navigator.getBattery`). A zsh loop
  also ate `:c` in `"$1:chase"` (a path modifier): write `"${1}:chase"`.
- **The road vanished under green ground 50 m ahead on the open plain while `stats.pending` read 0.** A parent tile
  stays drawn until all four children have loaded; the children near the rider were in, but a sibling 10 km away was
  still loading, so a 25 km tile (never flattened along the road) covered the asphalt, and its shader painted the
  photo's road as verge grass. The counter only counted tiles within 3 km. Fix: the children of a near parent count
  as pending wherever they are, so the loading screen and the capture scripts wait for them. Where:
  `Terrain.visit`. In a slow sandbox the full load at high detail took 26 minutes (6,900 IGN tiles).
- **Playwright's page screenshot timed out (240 s) under SwiftShader.** It waits for a compositor frame. Read the
  WebGL canvas instead: `toDataURL` in a `requestAnimationFrame` registered after the engine's own, while the
  drawing buffer still holds the frame.
- **A capture never finished: 37 tiles stayed pending for 30 minutes.** Some IGN requests stalled with no answer,
  holding their tile and the detail of the parent's whole area. Fix: imagery requests give up after 20 s and try the
  next source. Where: `imagery.ts` `loadImageryTile`.
- **Editing a running bash script broke it.** Bash reads a script as it runs: the batch went on to a syntax error and
  left the dev server running. Write a new file instead. And kill vite itself, not the `npx` that started it.
- **Frames at km 21.5 and 25.9 stayed invalid (49 and 53 tiles pending).** The DEM download had no timeout: a
  stalled request held its tile loading for good, and with it the detail near the camera. Fix: a 20 s timeout and
  three tries per tile before it is given up. Where: `elevation.ts` `fetchDem`, `Terrain.load`.
- **A software-rendered capture took 15 minutes.** The terrain streams a batch of tiles per rendered frame, and a
  frame takes seconds in SwiftShader. Fix (headless capture script): hide the scene at a quarter of the resolution
  while the tiles load, show it all for the frame that is kept: 7 minutes, the same frame.

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
- **The saved devices didn't come back in the Mac app (2026-10-26).** Three causes. The Mac app looked for each
  saved device for 12 s once, when it opened, and a sleeping trainer or Zwift Ride was missed for good. The KICKR
  had been picked from the power-meter row too, so it was saved as trainer and power meter; on the next start the
  second reconnect turned the trainer link into a power meter (no resistance control; the 1.0.2 hub ends with the
  KICKR stuck on "reconnecting"). And the chooser tagged every device any rider had used, so the household's two
  KICKR CORE and two "Zwift Ride" entries all said "Last used". Fix: the app keeps looking for missing saved
  devices for 10 minutes (the rider opening the chooser stops a search under way first); one device has one role
  (a trainer stays the trainer, `src/devices/saved.ts`); the chooser tags only the active rider's devices; device
  events (connected, lost, back after n s, disconnected by the rider) go to `main.log`. The renderer's console isn't
  logged anywhere, so before this an in-ride drop left no trace in the app's own log. Where: `src/devices/index.ts`
  `search`, `register`, `electron/bluetooth.ts`, `electron/preload.ts`, `scripts/test-hub.ts` (fake devices).
- **A slight rise in the road needed far more watts.** At 100 % difficulty the physics is right, but a trainer
  flywheel carries far less momentum than 85 kg of rider and bike. Fix: gradient increases ease in (tau 4 s); new
  riders start at 50 %. Where: `session.ts`, `profiles.ts`.
- **An easy lead-in on a real 6–7 % road.** No flat road leads to the Gaisberg; Gnigl to Guggenthal climbs 150 m.
  Fix: in the lead-in the felt gradient (trainer, speed and pacers) is a third of the real one, at most 2 %, blending
  into the real one over the last 200 m; the climb segment gets its own id so old times stay honest. Ghosts and
  "your best" compare only rides with the same lead-in setting. Where: `session.ts` `feltGrade`, `segments.ts`.
- **Number fields jumped to 500 W, 150 kg or 20 kg.** Clamping on every keystroke. Fix: `NumberInput` applies
  in-range values live and clamps on blur. Where: `src/ui/home/shared.tsx`.
- **The HUD couldn't be read from the saddle.** The laptop stands about 2 m away; labels were 13–16 px and most
  numbers 38 px, and stats sat in mixed rows (heart rate next to kJ). 1 arcminute at 2 m is about 2.9 CSS px on a
  16" MacBook, so shrinking a screenshot by 2.9 shows what 20/20 vision resolves there (`scripts/hud-shots.mjs`).
  Fix: sizes in one unit that scales with screen height (`--u`, 1 px at 1117 px tall), values 62–172 and labels
  24 at that height, three groups (effort top left, climb top right, ride totals at the bottom) on translucent
  panels so labels hold against a bright sky; the big gradient sign gave way to a gradient figure with a colour
  underline, and VAM (30 s) joined the climb group. Where: `Hud.tsx`, `.hud` rules in `styles.css`, `session.ts`.
