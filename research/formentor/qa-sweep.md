# Formentor visual QA sweep (noon, chase + 2 drone shots)

Screenshots: /Users/chrisperkles/Documents/Git/serpentine/shots/formentor/qa-*.png (21 files, all viewed).
Reference: research/formentor/streetlevel/ (ks_* dashcam, cm_* Commons). Game shot at N m is compared with photos at routeKm (N+100)/1000.
Reference notes used: ks_03 (2.7 km) stone parapet wall on sea side, rock slope on other side; ks_16 (6.5 km) stone wall on left, rock cut on right, pines sparse; ks_40 (13.6 km) real rock-cut tunnel with yellow reflector boards and lamps; cm_29 / cm_09 sea-side rock and white houses.

## Problems (most severe first)

1. **Drone 6000 - smeared dark wall artifacts on the right cliff.** qa-6000-drone-noon.png, right third of frame: huge blurred black/grey streaks over the rock face, looks like stretched or smeared texture or a sampling artifact. Blocker for any drone/overview shot. Should be: rough limestone cut with normal shading (no smear).
2. **Tunnel at ~13.5 km - walls smeared and blotchy.** qa-13500-chase-noon.png: tunnel walls show motion-blur-like streaks across the whole vault, plus dark grey "world-map" blotches on the left wall, and the vault looks like blurred plastic. Blue barrier on the right is fine. Reference ks_40_1386668073_proc.jpg shows rough, textured rock with individual lamps and yellow reflector boards on both walls. Severity: ugly (very noticeable in the chase cam).
3. **Cliff/rock textures stretched into streaks.** qa-12500-chase-noon.png: the big orange-brown rock mass top-centre has a smeared edge and a black band under its overhang. qa-6500-chase: left cliff has repeated bright white diagonal streaks. qa-3500-chase: right cliff is a streaky blurred texture. qa-7500-chase: right cliff has pale repeated streaks. Severity: ugly. Should be: solid rock with fine grain, like the cut faces in ks_16 and ks_40.
4. **Snow-like white/pale-blue ground around trees and road edges.** qa-500-chase (left and right verge is pale blue-white with blotches), qa-8500, qa-10500, qa-11500, qa-15500 (pale grey-white verge with cartoon-like blobs). It reads as snow or salt rather than sand/dry scrub. Severity: ugly. Should be: beige-brown sand and dry grass, as in ks_16 and cm_09.
5. **Repeated white rounded blobs on sandy ground.** qa-9500-chase (right verge), qa-10500-chase (right verge, long white tiles), qa-11500-chase (ground full of pale stone pattern), qa-12500-chase (right verge, flat pale tiles). Looks like a stamped decal pattern repeated across the ground. Severity: minor-ugly.
6. **Building at ~500 m: flat cardboard blocks with stretched shutter bands.** qa-500-chase, right side: beige blocks with teal shutters that are stretched into long vertical stripes, no window depth or balcony detail. Severity: ugly. Could not match this to a reference photo (none near 0.6 km). Should be: a plain plastered Mallorcan apartment block with small shutters.
7. **Trees look like flat cutouts and clones.** Visible in qa-5500-chase (leaf canopies with hard, sharp-edged cutout shapes), qa-10500-chase and qa-9500-chase (pine crowns repeated at the same height and shape), qa-6000-drone (regular grid of identical pines). Severity: ugly. Reference ks_16 / ks_10 show sparse, irregular Aleppo-type pines with open crowns; the game forest is denser and more uniform.
8. **Missing stone parapet at 2.5-3.5 km.** qa-2500-chase and qa-3500-chase: sea side has no wall or barrier, while ks_03 (2.7 km) clearly shows a long stone parapet wall on the sea side. Severity: minor. The stone wall appears correctly at 5.5 km (qa-5500, qa-6500), so it is inconsistent along the route.
9. **Yellow building floats over flat green plane.** qa-12500-chase, right edge: yellow hotel with green shutters sits on a flat grey-green plane with no visible base or grading. Severity: minor. Should be: building grounded on a terrace or cut.
10. **Large single tree trunk in foreground.** qa-1500-chase, right edge: one very tall, thick pine trunk fills the right foreground and looks out of scale with the others. Severity: minor. Should be: trunks in the same size range as the others.

## Also noted (lower priority)
- qa-6000-drone: horses or cattle in the forest on the right are a nice touch but look like small stacked shapes at this distance. Minor.
- qa-17500-chase: flat olive-green patch on the right reads like a flat water plane. Minor.
- qa-19200-chase: guardrail and sea look good. Lighthouse in qa-18500-chase matches the real lighthouse photos near 19 km. No issues.
- Rider: no clipping, shadow is attached to the road in every chase shot.
- Road asphalt, lane markings, and sea colour are consistent across the sweep.
- HUD hint "H shows the HUD" is visible bottom-right in every chase shot. Minor, expected.
- Some WebGL warnings in the console (immutable texture, FLIP_Y on 3D textures) and a few ERR_NETWORK_CHANGED / "Failed to fetch" errors during the sweep. Not visible in screenshots.

## Three best-looking shots
1. qa-18500-chase-noon.png: guardrail, lighthouse on the headland, rock-cut hillside. Closest match to the real route.
2. qa-14500-chase-noon.png: clean curve, good colour, sensible vegetation density.
3. qa-19200-chase-noon.png: sea, guardrail and buildings on the left; colours and scale look right.
