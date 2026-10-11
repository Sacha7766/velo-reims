# Gaisberg visual QA sweep

Shots: /Users/chrisperkles/Documents/Git/serpentine/shots/gaisberg/qa-*.png (18 frames, sweep run 2026-10-11, all opened and checked).
Reference: /Users/chrisperkles/Documents/Git/serpentine/research/gaisberg/photos/ (road-gaisbergstrasse-hoehenstrasse-01, road-hairpin-curve-wanderweg-sign-01, summit-plateau-08, summit-parking-01, forest-hiking-path-gaisberg-01, summit-transmitter-winter-02).

Sweep log note: qa-3300-chase-noon reported 7 pending tiles and qa-9000-first-noon 4 pending at capture time. No holes were visible in those frames, but check tile loading before trusting a frame.

## Problems, most severe first

1. **BLOCKER - hard-edged square shadow on the summit meadow.** qa-9900-drone-noon (approx x 1100-1250, y 690-800, lower right), also qa-9850-drone-inversion at the same spot. A dark rectangle with straight diagonal edges sits on the grass. It does not follow any tree or object. Looks like a broken decal or a shadow-map artefact. Should be a soft tree shadow or nothing. No such feature in the photos (summit-plateau-08 is open grass with soft light only).

2. **BLOCKER - floating black post.** qa-2300-chase-noon, top-left, x approx 460-490, y 0-300. A flat near-black column with no bark texture, no cross-arm and no base; its bottom ends in mid-air above the hillside, about 30-40 px above the slope. Should be a brown-grey spruce trunk rooted in the ground, or a utility pole with a footing and cross-arm. Same near-black trunk style in qa-1300 (edge of frame), qa-3300-chase-noon (x approx 455-470, base on the right verge) and qa-4300-chase-noon (x approx 460, y 0-300).

3. **UGLY - grey shoulder smear on the right road edge.** Present in almost every chase frame: qa-300, 1300, 2300, 3300, 4300, 5300, 6300, 8300, 9300, plus 9800 and 9000. A wide, soft grey gradient band (about 60-150 px wide near the camera) runs along the right white edge line and fades to the horizon. It reads as motion blur or a stretched texture, not as a kerb. Left shoulder is clean in comparison. Should look like: thin concrete edge, then asphalt-to-grass verge with a crisp line (road-gaisbergstrasse-hoehenstrasse-01 has a clean white edge line and a narrow grass verge).

4. **UGLY - grass built from spiky card clumps.** Dense vertical blade clusters with hard cut-out edges and a lego-like repeat. Worst in qa-300 (both verges), qa-1300 (right), qa-4300 (both verges), qa-9300 (right), qa-9950 (lower left), qa-2600 (lower left). Should look like: mown or lightly grazed meadow with low, uniform cover and soft transitions (meadow-kuehberg-autumn-01, summit-plateau-08).

5. **UGLY - noisy speckle texture on verges.** Grainy dotted ground pattern on the right verge in qa-9300 (bottom right), qa-8300 (right verge), qa-2600 (bottom left, under the grey band) and qa-9950 (bottom left). Looks like a high-frequency noise texture rather than grass or gravel. Should be smooth grass with occasional bare ground.

6. **UGLY - parked cars and bus on the loop edge.** qa-9900-drone-noon: the far arc of the summit loop has a bus (approx x 450-550, y 265-290) and about five cars (approx x 350-570, y 270-340) straddling the outer edge line, plus a white van at the top left. Vehicles should sit in a car park clear of the carriageway (summit-parking-01: cars in a marked lot, asphalt separate from the drive lane). Same vehicles visible in qa-9850 only faintly.

7. **UGLY - summit meadow airbrushed.** qa-9900, qa-9950, qa-9850: large pale cloud-like splotches and a uniform green wash on the summit meadow, no grass grain or wear tracks. Should look like summit-plateau-08 (uneven grass, dry trails, low shrubs) and summit-plateau-meadow-buildings-01.

8. **UGLY - HUD data mismatch.** qa-9950-cinematic-noon: top-left reads "slope 100 %" while the warning sign shows "0%" and the road is flat at the summit. Either the HUD slope or the sign source is wrong. Also qa-9950 reads "0.0 km and 0 hm to the top" at altitude 1 274 m, which is plausible at the top but should be checked against the route end.

9. **UGLY - trees are cut-out cards.** Canopies with hard alpha edges and no internal shading: qa-6300-chase-noon (right), qa-9300-chase-noon (right, overhangs the verge), qa-9000-first-noon (left and right), qa-2600-side-noon (lollipop trees on the ridge), qa-3000-chase-inversion (left). Should look like dense beech and spruce mass with bark visible at the base (forest-hiking-path-gaisberg-01, forest-gaisberg-brandenbichl-view-01).

10. **MINOR - rock and slope streaks.** qa-8300-chase-noon (left hillside: dark diagonal brushed streaks, white rocks scattered as uniform dots), qa-5000-drone-noon (left slope, same white dot rocks), qa-9000-first-noon (right slope, streaked). Rocks should cluster in outcrops or scree, not repeat evenly.

11. **MINOR - buildings look like placeholder boxes.** qa-1300-chase-noon: brown-clad box building runs right up to the road on the left, cut off by the frame. qa-7300-chase-noon: tall white-and-wood tower at right with an oversized overhanging roof, plus repeated window grids on the left blocks. Should look like low Alpine hotel/farm buildings with pitched roofs (summit-plateau-meadow-buildings-01, inn-gersberg-alm-romantik-hotel-01).

12. **MINOR - debug hint in frame.** "H shows the HUD" appears bottom-right in most chase and drone frames. Fine for a game, but it contaminates screenshots meant for comparison. Hide it in capture mode.

13. **MINOR - inversion fog is flat.** qa-3000-chase-inversion: sky and distant treeline become a uniform pale grey wall, and the far road disappears into it with no depth cue. qa-9850-drone-inversion: sea-of-cloud reads well, but the cloud layer has no shadow or shading variation. Acceptable for mood; the chase version could use more haze gradient.

14. **MINOR - far-field cut-off.** qa-9800-chase-noon and qa-9000-first-noon show a sharp horizon where the terrain stops, with mountains only as blue-grey silhouettes. Acceptable at this distance, but a faint ridge line would help.

## Works well

- Summit transmitter (qa-9800-chase-noon): red-white lattice mast with correct proportions, matches summit-transmitter-winter-02 and the info board.
- Summit loop geometry (qa-9900, qa-9850): asphalt is continuous around the loop, lane markings are present, no gaps or overlaps seen. Bench props sit on the grass.
- Rider model and bike (qa-2600-side-noon, qa-9950): clean silhouette, plausible seating position, shadows land under the wheels.

## 3 best-looking shots

1. qa-9950-cinematic-noon.png (summit cinematic with HUD, clean road, rider scale right, benches and figures read correctly). Apart from the HUD slope mismatch.
2. qa-3000-chase-inversion.png (mood is coherent, road is clean, no floating props, grey band is less visible in fog).
3. qa-9800-chase-noon.png (transmitter, summit buildings and road all read as the real summit; only the grey shoulder band spoils it).
