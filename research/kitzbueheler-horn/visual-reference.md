# Kitzbueheler Horn road (Panoramastrasse) visual reference for the 3D cycling scene

Scope: `public/routes/kitzbueheler-horn.json`, from the Kitzbuehel valley start (745 m) up to the route end (1615 m). Route km = projection of each point onto the route polyline (script in scratchpad/kitz-research, not in WT). Anything no source gives is **unknown**; estimates are **est.**.

Route length: the file's `lengthKm` says 11.05, but the coordinates project to **10.87 km** (equirectangular) or 10.91 km (haversine). This document uses the projection. See open issue 1.

## Source key
- [ALP] https://www.alpenhaus.at/en/panorama-road (operator: toll road length, price, season, max gradient, lane width, cars allowed)
- [WIKI-EN] https://en.wikipedia.org/wiki/Kitzb%C3%BCheler_Horn (summit, Alpenhaus altitude, toll road, flower garden)
- [WIKI-TX] https://en.wikipedia.org/wiki/Kitzb%C3%BCheler_Horn_Transmitter (tower height, design, coordinates)
- [PJAMM] https://pjammcycling.com/climb/15.Kitzbuheler%20Horn (gradients, toll km, traffic, width, surface)
- [TOUR] https://www.tour-magazin.de/en/tours/austria/climbs-in-the-alps-kitzbueheler-horn-kitzbueheler-horn-steep-cult-climb/ (search summary)
- [CYCLO] https://cycloclimbing.com/alpsworthwhile/148kitzbuhelerhorn.html (search summary, cyclists free)
- [TIROL] https://www.tirol.at/aktivitaeten/sport/rad/bike-touren/kitzbueheler-horn (search summary, 18 hairpins)
- [ALM] https://www.almenrausch.at/touren/detail/kitzbueheler-horn-das-alpenblumen-panorama/ (search summary: garden, chapels, Alpenhaus 1664 m)
- [HORNBAHN] https://www.tirol.at/aktivitaeten/sport/wandern/bergbahnen/hornbahn-horngipfelbahn (search summary: cable cars)
- [KZ-HEALTH] https://www.kitzbuehel.com/touren/pdf/gesundheitszentrum-kitzbuehel (search summary, addresses only)
- [CM-CAT] https://commons.wikimedia.org/wiki/Category:Kitzb%C3%BCheler_Horn (Commons photo set; licences checked per file)
- [P-1] to [P-8]: photos in `photos/` (manifest.json). Each opened and described:
  - P-1 kitz-alpenhaus-dguendel-2014: Alpenhaus with cows, snow fence, pylons, snow cannon
  - P-2 kitz-antennenturm-dguendel-2014: red-white mast on a rocky ridge
  - P-3 kitz-horn-ab-alpenhaus-ironbernie-2006: summit tower, low summit building, pylons, hikers, flowers
  - P-4 kitz-panorama-vom-alpenhaus-dguendel-2014: snow peaks under storm cloud (no names in image)
  - P-5 kitz-sendemasten-gipfelhaus-ironbernie-2006: transmitter close-up, concrete base, hikers
  - P-6 kitz-alpenpflanzengarten-dguendel-2014: limestone outcrops, gates, spruce, valley village
  - P-7 kitz-kapelle-maria-heimsuchung-dguendel-2014: white chapel, hazy valley, hairpin road
  - P-8 kitz-blick-vom-alpenhaus-sueden-dguendel-2014: hairpin road from above, Alpenhaus edge, pylons
- [OSM] `bake/public/osm/kitzbueheler-horn.json` (4333 elements; 1150 within 100 m of the line). Centroids, not surveyed.
- [ROUTE] `public/routes/kitzbueheler-horn.json`

## 0. Confidence summary

| Area | Status |
|---|---|
| Toll road length | 7.5 km to Alpenhaus [ALP]; 7.4 km [WIKI-EN]; 10.1 km climb from the valley [PJAMM] |
| Toll gate position | Not in OSM. [PJAMM] "km 2.7" from its own start. Route km **est. 1.9-2.7** (best est. 2.0) |
| Toll price | 25 EUR per car, 15 EUR motorbike, 2026 season [ALP]. Cyclists free [PJAMM, CYCLO] |
| Max gradient | 22 % [ALP, TOUR]; 22.4 % [WIKI-EN]. [PJAMM]: steepest 500 m 17.8 %, steepest km 16.3 %, average 12.3 %. Route file: steepest 100 m about **20 % at km 8.54**, 500 m about 16.5 % |
| Width | **Conflict.** 6 m lane [ALP]; narrow two-lane road, no centre stripe, no shoulder for 7.8 km [PJAMM]. Est. 5-6 m |
| Surface | Paved, "excellent" [PJAMM]. Mid-grey asphalt in photos [P-8] |
| Guard rails, kerbs | **unknown** |
| Hairpins | 18 [TIROL, TOUR] (search summaries). [PJAMM]: marked, not counted |
| Underpass clearance | 4.20 m [ALP] (location unknown) |
| Season 2026 | Toll road 7 May to 2 Nov 2026 [ALP]. Cable cars 23 May to 11 Oct [ALM, HORNBAHN]. **Closed today (12 Oct 2026)** |
| Alpenhaus altitude | 1670 m [WIKI-EN, TIROL]; 1664 m [ALM]. Route file near km 9.4: about 1545-1590 m (open issue 2) |
| Summit | 1996 m [WIKI-EN]; Harschbichl 1604 m [WIKI-EN] |
| Transmitter | 102 m, reinforced concrete, "does not have a cylindrical shaft", in service 12 Dec 1969 [WIKI-TX]. Colour and form from [P-2, P-3, P-5] |
| Transmitter site | 1964 m [WIKI-TX] vs summit 1996 m [WIKI-EN] |
| Cars to summit | No. Road ends at the Alpenhaus [ALP]; summit by cable car [HORNBAHN, ALM] |
| Vegetation species | **unknown**. Photos show spruce forest and bare limestone |
| Paragliders | **unknown** |

## 1. Road

- **Start and toll gate**: the Alpenhaus is at route km 9.42. A 7.4-7.5 km toll road counted back from there puts the gate at route km est. 1.9-2.0. [PJAMM] "km 2.7" is from its own start, so est. 1.9-2.7.
- **Route end**: km **10.87**, 1615 m. [ALP] says the road ends at the Alpenhaus (km 9.42). The route runs about 1.45 km further, along Panoramastrasse ways and tracks (OSM), to a point near the Schneezentrale (9.94 km) and the Karstweg paths (10.7-10.9 km). What the route end is: **unknown**.
- **Gradient**: route file max 100 m window about 20 % at km 8.54 (the stretch before the transmitter, km 8.2-8.6). 22 % is the single steepest point in sources.
- **Width, surface**: see section 0. Paved; no metal rail on the road in any photo. Wooden snow fence along the pasture edge [P-1, P-8].
- **Cars and cyclists**: "In summer you can get directly to the Alpenhaus by car, bus, motorcycle or bicycle" [ALP]. Cyclists ride free [PJAMM, CYCLO]. Traffic "mild" [PJAMM].
- **Gain**: route file 923 m (745 to 1615 m); [PJAMM] 1219 m from the valley.

## 2. Buildings at the start (route km 0-2.4)

The first 2.4 km run through Kitzbuehel town, on a main through road, not in open country ([OSM] within 100 m):
- **km 0.00-0.15, Hornweg / Im Gries**: Gamshof hotel (0.025 km, 27 m), Hornweg bus stops (0.05, 0.10 km), Bank Austria (0.12 km), hotel building (0.14 km, 60 m), Gaensbach and Kitzbueheler Ache tunnels/culverts (0.10, 0.14 km), Villa Anna apartments (0.20 km, 43 m). Aerztehaus clinic 258 m from km 0.00; Altenwohnheim (social facility) 222 m from km 0.05.
- **km 0.5-0.8, Josef-Pirchl-Strasse, Bahnhofstrasse**: primary 2-3 lanes (0.54 km). KitzLife Apartments (0.60 km, 23 m), Plodarhaus apartments (0.71 km), Pocherkapelle (0.71 km, 9 m), Sparkasse (0.73 km, 86 m), Radsport Stanger shop (0.57 km, 12 m). Train station Bahnhof Kitzbuehel (0.72 km, 204 m, platforms and bus stops).
- **km 0.8-2.1, St. Johanner Strasse (primary, 2-4 lanes)**: the route runs beside it for about 1.3 km. Lebenberg road tunnel (0.81 km, 90 m). MPREIS supermarket (0.93 km, 34 m). Busgarage stops (1.05 km). Hofer (1.16 km, 85 m). BP fuel station (1.31 km, 21 m). Two car washes (1.32-1.34 km). Polin building supplies (1.33 km, 95 m). Car dealers (Schmidt, Auto Hein). OEAMTC vehicle inspection (1.77 km, 20 m). Kompetenz Zentrum (1.51 km, 37 m, 3 levels).
- **km 2.1-2.4**: Felseneck bus stop and shelter (2.15 km). Walsenbachweg tunnel (2.24 km). Landhotel Vordergrub (2.40 km, 24 m).
- **Hospital**: none (amenity=hospital) in the OSM dump. Hornweg 28 is now a health centre with practices and no inpatient ward; Rehaklinik at Hornweg 32 [KZ-HEALTH]. Their route km est. 0.0-0.1. The acute Bezirkskrankenhaus: **unknown**.
- **Sports ground**: none within 100 m. **Apartment blocks**: KitzLife, Villa Anna, Plodarhaus only (2-3 storeys).

Summary: a small Alpine town on a main through road, with dealers, a petrol station, a supermarket and a rail station. Not open country.

## 3. Vegetation, farms and grazing, by route km

Species: **unknown** in all sources. OSM land use within 100 m; photos [P-1, P-6, P-7, P-8].

| Route km | OSM within 100 m | Notes |
|---|---|---|
| 0-2.4 | Buildings (150-230 per km), roads, street trees (17 at km 1), lamps, bus stops | Town. No forest |
| 2.4-3.0 | Buildings and service roads | Edge of town |
| 3.0-5.0 | Meadow (3-4 per km), one forest patch, tree row at 3.9 km | Mixed meadow and forest edge |
| 5.0-6.0 | Meadow, wood, forest, culverts (Warmbach, Grenzgraben) | Forest begins |
| 6.0-8.0 | Forest (8 features at km 7). Spruce on slopes [P-6, P-7] | Dense forest. Larch and beech **unknown** |
| 8.0-9.0 | Summit tower, Gipfelhaus, Hornkapelle, viewing platform at 8.49 km (800-1000 m off line) | Alpine pasture above the forest line |
| 9.0-10.0 | Alpenhaus (9.42 km), Hornkoepfl peak (9.49 km, 390 m off), Trattalmen (9.80 km, 31 m off, name only) | Open pasture with cows [P-1, P-8]; limestone outcrops [P-6] |
| 10.0-10.9 | Karstweg paths, tracks, information boards, Schneezentrale (157 m off) | Open alpine pasture |

Farms: the Alpenhaus is a timber-clad building with grey metal roofs [P-1]. Tyrolean balconies, flower boxes or farmhouse style on the road: **unknown** (no photo or source at a known km).

## 4. Landmarks visible from the road

### 4.1 ORF transmitter (summit)
- 102 m reinforced concrete, flaring pale base with a white upper section, no cylindrical shaft [WIKI-TX]. Slim red-and-white banded mast, small antenna arrays, grey-white dish antennas on a tiered platform at the top [P-2, P-3, P-5]. Railing round the base [P-5]. In service since 12 Dec 1969 [WIKI-TX]. Not open to the public [WIKI-TX].
- Coordinates 47.47595 N, 12.42980 E [WIKI-TX]. Projected: **route km 8.49, 920 m off the line**. OSM "Sender Kitzbueheler Horn" (node 142759507) at the same km, 919 m off.
- Visibility from the road: **unknown** in sources. It is about 300 m above the route at km 8.5-9.5, so likely visible there. No photo is taken from the road at those km.

### 4.2 Alpenhaus Kitzbueheler Horn
- 1670 m [WIKI-EN]; 1664 m [ALM]. Route km **9.42** (OSM restaurant, 198 m off the line). Road end per [ALP].
- Timber-clad two-storey building, grey metal roofs, cows and a snow fence in front [P-1, P-8]. Finish of the King Stage of the Tour of Austria [WIKI-EN].
- Views from it: Kitzbueheler Alps and Hohe Tauern (Hollersbachtal) per the Commons description of [P-4]. Wilder Kaiser only as a caption on [WIKI-EN]; not confirmed.

### 4.3 Summit and chapels
- Gipfelhaus beside the transmitter, near the top station [ALM]; OSM node at 8.49 km, 912 m off. [P-3] shows a low white summit building beside the mast.
- Hornkapelle: OSM at 8.49 km, 817 m off. [P-7] "Kapelle Maria Heimsuchung" (Tyrolean cultural object 9967) is a chapel on a knoll above a valley. Same chapel as Hornkapelle: **unknown**.
- Alpenblumengarten at 1800 m [WIKI-EN]; more than 400 plants [ALM]; easy 2 km loop [ALM]. Above the route's upper end; km est. 9-10. [P-6] shows the limestone and wooden gates.

### 4.4 Valley views
- Village in the valley below: visible in [P-6] (top right) and [P-7] (centre). Names and distance **unknown**.
- Wilder Kaiser: **unknown** from the road. Grossvenediger: not named in any image; treat as unknown.

## 5. Life

- **Cows**: many on the upper slopes [PJAMM]; brown-and-white cattle by the Alpenhaus [P-1] and below the hairpins [P-8].
- **Cyclists**: free to ride [PJAMM, CYCLO]; the Alpenhaus page invites racing and mountain cyclists [ALP].
- **Hikers**: groups on the summit path [P-3, P-5]; walkers at the Alpenhaus [P-1]. A large dog at the transmitter [P-5].
- **Paragliders**: **unknown**.

## 6. Light
- Sun direction and time of day: **unknown** in sources.
- Photo references only: P-4 storm cloud with lit snow faces; P-1 and P-7 overcast to hazy; P-2 and P-5 clear blue sky. Not a sun position.

## 7. OSM inventory within 100 m (named or key-tagged, by route km)

| km | Feature | Off line (m) |
|---|---|---|
| 0.00-0.14 | Gamshof hotel; Hornweg bus stops; Bank Austria; hotel building; Gaensbach tunnel | 27-99 |
| 0.20-0.71 | Villa Anna; KitzLife Apartments; Plodarhaus; Pocherkapelle (church); Radsport Stanger | 9-43 |
| 0.72-0.81 | Bahnhof Kitzbuehel (train station, platforms); Lebenberg road tunnel (primary) | 9-204 |
| 0.93-1.77 | MPREIS; Busgarage stops; Hofer; BP; two car washes; Polin; Kompetenz Zentrum; OEAMTC | 5-95 |
| 2.15-2.40 | Felseneck stop and shelter; Walsenbachweg tunnel; Landhotel Vordergrub | 0-64 |
| 1.94 | Communications tower (OSM, not the ORF tower) | 62 |
| 2.87-3.23 | Power towers (four) | 8-93 |
| 5.00 onward | Panoramastrasse Kitzbueheler Horn (first named way at km 5.0) | 7-20 |
| 8.49 | ORF transmitter (node 142759507); Gipfelhaus (118900241); Hornkapelle; viewing platform | 817-919 |
| 9.05 | Panoramastrasse (named way) | 394 |
| 9.42 | Alpenhaus restaurant (way 142678288); Panoramastrasse (101 m) | 101-198 |
| 9.49 | Hornkoepfl (natural=peak, node 5250909228); Hornkoepflhuette | 390-469 |
| 9.80 | Trattalmen (building, name only) | 31 |
| 9.94 | Schneezentrale (building) | 157 |
| 10.45-10.87 | Karstweg paths and boardwalks; information boards; wayside shrine (10.62 km, 106 m) | 3-106 |

Not in the dump within 100 m: toll gate (barrier=toll_booth), lift stations, car parks (a parking building sits at 0.89 km, 354 m off).

## 8. Look-target recap
1. Transmitter: 102 m concrete tower, flared base, red-white mast. Route km 8.49, about 920 m off the line, on the skyline above km 8.5-9.5.
2. Alpenhaus: timber-clad building, grey roofs, cows, snow fence. Route km 9.42, about 200 m off.
3. Pasture above the forest line, from about km 8.5 to the end, with limestone outcrops.
4. Spruce forest on the slopes, km 6-8.5.
5. 18 hairpins on grey asphalt; steepest section km 8.2-8.6 (about 20 % over 100 m in the route file). Snow fence beside the road [P-8].
6. White chapel with dark metal roof and spire on a knoll above a valley [P-7]. Position unknown.
7. Hazy valley with a village [P-6, P-7].
8. Snow peaks to the south-east, behind the upper road [P-4]. Not named.

## 9. Open issues
1. **Route length**: `lengthKm` 11.05 vs projected 10.87 (10.91 haversine). Check where 11.05 comes from before using the end km.
2. **Alpenhaus altitude**: 1664-1670 m [ALM, WIKI-EN] vs route file 1545-1590 m near km 9.4. The route may sit lower than the building, or the elevation is sampled coarsely.
3. **Route end**: 1.45 km past the Alpenhaus, along tracks. Sources say the road ends at the Alpenhaus. Confirm the end.
4. **Toll gate**: not mapped; route km est. 1.9-2.7.
5. **Width**: 6 m [ALP] vs narrow single-lane stretches [PJAMM]. Passing places unknown.
6. **Guard rails, hairpin count**: unknown (18 is from search summaries only).
7. **Transmitter elevation**: 1964 m (base) vs 1996 m (summit). Use 1996 m for the summit.
8. **Views**: Wilder Kaiser and Grossvenediger not verified from the road. Do not paint them as named peaks.
9. **Vegetation species and farm style**: unknown.
10. **Season**: the toll road is closed today (12 Oct 2026). The summer scene matches the open season.
11. **Photos**: none taken on the road at a known km. P-8 is from the Alpenhaus looking down at the hairpins; P-7 from the chapel above the valley. Commons road-level cyclist photos: search errored (rate limit), not repeated.
12. **Acute hospital**: not located.
