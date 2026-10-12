# Art direction

**North star:** someone who rides the real road recognises every kilometre at riding speed, and the place feels
like being there on a good day.

## Principles

1. **Reality first.** Every visual choice traces back to a reference photo, a street-level frame or geodata
   (DEM, orthophoto, OSM, canopy height). When a fact is unknown, the brief says unknown. Don't invent landmarks.
2. **Judge at riding height.** Chase and first-person views at riding speed come first. Drone and flyover shots
   come second; they show layout problems but forgive a lot.
3. **Fewer, grounded, varied.** A few varied objects standing properly on the ground beat many repeated ones.
   Clones, grids and stamped patterns are what make a scene look generated.
4. **The road always reads.** The asphalt, its edges and the line ahead stay clear in every light. Nothing sits on
   the carriageway that the real road doesn't have.
5. **Real values.** Asphalt is mid-grey, not charcoal. Sunlit grass is yellow-green, not olive-black. Limestone is
   pale but not white. Snow only where there is snow. Shadows are darker versions of the ground colour, not black.
6. **Light tells the time.** Each time preset (morning, noon, golden, inversion, dusk) keeps sun height, sky
   colour, shadow length and haze consistent with each other.
7. **Region purity.** Species, buildings, barriers, signs, markings and animals belong to the biome
   (`src/engine/biome.ts`). Alpine things never appear on Mallorca and the other way round.
8. **Prettier at playable speed.** Target 60 fps at high quality on the M5 Max and never below 30 on the densest
   stretch. A change that looks better but halves the frame rate isn't finished.

## Briefs

One brief per route, written before visual work starts (`_template.md`):

| Route | Brief | Board |
|---|---|---|
| Gaisberg | [gaisberg.md](gaisberg.md) | `research/gaisberg/board.jpg` |
| Cap de Formentor | [formentor.md](formentor.md) | `research/formentor/board.jpg` |
| Sa Calobra | [sa-calobra.md](sa-calobra.md) | `research/sa-calobra/board.jpg` |
| Kitzbüheler Horn | [kitzbueheler-horn.md](kitzbueheler-horn.md) | `research/kitzbueheler-horn/board.jpg` |
| Großglockner | [grossglockner.md](grossglockner.md) | `research/grossglockner/board.jpg` |
| Alpe d'Huez | [alpe-dhuez.md](alpe-dhuez.md) | `research/alpe-dhuez/board.jpg` |
| Passo dello Stelvio | [stelvio.md](stelvio.md) | `research/stelvio/board.jpg` |
| Mont Ventoux | [ventoux.md](ventoux.md) | `research/ventoux/board.jpg` |
| Wolfgangsee | [wolfgangsee.md](wolfgangsee.md) | `research/wolfgangsee/board.jpg` |

The other presets have no brief yet: Wachau, Neusiedler See, Central Park, Sydney and the Vienna Ring. Their QA findings are in `research/qa-presets.md` (2026-10-11; the white ground at
Stelvio, the turnarounds, houses on the road and Ventoux's summit tower were fixed on 2026-10-12).

## Reference boards

A board is a contact sheet of the route's key references, checked by eye. Commons titles turned out to be
unreliable: "meadow-kuehberg-autumn-01" is a trail signpost. Boards contain third-party photos, so they stay local
(gitignored) and are rebuilt from the file list in each brief:

```
python3 -I scripts/sheet.py research/<route>/board.jpg <files from the brief> ...
```

Licences and source URLs are in `research/<route>/photos/manifest.json` and `research/<route>/streetlevel/manifest.json`.

## Standard shot set

The same frames are captured every review, so reviews can be compared over time. Run them with the dev server up
and nothing else touching `src/`:

```
# 15 / 50 / 90 % chase at noon, 60 % drone, the turnaround from the drone 30 m before the end, plus the brief's hero shots
node scripts/shots-set.mjs qa "<15%>:chase:noon" "<50%>:chase:noon" "<90%>:chase:noon" "<60%>:drone:noon" "<end-30>:drone:noon" --route=<route>
# street-level matches, where references carry a heading (Formentor)
node scripts/match-shots.mjs <route> research/<route>/streetlevel/manifest.json
```

The capture log prints `engine.stats` per frame. A frame with pending tiles gets re-shot, not reviewed.
