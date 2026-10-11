# Gaisberg visual QA: renders vs real photos

Scope: 10 renders in shots/gaisberg/ (rs1-4235, rs1-8700, rs1-9990, lf1-9850, rd1-3000-side, fog1-300, fog1-3600, fog1-9850, b1-7420, tr2-3200) against 14 photos in research/gaisberg/photos/small/. Read-only review, no source edited.

## Ranked differences (most impactful first)

1. **Time of day and sky are wrong.** Renders: rs1-4235-chase, b1-7420-chase, tr2-3200-chase and rd1-3000-side are lit at dusk. The sky is a pale lavender-grey gradient, the sun is low, and shadows run long across the road (rs1-4235 bottom, b1-7420 bottom-left). Photos: road-gaisbergstrasse-hoehenstrasse-01 and summit-plateau-05/13 show a high midday sun, deep saturated cerulean sky with wispy cirrus, and short hard shadows under trees.
   Fix: raise sun elevation to roughly 50-60 degrees, shift the sky from lavender to saturated blue (about 25-30% more chroma) with a cirrus layer, and cut the warm dusk tint on the grass and road.

2. **Ground and grass are too dark and olive-black.** Renders: the hairpin infield in rs1-8700-drone and lf1-9850-drone is near-black green, and the verges in rs1-4235 and b1-7420 are dark. Photos: summit-plateau-08 and meadow-gersberg-pasture-01 show bright, sunlit mown grass (yellow-green, value about 40-50% on a grey scale), with only patches of dry straw.
   Fix: lift the grass base colour toward yellow-green and brighten the infield by about 30%. Keep the darkening only in shadow.

3. **Summit inn is a modern hotel block, not an Alpine chalet.** Render: b1-7420-chase shows a three-storey white-rendered block with a flat grid of blue-grey windows and a steep dark roof. Photo: summit-plateau-08 shows a timber-clad Almhütte with brown shingled gables, white parasols and red umbrellas, flower boxes, and a stone plinth.
   Fix: switch to timber cladding (warm grey-brown horizontal boards), a brown shingled roof with a lower pitch, a long balcony with white umbrellas and red parasols, and a stone base. Scale it down to a two-storey chalet.

4. **Spruce crowns read as stacked flat plates.** Renders: rs1-4235-chase (centre tall spruces) and tr2-3200-chase (both road walls) show crowns built from horizontal leaf tiers with hard, flat-faced edges. Photo: road-hairpin-curve-wanderweg-sign-01 and forest-hiking-path-gaisberg-01 show narrow spruces with continuous, drooping curtains of dark branches.
   Fix: make spruce crowns conical with branch clusters that droop at the tips. Remove the stacked tier look and add a darker inner core so the silhouette reads as dense needle foliage.

5. **Mountain silhouettes are the wrong shape.** Renders: rs1-8700-drone and lf1-9850-drone show pointed or cone-like peaks with smooth green flanks, and the fog1 views repeat them. Photos: view-gaisberg-wooded-peak-transmitter-2018 and view-gaisbergspitze-dec2024-01 show the Gaisberg as a broad, flat-topped forested dome with pale grey limestone terraces across the upper face. view-salzburg-from-gaisberg-25 shows jagged, pale blue-grey Alpine ridges in the distance.
   Fix: flatten the Gaisberg summit and add horizontal bands of pale grey rock on the upper third. Make far Alpine ridges jagged and lighter in value (aerial perspective) instead of soft rounded hills.

6. **Forest walls are too dense and too tall at the road edge.** Render: tr2-3200-chase has spruces on both sides, almost a tunnel, with no guardrail and no gaps. Photo: road-gaisbergstrasse-hoehenstrasse-01 shows a mixed beech and maple edge with light between trunks, a steel guardrail on the valley side, and an open understory.
   Fix: thin the road-edge tree density by about 40%, mix in broadleaf trees, add gaps where the road opens, and add a steel guardrail on the outer edge of exposed hairpins.

7. **Autumn colour is uniform lime-yellow, with lollipop crowns.** Render: lf1-9850-drone shows deciduous trees as round yellow-lime balls on thin trunks, all the same tone. Photos: meadow-kuehberg-autumn-01 shows red, orange and crimson leaves on vines and undergrowth, with brown dying leaves on the ground. road-hairpin-curve-wanderweg-sign-01 shows red-brown foliage in the tree on the left.
   Fix: add a palette mix (about 40% red-brown, 30% orange, 30% yellow-green). Make crowns irregular and oval, not round, and add dark brown litter on the forest floor.

8. **Rock scatter is stamped, not geological.** Renders: rd1-3000-side has evenly spaced tan-beige rock chunks on the slope, and rs1-4235 and rs1-8700 show grey-white boulder clusters at regular intervals. Photos: forest-hiking-path-gaisberg-01 shows pale grey limestone slabs in place, cracked and layered, with roots over them. road-gaisbergstrasse-hoehenstrasse-01 has very few rocks on the slope.
   Fix: change rock colour from beige to cool light grey. Cluster rocks where slabs outcrop, with fewer single scattered stones, and vary their size and angle.

9. **Road surface and shoulder have a blur smear.** Render: rs1-4235-chase and tr2-3200-chase show a smeared brown-grey band along the right edge of the road that looks like motion blur. The asphalt is very dark charcoal with heavy crack lines. Photo: road-hairpin-curve-wanderweg-sign-01 shows mid-grey asphalt with a clean light-grey gravel shoulder and a white edge line.
   Fix: remove or sharpen the shoulder blur band. Lift asphalt albedo by about 15-20% and reduce crack-line contrast. Use a clean light-grey shoulder strip.

10. **Summit meadow is flat, uniform green.** Render: the open meadow right of the hairpin in lf1-9850-drone and rs1-9990-cinematic is a single even green with few variations. Photos: summit-plateau-05 and meadow-kuehberg-autumn-03 show mown stripes, dry straw patches, and small wild-flowers; the meadow has visible undulation.
   Fix: add 2-3 tones of grass (mown stripes, dry straw patches) and gentle ground undulation. Scatter low shrub clumps sparsely, not in a uniform pattern.

11. **Transmitter mast is missing from the summit.** Render: no mast on the Gaisberg top in rs1-8700, lf1-9850 or fog1-9850. Photos: road-gaisbergstrasse-hoehenstrasse-01, meadow-kuehberg-autumn-03 and view-gaisberg-wooded-peak-transmitter-2018 all show a tall red-white lattice transmitter mast on the summit, a real landmark.
   Fix: add a red-and-white lattice mast (about 30-40 m) with a small concrete building at the summit. This is a strong recognisable cue.

12. **Fog trees are blown out into smeared, painterly shapes.** Render: fog1-3600-chase-inversion shows trees as washed-out grey smudges with rough edges and no crisp silhouette. fog1-300 also washes out tree tops. No fog photo is in the reference set, so this is judged against the crisp tree edges in the dry photos (summit-parking-01, forest-hiking-path-gaisberg-01).
   Fix: keep fog density, but reduce the whiteout on nearby trees (about 30% less alpha at under 100 m). Keep the tree edges crisp, and let the fog thin out with distance.

## Already convincing (leave alone)

- Road markings and edge posts: white edge lines, dashed centre line and black-and-white Leitpfosten match road-gaisbergstrasse-hoehenstrasse-01 and road-hairpin-curve-wanderweg-sign-01 (rs1-8700, rd1-3000-side).
- Red-and-white chevron hairpin markers on the outside of the bend (rs1-8700-drone, fog1-9850-drone) match the real Kurvenschilder.
- Hairpin geometry: the road width and bend radius in rs1-8700-drone and fog1-9850-drone read like road-hairpin-curve-wanderweg-sign-01.
- Cloud-sea inversion above the valley (fog1-9850-drone-inversion) has the right layering and reads as a real morning inversion.
- Salzburg basin farmland (rs1-8700 and lf1-9850, far right): the green patchwork fields, village clusters and tree lines fit view-salzburg-from-gaisberg-25.
- Valley farmhouses with red roofs and white walls (fog1-9850, b1-7420 far left) are in keeping with the rural villages in the photos.
