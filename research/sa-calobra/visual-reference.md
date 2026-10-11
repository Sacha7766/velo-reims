# Sa Calobra road (Ma-2141) visual reference for the 3D cycling scene

Scope: Port de Sa Calobra (route start, 13.5 m) up the Ma-2141 to the top of the route (about 674 m), 9.69 km by the route file. The OSM dump and route km used below are from `public/routes/sa-calobra.json` and `research/sa-calobra/data/osm-full.json` (copied from the main repo, gitignored). Every fact carries a source. Anything no source gives is written **unknown**. Estimates are marked **est.**; a number taken from a photo's proportions is est., not measured.

Source key:
- [WIKI-EN] https://en.wikipedia.org/wiki/Sa_Calobra
- [WIKI-CA] https://ca.wikipedia.org/wiki/Sa_Calobra
- [MALL-COM] https://www.mallorca.com/en/guide/sights/nus-de-sa-corbata (Nus de sa Corbata guide, the most detailed source on the knot)
- [PJAMM] https://pjammcycling.com/climb/1155.Sa-Calobra (cycling climb page: 10.2 km, hairpins, traffic)
- [CLICK] https://www.click-mallorca.com/blog/actividades/paisaje/carretera-la-calobra (Spanish road guide: 13 km, junction km 3.3, tunnels)
- [ROUGH] https://www.rouleur.cc/blogs/rouleur-explore/the-best-cycling-climbs-in-mallorca (search summary, not fetched in full)
- [CUK] https://www.cyclinguk.org/route/weekender-sa-calobra (search summary only; hairpin count quoted by the search tool, not fetched)
- [ROIG] https://roig.com/en/?p=8674 (search summary only: viewpoint, car park, restaurants)
- [GANC] https://en.gancarczyk.com/?p=395 (search summary only: a rider's account of width)
- [CM-CAT] https://commons.wikimedia.org/wiki/Category:Sa_Calobra and https://commons.wikimedia.org/wiki/Category:Nus_de_sa_Corbata
- Photos (checked by eye, licences in `photos/credits.txt`): [P-01] `nudo-corbata-malopez-01.jpg`, Malopez 21, CC BY-SA 4.0; [P-02] `nus-sa-corbata-01.jpg`, Olaf Tausch 2007, GFDL 1.2 or CC BY-SA 3.0; [P-03] `carretera-calobra-msu-2018.jpg`, Matthias Süßen 2018, CC BY-SA 4.0
- [OSM] OpenStreetMap, the dump in `research/sa-calobra/data/osm-full.json`; positions are OSM, not surveyed.

---

## 0. Confidence summary

| Area | Status |
|---|---|
| Road opened 1933, engineer Antonio Parietti | Sourced: WIKI-EN, CLICK (CLICK says built 1928–1935, modifying a design by Gabriel Roca) |
| Road length | Conflicting: 9.4–10.2 km (climb pages), 12.7–13 km (general and Spanish pages). Route file: 9.69 km |
| Road width, lanes | Single lane by PJAMM; no measured width anywhere. Passing places exist (CLICK, PJAMM). Width **unknown** |
| Road surface colour | **unknown** in text; photos show mid-grey asphalt (P-01, P-03) |
| Edge and centre lines | White edge line, solid, on the lower road (P-02, P-03). Centre line not visible in the photos. Full marking pattern **unknown** |
| Hairpin count | Conflicting: 26 (ROUGH, CUK), 14 between km 6.1 and 9.6 (PJAMM), "several dozen" (CLICK). Use "many": **unknown** exact |
| Nus de sa Corbata: loop | 270° (WIKI-EN, MALL-COM, PJAMM). One source says 360° (search summary, not fetched) |
| Nus: opening size, deck length, parapet height | **unknown** (MALL-COM gives no figures) |
| Tunnel on the road | OSM tags a 28 m road tunnel at 2.62 km (see §3). No source names it. Length: est. 28 m (OSM geometry) |
| Vegetation species | Photos show low shrubs and grass only. Species list **unknown** for this road |
| Summit (Coll dels Reis, 682 m) | Sourced: WIKI-EN, PJAMM, OSM saddle node. Route file ends at 673.8 m, 0.5 km short (see §6) |
| Traffic | Coaches and cyclists sourced (PJAMM, CLICK, Komoot summary) |

---

## 1. Road

### 1.1 Length, start, top
- "a single winding road ... designed by Italian-Spanish engineer Antonio Parietti and opened in 1933, which features many hairpin bends and a 270° spiral bridge called the tie knot." [WIKI-EN]
- "The 'Coll del Reis' or 'Coll de Cal Reis' ... the pass on 682 metres (2,238 ft) altitude." [WIKI-EN]
- "Ride 10.2 kilometers gaining 648 meters at 6.3% average grade" ... "finishes at a pass, Coll dels Reis at 682 meters". [PJAMM]
- "Longitud aproximada: 13 km desde el desvío de la carretera de Lluc hasta el nivel del mar"; "desnivel unos 700 metros de bajada"; "pendiente media entorno al 7%". [CLICK] (this 13 km is measured from the Lluc turn-off, not from the port)
- "9.44 km with an average gradient of 7%, and a maximum of 11.8%" [ROUGH]. Maximum gradient: sources range 11% to 13.4% (search summaries, [CUK] and Biketips). Use **est. 11–13 %** for the steepest part.
- Route file: 9.69 km, gain 686 m, start 13.5 m, top 673.8 m.
- Construction: "built between 1928 and 1935 by the engineer Antonio Parietti Coll, modifying a project by Gabriel Roca". [CLICK]

### 1.2 Width, lanes, markings
- "single lane" [PJAMM]. "carretera de montaña estrecha", "sin arcén y con tráfico" (no hard shoulder, traffic). [CLICK]
- Width: **unknown**. One rider's account says the road "narrows to 2m width in some places" (search summary, [GANC], not verified). Use est. 4–5 m carriageway where it is two-way, and as narrow as est. 3 m where it has no passing place.
- Edge line: solid white edge line on the lower road, visible in P-02 (right edge) and P-03 (right edge of the upper carriageway, nearest the wall). Visible on the wide outer curve in P-02.
- Centre line: **unknown**. None is visible in P-01, P-02 or P-03 at the knot.
- Surface: "super smooth" [PJAMM, reviewer]. Colour: mid-grey asphalt, lighter in P-03 (sunlit).

### 1.3 Parapets, walls, guardrails, kerbs
- The knot's upper carriageway is held up by a masonry arch and rubble stone walls with dressed stone coping ("parapets capped with dressed stones border the carriageway"). [MALL-COM]
- "walls made from local limestone support large sections of the route." [MALL-COM]; "margers" (dry-stone builders) built the retaining walls. [MALL-COM]
- Stone retaining walls are the dominant barrier along km 4–6 (OSM: 77 retaining_wall segments in the route band overall, 36 of them in the 5 km bin; see §5). [OSM]
- Metal guardrail: galvanised W-beam-type rail on the outer edge of the lower road in P-01 (left side, grey). Painted white metal rail along the outer edge of the upper loop in P-02 and P-03. Exact profile **unknown**. Use est. 0.6–0.8 m high.
- Kerbs: **unknown**. Pale stone coping is the edge on the walled sections (P-01, P-03).
- No concrete barrier is visible in any photo.

### 1.4 Hairpins and signs
- Hairpin count: **unknown** (see §0). PJAMM: "14 hairpins from kilometer 6.1 to 9.6". [PJAMM]
- Hairpin numbering or chevron boards: **unknown** from text. None are visible in the three knot photos; a red-white Leitpfosten style post is visible at the left edge of P-01 and at the lower road in P-02 (est.: km or delineator posts, not confirmed).
- Mirrors, km markers and road-sign specifics: **unknown** in the sources. OSM has bollards and gates near the port (see §5), not km posts.
- Speed limits on OSM: 40 km/h near the port (0.54 km), 90 km/h on the upper climb sections (0.80, 2.34, 8.23 km), 30 km/h on the knot ways (9.60, 9.65 km). [OSM] (OSM speed limits are not verified against the signs.)

### 1.5 Traffic information
- "tight spots" where vehicles pass within "2 or 3'" of cyclists, with a mountainside or a cliff on the other side. [PJAMM, reviewer]
- "buses take turns" to pass ("van por turnos") and "on the descent buses occupy much of the road". [CLICK]
- Buses go down in the morning and up in the afternoon; advice to ride before 09:00 or after 16:00. [ROIG, search summary; not verified]

---

## 2. Nus de sa Corbata (the knot), 9.46–9.66 km by the route file

### 2.1 What the structure is
- "a 270-degree loop on the Ma-2141 between Coll dels Reis and Sa Calobra." [MALL-COM]
- "the upper carriageway traces a broad arc, crosses a masonry bridge, and then passes beneath itself at a lower level." [MALL-COM]
- "a single-arch bridge carries the upper carriageway." Masonry with "wedge stones in the arch" that "combine to form a stable ring." [MALL-COM]
- "Its pale limestone masonry blends in color with the surrounding rock." [MALL-COM]
- Retaining walls: local limestone, built by dry-stone "margers". The coursed rubble on P-03 and P-01 is random limestone rubble, grey-cream. [MALL-COM, photos]
- "Blasting was used only to a limited extent." [MALL-COM]
- Loop reason: to avoid "an even tighter conventional hairpin bend". [MALL-COM]
- Name: "Nus de sa Corbata" (Catalan), "Nudo de la Corbata" (Spanish), "tie knot". [WIKI-CA, CM-CAT]

### 2.2 Numbers
| Item | Value | Source |
|---|---|---|
| Loop angle | 270° | WIKI-EN, MALL-COM, PJAMM |
| Opening (clear width and height under the arch) | **unknown**. est. 4–6 m wide, 3–4 m high from P-01 and P-03 (the arch is about the width of a car plus margin). Est. only, not measured | est. (photo) |
| Passage length under the arch | **unknown** | none |
| Upper-road parapet height | **unknown**. est. 0.9–1.1 m | est. (photo) |
| Retaining wall height on the outside | **unknown**. est. 4–8 m on P-03 | est. (photo) |
| Date | early 1930s; the road as a whole opened 1933 | MALL-COM, WIKI-EN |
| Road number | Ma-2141 | MALL-COM, CLICK |
| Route position | under-pass about 9.465 km, over-pass about 9.612 km (route file, as given in the brief; the route file's own interpolation gives 9.465 km at lon 2.81576, lat 39.83173, 20 m off the brief's lon 2.815888, lat 39.831963) | route data |
| Viewpoint and car park | timber-roofed kiosk / shelter, a car park on the spur of the loop, a small "P" sign with a WC pictogram (P-02) | P-02, OSM viewpoints at 9.525 km and 9.61 km |

### 2.3 Surroundings
- The knot sits in a bowl of pale grey karst rock with a rounded peak behind it (P-01, P-03). The rock is grey-white, bare, with scattered low shrubs and tussocks in cracks.
- A lower loop of the road sits below the knot on the left in P-03, with cyclists on it. A tighter lower loop also appears in P-02.
- Walls: the upper carriageway has a low coping wall on its outer edge along the curve; the viewpoint spur has a low stone wall with a cream dressed cap (P-02, P-03).
- OSM names: locality "Nus de sa Corbata" (node 1242612574, 39.83234, 2.81598), viewpoints (39.83213, 2.81630) and (39.83227, 2.81556), restaurant "Bar Coll dels reis" (39.83195, 2.81619). [OSM]

---

## 3. Tunnels and rock passages (lower part)

- OSM tags a road tunnel on Ma-2141 at 2.623 to 2.654 km (way 667742888, tunnel=yes, layer -1, 90 km/h, maxweight 18). The route file has a tunnel at 2626–2654 m. [OSM, route file]
- The tunnel is about 28 m long (route interval). Portal shape, lining and lights: **unknown**. OSM notes "lit: no". The road runs under a cliff band there (natural=cliff ways at 2.16–2.36 km and 2.64–2.79 km). [OSM]
- The other rock passages named in sources are on the **beach path**, not the road: "a path that crosses tunnels excavated in the rock" to the Torrent de Pareis beach. [WIKI-CA, CM-CAT "Torrent de Pareis tunnels", 19 files]
- Search summary [GANC]: the descent passes "a dramatic natural tunnel between two huge slabs of rock". Not verified; probably the cliff gap at 2.6 km or the knot descent.
- Click-Mallorca says there are tunnels on the road ("los túneles que llevan al Torrent de Pareis") but gives no length or lighting. [CLICK]

---

## 4. Geology and rock

- The mountains are "highly fragmented karst" between the upland and the sea. [MALL-COM, paraphrase of the Nus page]
- Rock colour: pale grey to cream limestone (P-01: pale grey-cream; P-03: cool grey-white). [MALL-COM "pale limestone masonry"; photos]
- Named formations: **unknown** in the sources read. The rounded peak above the knot in P-01 and P-03 is unnamed in OSM (natural=peak node 13641051489 is at 39.83448, 2.81486, 280 m from the knot; not checked against the photo).
- The Torrent de Pareis gorge (about 5 km from the knot, not on the road) is a limestone canyon. [WIKI-CA, roig summary]
- Cliffs by OSM along the road: 21 cliff ways within 100 m, the largest groups at 2.16–2.79 km, 5.1–5.6 km, 6.3–7.2 km and 9.0–9.5 km. [OSM]

---

## 5. Vegetation, by km

Sources give almost no species list for this road. Photos (P-01, P-02, P-03) show:
- Bare grey limestone with scattered low shrubs (dark green, rounded) in cracks and at the foot of walls. Species **unknown**.
- Tufts of tall dry grass (carritx-like) on the lower slopes and on the rubble bank under the knot (P-01, P-03). Species **unknown**; not confirmed as carritx.
- Few trees. No pine or oak forest is visible on the knot.

Use the photos as the baseline. Do not add tree species without a source.

---

## 6. Buildings, landmarks, named points (coordinates from OSM unless marked)

### 6.1 The port (0 km)
- Sa Calobra hamlet (place=hamlet, 39.85066, 2.79985, 24 m, population 16 in 2025). [OSM, WIKI-CA]
- Ferry terminal (39.85140, 2.80038). Ferries from Port de Sóller in season. [OSM, WIKI-CA]
- "antic hotel Sa Calobra", 4 floors (39.85020, 2.79956). [OSM]
- Restaurants: La Calobra (39.85028, 2.79966), Es Port (near 0.007 km), Café Rico (0.007 km), Mar Azul (0.011 km), Bar Playa (0.096 km). [OSM]
- Refugi Port de Sa Calobra, 1 storey (39.85106, 2.79944). [OSM]
- Torre d'Es Bosc, defensive tower (39.85080, 2.80216). [OSM]
- Car park "Aparcament Sa Calobra Torrent de Pareis", 200 spaces, Mo–Su 09:00–19:30 (39.84752, 2.79857; route 0.506 km). [OSM]

### 6.2 Torrent de Pareis
- Viewpoint (39.85226, 2.80572) and beach (39.85218, 2.80577). The beach is "surrounded by sea cliffs" and is reached by a hiking route through the gorge. [OSM, WIKI-CA]

### 6.3 Coll dels Reis (top)
- Saddle node 1123226364 (39.82754, 2.81799), 682 m. [OSM, WIKI-EN, PJAMM]
- Bar "Coll dels reis" (39.83195, 2.81619), restaurant with outdoor terrace, at the knot. [OSM]
- The name "Coll de Cal Reis" was an old mule track from Lluc to Sóller. [WIKI-CA]
- Car park, kiosk and signs at the top: see §2.2 (viewpoint car park at the knot). Confirmed in P-02 and P-03.

### 6.4 Viewpoints on the road (OSM tourism=viewpoint)
- 2.893 km (39.84529, 2.79959 per OSM node 4197873282; 10 m from the road).
- 9.525 km (node 699734514, 39.83213, 2.81630).
- 9.610 km (node 10277991731, 39.83227, 2.81556).
- Toilets 9.675 km (node 566292582). [OSM]

---

## 7. Life

- Cyclists: "hundreds of other cyclists" on a late-April Sunday. [PJAMM, reviewer]. Cyclist photos on the lower road at the knot (P-03, 2–3 riders). Advised times: before 09:00 or after 16:00. [ROIG, summary]
- Coaches: "buses take turns" on the single lane, and occupy "a good part of the road" on the descent. [CLICK]. Tour coaches park at the port. [WIKI-EN "popular destination for coach trips"]
- Cars: parked at the knot viewpoint (P-02, P-03: 3–5 cars in the car park). Tourists walk at the mirador (P-03).
- Motorbikes, goats, birds: **unknown** on this road in the sources. Griffon vultures "near the top" on the climb back up. [ROUGH, search summary]

---

## 8. Light and atmosphere

- Sea views: from the knot the sea is visible to the left (west) and right (east) in P-01 and P-03. P-01 has a strong horizon with a band of haze near the coast.
- Sea colour: deep blue (P-01, P-03). Open-sea blue, no turquoise shoal visible.
- Sky: clear, blue, a few cirrus (P-01, P-03). Haze near the horizon.
- Time of day: P-02 is a low-sun evening light, warm stone; P-03 is high sun, bright and white; P-01 is high sun with strong shadow under the knot.
- Season: P-03 (March 2018), P-01 (September 2017 on file page); late April per PJAMM. Sun angle and haze for the brief: use P-03 for high-sun reference.

---

## 9. OSM inventory within 100 m of the road (route km)

Counts by type (route band, 100 m): 77 retaining_wall, 11 wall (barrier=wall), 4 gate, 2 lift_gate, 1 bollard, 9 bridge=yes ways, 1 tunnel=yes road way, 21 natural=cliff, 15 hazard=curve nodes, 10 power poles, 7 parking, 6 streams (culvert) and 6 steps.

| km | Feature (OSM) | Notes |
|---|---|---|
| 0.00–0.14 | Port hamlet, restaurants, ferry, toilets, shower, refugi, bridge over footway (0.00) | Port start |
| 0.02–0.10 | Ma-2141 (unclassified, asphalt, sidewalk left) | port road |
| 0.27–0.54 | Parking, service roads, car park 0.51 km (fee) | |
| 0.54–0.57 | Ma-2141 tertiary, maxspeed 40 | |
| 0.80 | Ma-2141 tertiary maxspeed 90, no shoulder, no sidewalk | |
| 1.00–1.10 | Cas Bufó locality; hazard curve 1.07; culvert stream 1.08 | |
| 2.04–2.05 | Ma-2141 bridge (layer 1), maxweight 18 | |
| 2.16–2.36 | Cliffs 41–86 m off the road | |
| 2.62–2.65 | Tunnel (see §3) | |
| 2.81 | sa Bretxa (mountain pass node) | |
| 2.89–2.90 | Viewpoint and car park | |
| 3.12 | Ma-2141 bridge (layer 1) | |
| 4.14–4.78 | Walls (barrier=wall) at 4.14, 4.36, 4.70, 4.72, 4.78 | |
| 5.11–5.62 | Cliffs 6–43 m off road; 5.5 km wall | |
| 6.05 | Torrent d'Es Racó (intermittent stream) | |
| 6.15–6.94 | Hazard curve nodes at 6.15, 6.55, 6.63, 6.83, 6.94 | hairpin-like bends |
| 7.53 | Parking (surface) | |
| 8.05 | "sa volta llarga" (the long bend) parking | |
| 8.08–8.93 | Hazard curve nodes at 8.08, 8.63, 8.68, 8.82, 8.93 | bends |
| 9.04–9.46 | Cliffs 11–98 m off road; dry-stone wall (wall=dry_stone) at 9.06 km, 90 m off road | |
| 9.06 | Font de sa Mata (spring) | |
| 9.52 | Parking (surface, fee=no) | |
| 9.52 | Viewpoint 9.525 km (17 m) | |
| 9.54 | Nus de sa Corbata locality (16 m) | |
| 9.57 | Hazard curve (0 m) | |
| 9.60 | Tertiary Ma-2141 maxspeed 30 | |
| 9.61 | Viewpoint 9.61 km | |
| 9.65 | Ma-2141 bridge (layer 2, maxspeed 30) | over-pass |
| 9.65 | Bar "Coll dels reis", restaurant | |
| 9.68 | Toilets | |

---

## 10. Look-target recap for the art brief

- The road is single-lane asphalt, mid-grey, no hard shoulder for most of the climb, with stone walls and metal rail on the drop side.
- The knot: pale limestone masonry, a single-arch bridge under the upper carriageway, stone parapets with dressed caps, a viewpoint car park on the loop, a timber shelter (P-02).
- No sources give the knot's measurements. Build to the photos, label dimensions as est.

---

## 11. Open issues found while researching

1. **Route ends short of the pass.** The route file ends at 9.69 km at the knot's turnaround (39.83175, 2.81630, 673.8 m). OSM continues the Ma-2141 from there (way 1306219884, 30 nodes) for about 0.5 km to the saddle node 1123226364 (39.82754, 2.81799, 682 m). The climb pages finish at 682 m after the loop. Check whether the top should be extended. Do not treat the route end as the pass until checked.
2. **Knot position in Click-Mallorca** (km 3.3) is inconsistent with the route file (9.47–9.61 km). Trust the route file and OSM.
3. **Hairpin count** conflicts (14 vs 26 vs "several dozen"). Do not state a number in the game HUD or brief.
4. **Tunnel**: OSM has a road tunnel at 2.62 km; sources only mention tunnels on the beach path. Check on site or in street-level photos.
5. **Width**: no measured figure. A 2 m claim (GANC) is unverified.
6. **Photo credit** and licence for the photos are in `photos/credits.txt`. Olaf Tausch's files are CC BY-SA 3.0 or GFDL 1.2 (dual); the Malopez and Süßen files are CC BY-SA 4.0.
