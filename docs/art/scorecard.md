# Review scorecard

The `serpentine-reviewer` agent scores a shot set against this card, the route brief (`docs/art/<route>.md`) and
the route's reference board. The builder never scores its own work.

## Scale

| Score | Meaning |
|---|---|
| 1 | Broken: wrong, missing or glitching |
| 2 | Clearly fake at a glance |
| 3 | Acceptable game quality, nothing jumps out |
| 4 | Convincing at riding speed |
| 5 | Hard to tell from the reference photo |

## Categories

Score each one over the whole set. Each score names the shots it is based on.

1. **Ground and terrain.** Verges, meadows, scrub, rock faces, cuts and fills, how the ground meets the road.
   Problems include smears and streaks, speckle noise, photo shadows baked into the ground, and white "snow" that
   isn't snow.
2. **Vegetation.** The right species for the region and altitude. Density and spacing, crown shape, variety
   (no clones), trunks rooted in the ground, season colour, understorey.
3. **Road and roadside.** Asphalt value and texture, markings, shoulders, barriers (type, height, which side),
   posts, signs, kerbs, tunnel. Checked against the brief's road section.
4. **Built environment.** Buildings for the region (style, size, roof, colour), placed off the carriageway and
   standing on the ground. Landmarks and props from the brief.
5. **Light and atmosphere.** Sun height and colour for the time preset, sky, shadow softness and length, haze
   with distance, fog, water. Values sit in real ranges: no black greens and no blown-out whites.
6. **Life.** People, animals and vehicles: plausible places and numbers, standing on the ground, right scale.
7. **Rider and camera.** Rider grounded with a correct shadow, no clipping, scale against the road, readable
   view ahead.
8. **Sense of place.** Would someone who rides this road recognise this km? Judged against the board and the
   brief's hero moments.

## Blockers: any one rejects the set

- A floating or buried object (tree, trunk, building, prop, vehicle, rock).
- A hole, missing terrain, a black or white frame, or NaN blotches.
- An object on the carriageway that the real road doesn't have (a tree, building, parked car or wall), or a road
  that breaks or ends where it shouldn't, including the turnaround.
- Visible z-fighting or flicker across a large area.
- An object from the wrong region (Alpine guardrails on Mallorca, palms in Salzburg).
- A hero moment from the brief that reads as wrong (the summit mast missing, the lighthouse in the wrong place).

Some shots are invalid rather than failed. Name them and ask for a re-shoot:
- the shot ran with tiles still loading (`pending` > 0 in the capture log), or
- the shot shows debug UI other than the "H shows the HUD" hint, which is known and ignored.

## Pass

APPROVE when all of these hold:
- there are no blockers;
- every category scores at least 3;
- the mean is at least 3.5;
- every hero category the brief names scores at least 4;
- no category dropped against the previous review of the route.

Otherwise REJECT.

## Report format

```
# Review: <route>, <date>, <shot set>
Verdict: APPROVE | REJECT
Scores: ground 3 · vegetation 2 · road 4 · built 3 · light 4 · life 3 · rider 4 · place 3 (mean 3.25)
Previous review: <file or none>; changes: vegetation 2→2, road 3→4 ...

## Blockers
- <shot file> (x 410–520, y 80–300): <what is wrong> → <what the brief or reference shows instead>

## Findings, worst first
1. [ugly|minor] <shot file> (region): observed → expected (brief section or reference file)

## Invalid shots
- <file>: <reason>

## Don't touch
- <what already matches; keep it>
```

Findings describe what is seen and what it should look like. They never propose code.
