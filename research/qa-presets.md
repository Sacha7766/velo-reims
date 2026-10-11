# Visual QA: preset routes (2026-10-11)

Shots: `shots/<id>/qa-<metres>-<cam>-noon.png`. 5 per route: 15 %, 50 %, 90 % chase, 60 % drone, and end-30 (length − 30 m) drone.
Severity: **blocker** = route unreadable or broken; **ugly** = clearly visible defect; **minor** = small or only noticeable up close.
Note on end-30 shots: the turnaround is judged from the drone image only. The loop was not walked.

---

## sa-calobra (9.69 km)

Best shot: `shots/sa-calobra/qa-4845-chase-noon.png`

1. `qa-9660-drone-noon.png` (end-30). Turnaround is a flat, untextured grey disc with a hard-edged wedge in the middle. It sits on the terrain without blending. **ugly**
2. `qa-9660-drone-noon.png` (end-30). Orange-roofed box building with a flat facade sits on the road edge at bottom-left and looks pasted in. **ugly**
3. `qa-9660-drone-noon.png` (end-30). Capture logged `pending: 23`, so tiles were still streaming. The lower-left terrain is smeared and out of focus. Re-shoot once tiles settle. **minor**
4. `qa-5814-drone-noon.png` (60 %). Low-resolution, blurred ground patch on the lower-left. **minor**
5. `qa-8721-chase-noon.png` (50 %). Right-hand slope has vertical streaked and stretched texture. **ugly**
6. `qa-1453-chase-noon.png` (15 %). Pine crowns are flat leaf-card sprites that read as cardboard. **minor**
7. `qa-1453-chase-noon.png` (15 %). Right-hand rock slope has a speckled high-frequency noise pattern. **minor**

## kitzbueheler-horn (11.05 km)

Best shot: `shots/kitzbueheler-horn/qa-6630-drone-noon.png`

1. `qa-1658-chase-noon.png` (15 %). Long rows of large cream apartment blocks line both sides of the road with a hard edge at the verge. The area reads as a housing estate, not Tyrol. Scene has 1473 buildings. **ugly**
2. `qa-1658-chase-noon.png` (15 %). Large dark-red hall on the right runs right up to the road. **ugly**
3. `qa-9945-chase-noon.png` (50 %). Grass clumps render as tall vertical blade spikes, like billboard artifacts. **ugly**
4. `qa-11020-drone-noon.png` (end-30). The road seems to break at a green wedge near the turnaround, and the loop is separated from the main road by a gap. Verify on foot before fixing. The HUD is also visible in this shot, which is a capture-state issue. **ugly**
5. `qa-5525-chase-noon.png` (50 %). Dark blotchy shadow patches on the hillside, and the right-hand guardrail is out of focus in the foreground. **minor**

## grossglockner (26.58 km)

Best shot: `shots/grossglockner/qa-13290-chase-noon.png`

1. `qa-3987-chase-noon.png` (15 %). A huge conifer sprite on the right overhangs the carriageway and nearly closes the road. **ugly**
2. `qa-3987-chase-noon.png` (15 %). Left slope is a near-black blue blotch with no detail. **ugly**
3. `qa-23922-chase-noon.png` (90 %). Dark floating rocks are scattered mid-slope and not grounded. **minor**
4. `qa-23922-chase-noon.png` (90 %). Ridge texture shows stretched streaks. **minor**
5. `qa-15948-drone-noon.png` (60 %). Bottom-left white snow patch shows aliasing shimmer. **minor**
6. `qa-26550-drone-noon.png` (end-30). Turnaround is a keyhole-shaped flat grey loop on a bulging crest. It returns correctly, but the edges are hard and the terrain haze washes it out. **minor**

## alpe-dhuez (14.9 km)

Best shot: `shots/alpe-dhuez/qa-7450-chase-noon.png`

1. `qa-14870-drone-noon.png` (end-30). Turnaround loop has a flat grey half-disc plate inside it, hard-edged and floating over the terrain. **ugly**
2. `qa-8940-drone-noon.png` (60 %). Large box-shaped hotel with a red roof sits on the left shoulder of the road. It is a flat, untextured block. **ugly**
3. `qa-2235-chase-noon.png` (15 %) and `qa-7450-chase-noon.png` (50 %). Dense conifer forest covers the slopes. Alpe d'Huez upper slopes are mostly open pasture, so the vegetation is wrong for the region. **ugly**
4. `qa-13410-chase-noon.png` (90 %). Shrubs are vertical blade spikes, as in kitzbueheler-horn. **minor**
5. `qa-8940-drone-noon.png` (60 %). Smeared, blurry grass on the right. **minor**
6. `qa-2235`, `qa-7450`, `qa-13410`. Captured with 28, 40 and 56 tiles still pending. Terrain may be at low detail in these shots. Re-shoot once tiles settle. **minor**

## stelvio (25.32 km)

Best shot: `shots/stelvio/qa-12660-chase-noon.png`

1. `qa-25290-drone-noon.png` (end-30). The road ends in a wide, untextured dark grey slab with no lane markings. It floats over snow and cuts into the village buildings. Turnaround is unreadable. **blocker**
2. `qa-22788-chase-noon.png` (90 %). Left slope is a flat pure-white plane with no shading detail. **ugly**
3. `qa-3798-chase-noon.png` (15 %). Right-hand snow shows high-frequency speckle noise. **ugly**
4. `qa-15192-drone-noon.png` (60 %). Autumn-brown and orange foliage spheres float among the conifers. They look like placeholder blobs. **ugly**
5. `qa-15192-drone-noon.png` (60 %). Hotel block sits on the road shoulder and interpenetrates tree trunks. **ugly**
6. Console during this route shows 8 or more `404` resource errors per shot, plus WebGL warnings (`texImage3D FLIP_Y`, `glTexStorage2D immutable`). Missing assets could explain some of the artifacts above. Not traced to a URL. **minor**

## wolfgangsee (18.31 km)

Best shot: `shots/wolfgangsee/qa-16479-chase-noon.png`

1. `qa-18280-drone-noon.png` (end-30). The road disappears into a dense hotel cluster. Roofs intersect one another and the rider is not visible. The turnaround cannot be verified. **blocker**
2. `qa-18280-drone-noon.png` (end-30). Lake surface shows strong moiré and aliasing stripes. **ugly**
3. `qa-10986-drone-noon.png` (60 %). Tree canopies sit on both road shoulders and overhang the carriageway, which creates a tunnel effect. **ugly**
4. `qa-9155-chase-noon.png` (50 %) and `qa-16479-chase-noon.png` (90 %). Grass clumps render as blade spikes, as in kitzbueheler-horn. **minor**
5. `qa-2747-chase-noon.png` (15 %). Lake is a flat grey-white sheet with no reflection or depth. **minor**

---

## Best shot per route

- sa-calobra: `shots/sa-calobra/qa-4845-chase-noon.png`
- kitzbueheler-horn: `shots/kitzbueheler-horn/qa-6630-drone-noon.png`
- grossglockner: `shots/grossglockner/qa-13290-chase-noon.png`
- alpe-dhuez: `shots/alpe-dhuez/qa-7450-chase-noon.png`
- stelvio: `shots/stelvio/qa-12660-chase-noon.png`
- wolfgangsee: `shots/wolfgangsee/qa-16479-chase-noon.png`

## Cross-route patterns

- Grass and shrub clumps render as vertical blade spikes on several routes (kitzbueheler-horn, alpe-dhuez, wolfgangsee, grossglockner). This is a shared asset problem.
- Flat, untextured grey turnaround geometry appears on sa-calobra, alpe-dhuez, grossglockner and stelvio. It needs ground blending and texture.
- Several routes place large blocky buildings on the road shoulder (kitzbueheler-horn, alpe-dhuez, stelvio).
- Console 404s were logged during stelvio. Source not identified.
