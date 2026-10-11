# Formentor visual QA 1: dashcam vs render, 43 frames (1.96–14.43 km)

Method: every frame in shots/formentor/match/ks_XX_*_proc.jpg was viewed (LEFT = KartaView dashcam, RIGHT = Serpentine render, same position and heading). Dashcam bonnet, wipers, time-of-day, sun and motion blur ignored. Heights and widths are visual estimates from the frames (no measured survey), marked "~". Frame ids are given as XX (file ks_XX_*) with km.

## 1. Ranked systematic differences (most impactful first)

1. **Road-edge barriers are missing or wrong.** Real frames show a barrier on at least one edge in roughly 25 of 43 frames: pale limestone block parapets (~0.8–1.0 m, flat coping, sometimes with a W-beam rail on top) and galvanised W-beam guardrail (~0.7 m, posts every ~2–4 m). Render has them in about 6 frames, and there they are either a single light-grey band (08, 09, 27, 29, 34) or a ~1.5–2 m smooth beige wall (13). Frames: 01, 03, 04, 07, 08, 09, 12, 13, 14, 16, 17, 18, 19, 20, 21, 24, 30, 31, 37, 38, 39, 41, 42, 43. Fix: add a parapet segment (0.85 m high, 0.4 m thick, rough limestone albedo ~#c9bfa8, coping stone) on the sea or cut side wherever the real frame shows one; W-beam at 0.7 m on sea-side drops (see 38, 39, 41, 07); remove the smooth 1.5–2 m wall at 13 and cap at ~0.9 m.

2. **Roadside vegetation is a dense hedge of round bushes, not open pine/holm woodland.** Render: continuous lollipop shrubs ~3–5 m tall on both verges. Real: tall, thin-trunked Aleppo pines and holm oaks (trunks 6–12 m, canopy only in the top third, gaps between trunks) over a low understorey of 0.5–1.5 m shrubs and dry grass. Frames: 02, 10, 11, 22, 23, 25, 26, 27, 28, 29, 32, 33, 35, 42. Fix: drop understorey shrub density by ~60% on forest stretches, lower the crown base of pines to ~4–5 m, leave 3–6 m clear gaps, and let trunks show.

3. **Cut rock faces are too tall, too dark and the wrong texture.** Render (right-side cut, on most stretches): grey-brown noise/bark texture, ~10–20 m tall, often overhanging (15, 36). Real cuts: ~3–6 m high, warm ochre/orange limestone (~#b88a55 to #d9a66a) with horizontal strata and a 1–2 m rubble apron at the foot. Frames: 05, 06, 08, 09, 14, 15, 36, 38, 39, 41. Fix: cap cut height at ~6 m on the 3.2–4.4 km and 13.1–14.0 km stretches, add stratified bedding (horizontal lines, not bark-like vertical noise), warm the albedo, and add scree at the toe.

4. **Verge ground is a bright beige sand strip.** Render: 2–5 m wide pale sand band between the road and the forest. Real: dark grey-brown dirt and reddish-brown soil (~#6b5846) with scattered grey rubble, bare patches, and sparse grass; the forest verge is a few metres of dirt with no sand. Frames: 22, 23, 26, 31, 33, 35, 36, 41. Fix: change verge albedo to ~#7a6a58, mix in 25–40% pale rubble, narrow sand bands to ≤1 m or remove them.

5. **Hills are dark green with white snow-like patches; real hills are dry tan-olive scrub with pale limestone outcrops.** Render: patchy white tops and dark green slopes (10, 13, 25, 28, 34, 36, 42); the white reads as snow. Real: tan-olive scrub (~#8c8a5e), beige-grey outcrops (~#b8b3a0), golden grass on the lower slopes. Frames: 10, 11, 13, 25, 28, 34, 36, 37, 42. Fix: drop white crowns to beige-grey (#b8b3a0), shift mid-slope colour to olive-tan, add a few crag outcrops with sharp edges.

6. **Tussock grass and fan palms are wrong in scale and colour.** Real: dry golden tussocks (likely Ampelodesmos) ~0.8–1.5 m, tan-gold (~#b59a5a), in dense clumps on slopes and verges; dwarf fan palms (likely Chamaerops humilis) ~1–2 m in small groups. Render: lime-green spiky clumps ~2–3 m (02, 07, 27, 28, 33, 41, 43) and a few large stylised fan palms (31, 34, 42). Fix: scale grass clumps to 0.8–1.5 m, tint to tan-gold, increase palm density in groups of 3–6 at 1–2 m scale, reduce the lone big palms.

7. **Fences, signs and roadside props are almost absent.** Real: wire-mesh fences (~1.2–1.8 m) along verges (25, 26, 27, 28, 31, 32), warning triangles (33, 34, 35), round no-overtaking signs (38), km/delineator posts (30, 41), yellow reflectors on guardrail posts (24, 43), a direction sign (22). Render: essentially none except a red-white chevron (03, 08, 37). Fix: fence runs on forest stretches, sign and marker props at the listed km points.

8. **Tunnel (13.57 km, frame 40) reads as smeared texture.** Real: rough-cut limestone walls, ~5–6 m wide, arch ~4–5 m, bright ceiling lamps every ~8–10 m, yellow reflector plates on both walls, a bright portal at the far end. Render: radial motion-blur-like streaks on the walls, no reflectors, only a few dim lamps. Fix: give the walls a rough rock normal with no streak smear, add yellow chevron reflectors ~1 m height every ~10 m, space lamps at ~8–10 m and raise their intensity.

9. **Asphalt is darker and more cracked than real.** Render: dark blue-grey asphalt with heavy crack network visible at 1–2 m (most frames, and very dark in 40). Real: lighter grey, smoother, few cracks, dashed centreline and white edge line. Frames: 01, 05, 08, 13, 16, 25, 26. Fix: lighten albedo ~15%, reduce crack density and contrast, and keep the white edge line thinner.

10. **Tree crowns are lollipop-shaped and uniformly green.** Real Aleppo pines: umbrella crowns, pale grey-green, with leaning or forked trunks; holm oaks: dense, dark, wide. Render: round, saturated green heads on straight stalk trunks (18, 19, 20, 21, 22, 33). Fix: flatten pine crowns to umbrella shape, add a grey-green tint, vary crown tilt, and use darker, wider holm-oak masses.

11. **Lateral cliff geometry at 6.0–6.5 km and 12.3 km.** Real hillside at 12.36 km (36) is a grassy 40° slope with rock fragments; render is a smooth brown cliff. At 6.04 (15) real has a wire rockfall net on a mid-height bank, render has an overhanging white wall. Fix: lower the overhang, add wire net and rubble on the bank, and reduce the cut slope steepness to ~50–60°.

12. **Sea reads as a flat white-blue band close to the road.** Render: sea appears as a bright, nearly textureless band (02, 03, 04, 07, 12, 16). Real: deeper blue-grey sea with visible glare only at the horizon. Caveat: part of this is time-of-day and sun, which is out of scope. Fix: darken the sea albedo and reduce the specular spread; keep if the lighting pass changes this anyway.

## 2. Per-km notes (stretches that look especially wrong)

- **1.9–2.7 km (01–04):** real has a W-beam guardrail on the right (01) and a block parapet on the left (03, 04). Render has a tall wall on the right (03, 04) but no barrier in 01, and the verge is dense bushes. Fix guardrail/parapet placement first.
- **3.2–4.4 km (05–09):** real is a 3–6 m orange-ochre cut on the right with dry grass and a stone parapet or W-beam on the left. Render has a 10+ m grey noise cliff with a light band guardrail at the road edge. Biggest single mismatch in the first half; see items 1 and 3.
- **4.8–5.6 km (10–13):** real has a block parapet on the left (10, 12, 13) with pines overhead. Render has no left barrier (10, 12) and a 1.5–2 m smooth wall on the left at 13. Cliff on the right in 12 is a stone retaining wall in real, render has a steep bushy bank.
- **6.0–6.8 km (14–17):** real has parapets on one side, a wire rockfall net and a 4–6 m pale limestone face (15, 16, 17). Render has an overhanging 20 m+ white-brown cliff (15) and a very dark cut in 14. Shrub density is too high throughout.
- **7.2–8.0 km (18–21):** real has pale limestone with pines and a block parapet on the right (18, 19, 20), and a W-beam guardrail on the left at 21. Render is a bush hedge with a cartoon tree and no barrier.
- **8.4–10.8 km (22–31):** the forest section. Real is open holm/pine woodland with a dirt verge and wire fences; render is a dense hedge with sand verges and no fences. Trunks in render are too short for the canopy height. Largest group of mismatches by count (about 10 frames).
- **10.8–12.0 km (30–35):** real has dry-stone walls (30, 31), a km marker (30), dirt verges and warning signs (33–35). Render has none of these and a big fan palm in front (31, 34).
- **12.3–12.8 km (36–37):** real is a grassy rock bank on the right (36) and a stone parapet with W-beam (37). Render has a smooth pale hill and a dark brown cut without barrier.
- **13.2–13.6 km (38–40):** real has W-beam over sea on the left (38, 39), warning/no-overtaking signs, an orange cliff on the right, and then the tunnel (40). Render has no left barrier, a grey-brown cliff, and a tunnel with smeared walls.
- **14.0–14.4 km (41–43):** real has golden grass on the right bank (41), a W-beam with rubble fill on the right (42, 43), and dwarf palms. Render has a bare beige-grey hillside on the left (42) and no barrier on the right.

## 3. Things that already match well

- Road alignment and curvature: lane centreline dash and edge lines are placed in the right position on most frames, and the bends (e.g., 01, 05, 10, 22, 30) turn in the same direction.
- Heading and viewpoint: the camera height and horizon line sit close to the dashcam view in most frames (e.g., 02, 05, 22, 40).
- Cut-on-right, sea-on-left geometry: the cut or cliff side and the sea side match real on the coastal stretches (07, 13, 38, 41).
- Tunnel position: the tunnel at ~13.6 km is in the right place with a cyclist in the render (40) and the right general enclosure, even though its look is wrong (item 8).
- Vegetation palette: the pine/holm/palm species mix is broadly right (the render does have pines, holm-like oaks and fan palms), the problem is density and proportion, not species.
- Lane count and width: the two-lane carriageway width looks comparable to the real road in the forest stretches (22, 23, 33).
