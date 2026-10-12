# Großglockner Hochalpenstraße visual reference for the 3D cycling scene

Scope: Salzburg (north) side. Route file `public/routes/grossglockner.json` runs from Fusch an der Großglocknerstraße (km 0.00, 811 m) to inside the Hochtor tunnel (km 26.58, 2508 m). Route gain 1860 m (file). Route km = projection of each place onto the route polyline (`scratchpad/glock-research/project.py`), error about +-0.05 km. OSM positions are not surveyed.

Source key:
- [WIKI-DE] https://de.wikipedia.org/wiki/Großglockner_Hochalpenstraße (fetched: 47.8 km, toll stations, 12 % max, closure, construction)
- [WIKI-EN] https://en.wikipedia.org/wiki/Grossglockner_High_Alpine_Road (fetched: width history, plows, traffic, heights)
- [EDELW-DE] https://de.wikipedia.org/wiki/Edelweißspitze (fetched: 2572 m, spur, Dr.-Franz-Rehrl-Haus)
- [AF] https://austria-forum.org/af/AEIOU/Fuscher_T%C3%B6rl/Fuscher_T%C3%B6rl_english (fetched, 1995 translation: 2404 m, spur 1.6 km, 14 % max, no buses at the Törl)
- [CYC-PZ] https://passzwang.net/en/glockner_cycling.php (fetched: cycling distances, gradients, cyclist barrier, marmot)
- [CYC-CC] https://cycloclimbing.com/alpspass1700paved/11hochtor.html (fetched: 17 switchbacks to Hochtor, setts on spur, Törl 2428 m)
- [SRCH-TUN] search summaries of dangerousroads.org and motorradundreisen.de (not fetched): Hochtor tunnel 302 or 311 m, snow poles up to 12 m
- [SRCH-MEM] search summary of an Italian travel site (not fetched): memorial for workers killed in weather-related construction accidents
- [SRCH-ADAC] https://maps.adac.de/poi/grossglockner (search summary): marmots, observation post, Alpine Naturschau
- [SRCH-ST] salzburgerland.com magazine (search summary): road-building exhibition at the Fuscherlacke
- [OSM] OpenStreetMap dump `bake/public/osm/grossglockner.json` (snapshot 07:46, 1505 elements; copy in `scratchpad/glock-research/osm-snapshot.json`)
- [CM] Wikimedia Commons file pages listed in `photos/manifest.json` (licences read on each page; category list for Fuscher Törl)
- Photo IDs P-01 to P-09 = the nine files in `photos/`, in manifest order: P-01 fuscher-toerl-panorama-360, P-02 fuscher-toerl-memorial-saxa, P-03 fuscher-toerl-2026-04-pyramid-bridge, P-04 fuscher-toerl-2026-02-ridge-road, P-05 fuscher-toerl-2014-01-carpark, P-06 grossglockner-5717-cobbles-sign, P-07 hairpins-stone-walls-2016-04, P-08 hochalpenstrasse-2023-railing-snow, P-09 snow-slope-pyramid-2018-376. Contents checked by eye.

---

## 0. Confidence summary

| Area | Status |
|---|---|
| Route start | Fusch an der Großglocknerstraße, 811 m (route file; OSM). WIKI-DE gives start Bruck a.d. Glocknerstraße, 750 m. The valley part is not in the route |
| Route end | Inside the Hochtor tunnel, 2508 m, km 26.58. OSM tunnel way 312 m (47.0812 to 47.0840 N); route end about 160 m in from the north portal (km 26.43). Hochtor historic summit 2576 m, portal 2504 m [WIKI-DE] |
| Ferleiten toll | km 7.39, 1151 m [OSM toll_booth; WIKI-DE 1151 m]. Confirmed by [CYC-PZ]: toll to Fuscher Törl 13.23 km; route gives 13.23 km |
| Fuscher Törl | km 20.62, 2428 m [route; WIKI-DE; WIKI-EN]. Other sources: 2402 m [CYC-CC], 2404 m [AF] |
| Fuscher Lacke | km 22.56, 2261 m [OSM; WIKI-DE]. 2262 m [CYC-CC] |
| Edelweiß spur | Leaves near km 20.0 to 20.4 (OSM, 2375 to 2400 m). 1.6 km [AF, EDELW-DE] or 1.75 km [CYC-CC]. Cobbled setts [CYC-CC]. Summit 2572 m [EDELW-DE] |
| Hochtor tunnel | 312 m (OSM); 302 or 311 m (SRCH-TUN). Lit [CYC-CC] |
| Mittertörl tunnel | 116 m (OSM), km 23.86 to 23.97, 2324 to 2330 m. WIKI-DE: summit 2375 m, tunnel height 2335 m |
| Hairpins | 17 switchbacks Ferleiten to Hochtor, unnumbered [CYC-CC]. Whole road 36 [search summaries, unverified]. Numbered signs with altitude: unknown |
| Max gradient | 12 % [WIKI-DE]. Steepest part from just past the toll up to the Törl [CYC-CC]. Toll to Törl average 9.7 % [CYC-PZ] |
| Width | Carriageway 7.5 m after 1953; bends 15 m radius [WIKI-EN] |
| Snow poles | Wooden, up to 12 m, set up each autumn on the valley side [SRCH-TUN, unverified]. Not visible in any kept photo |
| Closure | Late October to early May [WIKI-DE]. The brief said early November; that conflicts |
| Light in October | No source; estimates in section 9 |

---

## 1. Road

### 1.1 Length and gradient
- Official: 47.8 km Bruck to Heiligenblut; north side 33 km, average 5.7 % [WIKI-DE]. The route covers the north side from Fusch: 26.58 km.
- [CYC-PZ] Fusch to Fuscher Törl 20.10 km (route 20.62); toll to Törl 13.23 km (route 13.23).
- Route ascent 1925 m (point sums) against 1860 m in the file. Route-point gradients over 100 m reach 15 to 18 % in places; these are sampling artefacts. Use 12 % max.

### 1.2 Surface, width, markings
- Dark asphalt, mid-grey in sun (P-03, P-07). Cobbled setts on the Edelweiß spur [CYC-CC] and on the pedestrian apron at the Törl (P-02, P-06).
- Solid white edge line on the lower road (P-07, P-03). No centre line is visible in any kept photo.
- Two lanes, two-way. Passing places: unknown.

### 1.3 Barriers, walls, kerbs
- Viaduct sections above the Törl: concrete piers, deck edge with light-grey metal railing (P-03, P-04, P-08). Height est. 0.8 m.
- Dry-stone retaining walls with flat coping on the outer side of the bends (P-01, P-07). Height est. 2 to 6 m where visible. OSM: 19 retaining-wall segments within 100 m, km 10.2 to 26.4.
- Wooden post-and-rail fencing at the Törl apron (P-02) and at the viewpoint edge (P-01).
- No concrete barrier in any kept photo.

### 1.4 Hairpins and signs
- 17 switchbacks Ferleiten to Hochtor [CYC-CC], unnumbered in that source. No kept photo shows a hairpin sign.
- Cyclist access at Ferleiten: barrier with video control, STOP signs and reflectors; it opens after a button press [CYC-PZ].

---

## 2. Named points (km from the route file, route elevation)

| km | Ele m | Point | Source |
|---|---|---|---|
| 0.00 | 811 | Route start, Fusch a.d. Großglocknerstraße (Ortsmitte, Römerhof, Hotel Post, tourist info within 0.3 km) | route; OSM |
| 3.05 | 870 | Embach chapel; Embach bus stop | OSM |
| 5.03 | 1050 | Avalanche protector (snow shed), 65 m | OSM |
| 6.95 | 1140 | Nationalpark pavilion | OSM |
| 7.29 | 1148 | Gasthof Lukashansl (81 m off) | OSM |
| 7.32 | 1149 | Ferleiten Wildpark bus stop | OSM |
| 7.39 | 1151 | **Mautstelle Ferleiten**, toll booth (1 m off) | OSM; WIKI-DE |
| 12.3 | 1633 | Piffkar (elevation match; no OSM name) | WIKI-DE; route |
| 14.74 | 1867 | Hochmais viewpoint; vegetation-zones and Rotmoos info boards | OSM; WIKI-DE (1850 m) |
| 18.65 | 2253 | Wilfried-Haslauer-Haus, Alpine Naturschau (78 m off) | OSM; [AF] |
| 20.02 | 2374 | Edelweißhütte (524 m off, outside the corridor) | OSM; EDELW-DE |
| 20.02 to 20.38 | 2375 to 2400 | Edelweißstraße spur ways | OSM |
| 20.57 | 2427 | Törlkopf peak (32 m off) | OSM |
| 20.62 | 2428 | **Fuscher Törl**: car park, memorial, viewpoint | route; OSM; WIKI-DE |
| 20.70 | 2427 | "Blick zum Fuscher Törl" viewpoint (12 m off) | OSM |
| 22.10 | 2291 | Römerhütte (53 m off) | OSM |
| 22.56 | 2261 | **Fuscher Lacke** (water, 57 m off) | OSM; WIKI-DE |
| 22.60 | 2261 | Straßenbaumuseum, road-building museum (11 m off) | OSM; SRCH-ST |
| 22.97 | 2288 | Tauernfenster viewpoint, Geologischer Lehrweg boards | OSM |
| 23.91 | 2327 | Mittertörl tunnel (116 m) | OSM |
| 26.43 | 2508 | Hochtor tunnel north portal (OSM) | OSM |
| 26.58 | 2508 | **Route end**, inside Hochtor tunnel; Hochtor viewpoint (54 m off); history boards (Saumhandel, Menschenhandel über das Hochtor, Glocknerroute) | OSM; route |

The route end is a pass tunnel, not a village. The route file stops before the Carinthian side.

---

## 3. Tunnels and snow sheds
- Avalanche protector: km 5.03, 65 m [OSM].
- Mittertörl tunnel: km 23.86 to 23.97, 116 m [OSM]. Lighting: unknown. The old path passes above it at about 2375 m [CYC-CC].
- Hochtor tunnel: km 26.43 to the route end at 26.58 (route ends inside), 312 m as a whole [OSM]. Lit; "watch out for ice" [CYC-CC]. Portals hand-cleared in spring [SRCH-TUN].
- Route file: `tunnels: 0`.

---

## 4. Landmarks

### 4.1 Fuscher Törl memorial
- Square-plan stone pyramid with a dark arched doorway, on a stone-paved apron beside the car park (P-02, P-01). Position km 20.6 (est.).
- Inscription over the arch: "SAXA TERRAE LOQUUNTUR GLORIAM TUAM" (P-02, read on the photo).
- Commemorates road builders who died in weather-related accidents [SRCH-MEM]. Commons lists the memorial under Clemens Holzmeister [CM]. Unverified.
- Two Austrian flags beside it (P-02, P-01). Viewed from the viaduct, the pyramid sits on the crest at the end of the road (P-03, P-04, P-09).

### 4.2 Fuscher Lacke
- Small lake at 2261 m, about 1.9 km past the Törl. The road drops about 150 m from the Törl to the lake [CYC-CC] and climbs again.
- Road-building museum on the shore (OSM; SRCH-ST).

### 4.3 Edelweißspitze spur
- Branches off below the Törl (Dr.-Franz-Rehrl-Haus), about km 20.0, 1.6 km long, dead end at 2572 m [EDELW-DE; AF]. Max 14 % [AF]. Setts [CYC-CC]. Not in the route file.

### 4.4 Hochtor
- Route end, 2508 m; tunnel portal 2504 m; historic summit 2576 m [WIKI-DE].

### 4.5 Buildings on or near the road
- Fusch: church, hotels, tourist office (km 0 to 0.3).
- Ferleiten toll guardhouse (7.39); Gasthof Lukashansl (7.29); Oberstattgutalm restaurant (7.99, 182 m off).
- Edelweißhütte (20.0), Römerhütte (22.1), F.A.T. Mankei (22.67).
- Wilfried-Haslauer-Haus with Alpine Naturschau (18.65).

---

## 5. Vegetation by km and altitude (OSM tags within 150 m; zones are estimates from tags)

| Zone | Route km | Altitude m | Note |
|---|---|---|---|
| Valley meadow and village | 0 to 3 | 811 to 870 | houses, gardens |
| Spruce and larch forest | 0 to 13 | 810 to 1750 | OSM landuse=forest; species not verified |
| Treeline | km 13.1 to 14.0 | 1720 to 1790 | highest forest polygon 1786 m at km 13.95. Treeline est. 1750 to 1800 m |
| Krummholz / dwarf shrub (est.) | km 13 to 18 | 1790 to 2080 | OSM natural=scrub, highest at 16.8 km (2081 m) |
| Alpine meadow | km 3.8 to 22 | 936 to 2428 | OSM grassland; highest at 20.6 km |
| Bare rock | km 16.4 to 26.4 | 2041 to 2508 | OSM bare_rock |
| Scree | km 22.7 to 26.6 | 2262 to 2508 | OSM scree |

Photos show grass and low shrubs above the treeline, flowers on the meadow (P-04, P-09). Species list: unknown.

---

## 6. Rock and snow
- Rock: grey and dark, schist-like cut at the Törl (P-06, P-08). Scree below the road (P-04, P-08). Törlwand cliff at km 20.5 (OSM).
- Snow: summer photos show large patches on north-facing slopes above about 2250 m (P-05, P-08, P-09). October status: unknown.
- Glaciers: Glocknergruppe glaciers visible from the road and the Törl (P-01, P-03, P-05, P-09). Pasterze is on the Carinthian side [WIKI-DE; CYC-PZ].
- Snow clearing: 5 Wallack plows and 12 GROHAG staff clear 600,000 to 800,000 m3 in about 14 days in April [WIKI-EN]. Record snow depth 21 m (1953) [WIKI-DE].

---

## 7. Life
- Marmots: sourced [SRCH-ADAC; CYC-PZ]. Roadside positions: unknown.
- Cyclists: allowed, with the Ferleiten barrier [CYC-PZ]. Early morning: "no cars on the road in the very early morning" [CYC-PZ].
- Motorcycles: 76,000 by 2003; 47,500 in 1955 (26 % of traffic) [WIKI-EN]. Motorbikes parked at the Törl (P-05).
- Cars: about 270,000 per year (2007) [WIKI-DE]. Cars and camper vans in the Törl car park (P-05). Coaches: sign or policy at the Törl forbids buses [AF, 1995]; coaches seen elsewhere in photos are unverified.
- Hikers on the apron (P-02, P-06).

---

## 8. OSM inventory within 100 m of the road (by route km)

Totals within 100 m: 243 buildings (most in Fusch, 0 to 3.1 km), 86 service roads, 48 forest polygons, 91 tracks, 90 paths, 19 retaining-wall segments, 14 guideposts, 52 information nodes or boards.

| km | Items (OSM; names where tagged) |
|---|---|
| 0.00 to 0.37 | Fusch village: Großglockner Hochalpenstraße, bus stops, tourist info, church, Hotel Post, Römerhof, Lampenhäusl |
| 1.31 to 3.08 | Bus stops Bärenwirt, Mauthaus, Embachkapelle; Bärenwerk power plant; guideposts |
| 5.03 | Avalanche protector (snow shed, 65 m) |
| 6.56 to 7.58 | Fuscher Ache culvert, Bärenwerk weir, Tagesspeicher Ferleiten (47 m), Nationalpark pavilion (75 m), Hubertuskapelle (100 m), Gasthof Lukashansl (81 m), Ferleiten Wildpark bus stop (38 m) |
| 7.39 | Mautstelle Ferleiten (toll booth, 1 m) |
| 7.74 to 8.21 | Oberstattgutalm restaurant (182 m off), culvert, retaining walls |
| 9.62 to 10.6 | Road bends; tree (9.87 km); streams |
| 14.74 to 14.75 | Hochmais viewpoint (29 m); vegetation-zones board (29 m); Rotmoos board (30 m) |
| 15.4 to 16.8 | Cliffs 70 to 84 m off; scrub; grassland |
| 18.65 | Wilfried-Haslauer-Haus, Alpine Naturschau (78 m) |
| 20.02 to 20.34 | Edelweißstraße ways (0 to 87 m off) |
| 20.52 to 20.82 | Törlwand cliff (16 m), Törlkopf peak (32 m), Fuscher Törl viewpoint (12 m), pedestrian area (8 m), retail building (13 m), steps |
| 21.92 to 22.10 | Halleitenbach culvert, Römerhütte (53 m) |
| 22.56 to 22.67 | Fuscher Lacke (water, 57 m), Straßenbaumuseum (11 m), F.A.T. Mankei (22 m), benches (15 m), information boards (19 m) |
| 22.97 to 23.06 | Tauernfenster viewpoint (36 m), Geologischer Lehrweg path, info map |
| 23.91 | Mittertörl tunnel (116 m), Großes Woazköpfl peak (72 m) |
| 24.52 to 24.58 | Retaining walls (4 m off) |
| 25.99 to 26.58 | Großer Margrötzenkopf (422 m off), Tauernkopf (199 m off), Hochtor viewpoint (54 m), history boards, Römerweg path and steps, Hochtor tunnel (312 m), retaining wall at 26.42 |

---

## 9. Light (October) and look-target recap
- Closure: late October to early May [WIKI-DE]. The scene fits early to mid October, while the road is open.
- Sun (est.): at 47.1 N in mid-October the noon altitude is about 35 degrees, due south. Sunrise and sunset about 07:30 to 08:00 and 18:30 to 19:00 CEST. Check with a sun calculator before use.
- Snow (est.): patches above about 2300 m; no October photo was found.
- Look targets: grey asphalt with white edge line; light-grey metal rail on viaducts; grey dry-stone walls on the outer bends; wooden post-and-rail at the Törl; square stone pyramid with a dark arch and inscription; small lake at 2261 m; setts on the spur; 116 m Mittertörl and 312 m Hochtor tunnels; forest to about 1750 m, scrub to 2080 m, grass and bare rock above.

---

## 10. Open issues
1. No source gives a Kehren number or sign design for the Salzburg side. 17 switchbacks to Hochtor [CYC-CC] is the only count.
2. Snow poles: height from a travel-site search summary (unverified). Colour and spacing unknown.
3. Start: route begins at Fusch (811 m); WIKI-DE uses Bruck (750 m). Including the valley part is a scene decision.
4. Route end: inside the Hochtor tunnel, about 160 m in. Tunnel length 302 to 312 m.
5. Törl elevation differs by source (2402 to 2428 m). The route file value 2428 m is used.
6. Closure: late October [WIKI-DE] vs early November in the brief.
7. Memorial history and the Holzmeister link come from search summaries and Commons category names; not verified.
8. P-05 and P-07 positions are not stated in their file pages; km estimates are from the scene only.
9. Route-file gradients are unreliable (section 1.1).
