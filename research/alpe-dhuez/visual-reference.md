# Alpe d'Huez (D211, Le Bourg-d'Oisans to the resort) visual reference for the 3D cycling scene

Scope: `public/routes/alpe-dhuez.json`, from Le Bourg-d'Oisans (718 m, route km 0) to Avenue du Rif Nel at the top of the resort (1823 m, route km 14.7). Route km = projection of each point onto the route polyline (script in scratchpad/research-scripts/alpe, not in WT). Anything no source gives is **unknown**; estimates are **est.**.

Length: the file says 14.9 km; the coordinates project to **14.70 km**. Official climb: 13.7-13.8 km [WIKI-EN, OZ]. See open issue 1.

## Source key
- [WIKI-EN] https://en.wikipedia.org/wiki/Alpe_d%27Huez (13.8 km, avg 8.1 %, max 13 %, 21 bends numbered 21 at bottom to 1 at top, D211, finish on Avenue du Rif Nel, Notre-Dame church by Jean Marol)
- [PCUK] https://procyclinguk.com/the-21-hairpins-of-alpe-dhuez-every-bend-and-tour-de-france-winner-explained/ (sign names and years, Dutch Corner = bend 7; no altitudes, no width)
- [OZ] https://www.oz-en-oisans.com/summer/discover/our-must-haves/the-21-bends-of-alpe-dhuez/ (signs show each bend's altitude; avg 8 %, max 14 %; water point at bend 7 by Saint-Ferreol church in Huez)
- [BIKE-MAG] https://www.bike-magazin.de/en/tours/france/the-alps-mountain-passes-a-tour-de-france-pass-without-cars-the-legendary-21-hairpin-bends-of-alpe-d-huez/ (search summary: wide flat bends, steep concrete wall on one side, graffiti on walls, names painted on the tarmac)
- [SRCH-ARCH] https://www.alps2alps.com/?p=48534 and https://www.snowmagazine.com/ski-resort-guide/france/alpe-d-huez-ski-resort (search summaries: 1970s brutalist blocks beside timber chalets)
- [SRCH-CLOSE] https://www.cyclingnews.com/pro-cycling/racing/heavy-traffic-closes-main-road-to-alpe-dhuez-early-on-thursday-ahead-of-double-mountaintop-finishes-of-tour-de-france (search summary: RD211 closed to vehicles 23-26 July 2026, Tour only)
- [OSM] `public/osm/alpe-dhuez.json`, 3384 elements, 1030 within 100 m of the line (centroids, not surveyed)
- [COMMONS] https://commons.wikimedia.org/wiki/Category:Alpe_d%27Huez (27 files; licences checked per file via API; see photos/manifest.json)
- [P-1] to [P-7]: the seven kept photos, numbered in section 9.

## 0. Confidence summary

| Area | Status |
|---|---|
| Length | File 14.9 km; projection 14.70 km; official 13.7-13.8 km [WIKI-EN, OZ] |
| Average gradient | 8.1 % [WIKI-EN, OZ]. Route file: 1105 m over 14.7 km = 7.5 % (est.) |
| Max gradient | 13 % [WIKI-EN]; 14 % [OZ]; 15 % in one itinerary [SRCH]. Route file 100 m windows reach 25 % at km 5.35, most likely DEM noise. Use 13-14 % |
| Steepest zone | Lowest 2-3 km and bends 21-17 near La Garde [OZ, PCUK]. Route file: km 2-3 gains 105 m (10.5 %) |
| Hairpins | 21 signs [WIKI-EN, OZ, PCUK]; CyclingUp counts 22 on its southern approach [SRCH] |
| Hairpin names | One stage winner per sign, years [PCUK]. Table in section 2 |
| Hairpin positions | Bends 21-7 mapped from OSM guideposts (est.); bends 6-1 **unknown** |
| Dutch Corner | Bend 7 [PCUK, OZ]. Est. route km **8.9-9.1**, about 1390 m (OSM Virage de Saint-Ferreol 8.97 km, 11 m off line) |
| Dutch Corner church | **Conflict.** Sources name Notre-Dame-des-Neiges, Sainte-Anne or Saint-Ferreol. OSM: Saint-Ferreol church at 9.02 km (25 m off) matches the OZ bend-7 water point. Notre-Dame-des-Neiges is at 14.56 km, 396 m off the line, at the resort top. Best est.: Saint-Ferreol |
| Road width | **unknown**. "Wide" [BIKE-MAG]. No figure in any source |
| Barriers | **unknown** on the road. Steep concrete wall on one side in places [BIKE-MAG]; retaining walls mapped at km 9-10.7 |
| Markings | Painted stage-winner names on the tarmac [BIKE-MAG, P-1]; painted "Alpe * Huez" letters on a slope [P-1]; white centre dashes on a lower lane [P-1] |
| Surface | Paved, well surfaced [BIKE-MAG]. Cracks on final bends [SRCH] |
| Finish | Avenue du Rif Nel, top of the resort, above the Etendard roundabout [WIKI-EN caption, SRCH] |
| Route end | km 14.70, 1823 m, Avenue du Rif Nel / Rond-Point du Tour de France (OSM) |
| Altitudes | Resort area 1250-3330 m [WIKI-EN]; finish 1860 m [OZ]; Huez village est. 1400-1500 m (km 9.7-10.3); La Garde est. 1000 m (route file 976 m at km 4) |
| Season 2026 | Tour closure only, RD211 closed to vehicles 23-26 July 2026 [SRCH-CLOSE]. October status **unknown** |
| Vegetation species | **unknown** |
| Cows, paragliders | **unknown** |

## 1. Road

- **Gradient profile (route file)**: km 0-2 about 4-5 %; km 2-4 about 8-12 %; km 4-7 about 8-9 %; km 7-9 about 9-11 %; km 9-14 about 8 %. Max 500 m average 11.8 % at km 3.3.
- **Bends**: wide, flat, engineered for coaches [SRCH]. Inside edge steep.
- **Walls**: concrete walls on one side in places; wall faces carry graffiti [BIKE-MAG]. OSM retaining walls at km 8.9-10.7 and 4.07 km.
- **Names on tarmac**: winners' names painted across the lanes [BIKE-MAG, P-1].
- **Bottom**: the first 2 km run on the valley road (Avenue Aristide Briand, Pont du Bourg d'Oisans at 0.62 km, Route de l'Alpe d'Huez from 0.78 km) [OSM].
- **Access**: open to cars and bicycles outside Tour days [WIKI-EN, SRCH-CLOSE]. Traffic density: **unknown**.

## 2. Hairpins and signs

Sign names by bend [PCUK; years as given]:

| Bend | Sign | Bend | Sign |
|---|---|---|---|
| 21 | Fausto Coppi 1952 | 10 | Federico Echave 1987 |
| 20 | Joop Zoetemelk 1976 | 9 | Steven Rooks 1988 |
| 19 | Hennie Kuiper 1977 | 8 | Gert-Jan Theunisse 1989 |
| 18 | Hennie Kuiper 1978 | 7 | Gianni Bugno 1990 (Dutch Corner) |
| 17 | Joaquim Agostinho 1979 | 6 | Gianni Bugno 1991 |
| 16 | Joop Zoetemelk 1979 | 5 | Andy Hampsten 1992 |
| 15 | Peter Winnen 1981 | 4 | Roberto Conti 1994 |
| 14 | Beat Breu 1982 | 3 | Marco Pantani 1995 |
| 13 | Peter Winnen 1983 | 2 | Marco Pantani 1997 |
| 12 | Luis Herrera 1984 (also Tom Pidcock 2022) | 1 | Giuseppe Guerini 1999 |
| 11 | Bernard Hinault 1986 | | |

Some signs carry two names [PCUK, WIKI-EN]. Armstrong's name is on one sign (result vacated) [WIKI-EN]. Altitude per sign: **unknown** (OZ says signs show it; no values read).

**OSM guideposts mapped to bends (est.)**: route km, metres off line.

| Km | Off | OSM name | Bend (est.) |
|---|---|---|---|
| 2.28 | 9 | Virage de la Savoyate | 21 |
| 2.97 | 4 | Virage du Gene Vignon | 20 |
| 3.17 | 11 | Virage des Grangettes | 19 |
| 3.44 | 6 | Virage du Gue | 18 |
| 3.79 | 11 | Virage de la Coute | 17 |
| 4.01 | 9 | Virage de la Meule | 16 |
| 4.67 | 8 | Virage de la Citerna | 15 |
| 5.02 | 7 | Virage du Chateau | 14 |
| 5.78 | 8 | Virage du Charretier | 13 |
| 6.24 | 7 | Virage du Ribot d'en Haut | 12 |
| 6.73 | 8 | Virage du Pertu | 11 |
| 7.33 | 6 | Virage des Goutards | 10 |
| 7.87 | 8 | Virage Celeste | 9 |
| 8.47 | 10 | Virage des Serres | 8 |
| 8.97 | 11 | Virage de Saint-Ferreol | 7 (Dutch Corner) |
| 10.11 | 14 | Virage de Saint-Claude | 6 or lower |
| 10.64 | 7 | Virage du Pied des Chanses (also "Virage 5" bus stop) | 5 (est.) |
| 11.08 | 15 | Virage des Fontaines | 4 or lower |

The 14 guideposts between Savoyate and Saint-Ferreol match bends 21 to 8. Bends 6-1 have only three OSM names; their positions are **unknown**. Bend 1 is near Huez (est. km 11-13). The road then runs about 1.5 km through Huez and the resort to the finish. That distance from bend 1 is **unknown**.

## 3. Villages and landmarks, by route km

- **0.0-0.4, Le Bourg-d'Oisans**: valley town. Hotel de Milan (0.02 km, 49 m), Office du tourisme bus stop (0.00 km), Intermarche fuel (0.40 km, 26 m).
- **4.0-4.1, La Garde**: Saint-Pierre church (4.03 km, 28 m off), bus stop "La Garde - Le Village" x3 (4.04-4.09 km), Place de la Meule (4.06 km), La Rue-d'en-Haut (4.20 km). Village on the slope.
- **6.3, Le Ribot**: bus stop and platform (6.29-6.30 km).
- **8.9-9.1, Dutch Corner**: Saint-Ferreol church (9.02 km, 25 m off), viewpoint (8.97 km, 21 m off), memorial and cross (8.94-8.99 km), benches. Water point at bend 7 [OZ].
- **9.6-10.3, Huez village**: Eglise Sainte-Anne (9.71 km, 56 m off), Mairie d'Alpe-d'Huez (9.72 km, 88 m off), bus stops Huez Bas (9.87 km) and Huez le Haut (10.31 km). Chalet-style and rendered houses.
- **11.4, Maona**: bus stop (11.37 km, 0 m), shelter (11.38 km).
- **14.0-14.7, resort**: Avenue du Rif Nel (14.40-14.70 km, 0-14 m off), Rond-Point de l'Europe (14.33-14.41 km), Rond-Point du Tour de France and bus stop (14.68-14.70 km, 0-27 m), Chalet des enfants ski school (14.44 km, 17 m), Notre-Dame-des-Neiges (14.56 km, 396 m off line, outside the 100 m set).
- **Finish**: Avenue du Rif Nel, above the Etendard roundabout [WIKI-EN caption, SRCH].

## 4. Buildings

- **Bourg-d'Oisans (km 0-2)**: valley town, 2-4 storeys, rendered and tiled [OSM building types].
- **La Garde (km 4)**: small village on the slope, church with a tower (Saint-Pierre). Roofs and colours: **unknown**.
- **Huez (km 9.6-10.3)**: old village; Saint-Ferreol church at the Dutch Corner; chalet-style and rendered houses [OSM names, SRCH].
- **Resort (km 14.0-14.7)**: 1960s-80s apartment blocks (brutalist, white render, brown timber cladding) next to newer timber chalets [SRCH-ARCH, P-4, P-5]. Notre-Dame-des-Neiges church by Jean Marol (1960s, finished 1970), marquee-shaped, stained glass by Arcabas [WIKI-EN, SRCH-ARCH]. Chalets with dark standing-seam metal roofs [P-6]. Snow-covered roofs in winter [P-4].

## 5. Vegetation by route km

Species: **unknown**. Land cover from OSM within 100 m; photos.

| Km | Land cover (OSM) | Photo evidence |
|---|---|---|
| 0-2 | Town: roads, buildings, bus stops, a few trees | valley town |
| 2-4 | Scrub, grass; wood at 0.73 km (931 m off) | conifers on lower slopes [P-1] |
| 4-6 | Meadow, shrub, reservoir (5.52 km), scree (5.78 km) | grass and shrub bank [P-1] |
| 6-9 | Cliffs (6.74 km), scree, meadow (8.99 km) | limestone cliff faces [P-2, P-3] |
| 9-11 | Retaining walls, shrub, houses; wood 550-1070 m off | conifers and larch [P-1] |
| 11-13 | Grassland, meadow (12.6 km), wood (12.25 km), cliffs and scree | open pasture |
| 13-14.7 | Open meadow, scree, resort gardens, Lac des Bergers | low grass; conifers at resort edge [P-6] |

Lower road: conifer forest and scrub. Upper road: open alpine pasture and rock. Tree line est. 1300-1500 m.

## 6. Rock

- Grey limestone and scree cliffs: 0.74 km (764 m off), 5.8-6.7 km (129-363 m off), 9.0-9.7 km (465-597 m off), 12.2-13.9 km (132-568 m off) [OSM].
- Photos: grey limestone cliff with scree under cloud [P-7]; cliff and scree above the Huez ridge [P-2].

## 7. Life

- Cyclists: strong presence in summer [SRCH]. No count.
- Cars: open except Tour days [SRCH-CLOSE]. Density: **unknown**.
- Cows on the road: **unknown**.

## 8. Light

- Resort largely south-facing [WIKI-EN].
- Summer: blue sky with cloud [P-3, P-6]. Winter dusk: pink sky over the resort [P-4].

## 9. Photos (photos/manifest.json)

Seven kept; two Commons downloads failed (HTML error page) and were removed. All opened and described:

- **P-1 alpe-tdff24-virages.jpg** (CC BY-SA 4.0, MFonzatti, 2024): hairpin road cut into the upper-left slope, grey concrete retaining wall under a bend, larch and conifers, painted "Alpe * Huez" letters on grass, cable car gondolas, lower road with white dashes and painted lane text.
- **P-2 alpe-from-bottom-177725013.jpg** (CC BY-SA 2.0, joiseyshowaa): resort on the ridge skyline seen from below; grey cliffs and scree under the ridge; conifers; small chapel and buildings on the slope.
- **P-3 alpe-view-from-top-191108244.jpg** (CC BY-SA 2.0, joiseyshowaa): view from the upper resort over the Oisans valley; steep grey cliffs; snow peaks; pylon; chalet in the foreground. km est. 13.5.
- **P-4 alpe-dusk-2006.jpg** (CC BY 2.0, michael warren from Bristol, UK): winter dusk; brown timber-clad block with wooden balconies and snowy roof; white-rendered blocks; parked cars; snowy peaks. km est. 14.5.
- **P-5 alpe-alped-huez43.jpg** (CC BY-SA 3.0, Raphodon): summer view from the upper parking area; multi-storey white and brown blocks; chalets; barrier arm; speed-limit sign; bare pistes. km est. 14.5.
- **P-6 alpe-alpes-dhuez.jpg** (CC BY-SA 3.0, Reno.38): two chalet-style buildings with dark standing-seam metal roofs and timber cladding; meadow; glaciated peaks; white guard rail in the foreground. km est. 14.5.
- **P-7 alpe-juin2017-abc4.jpg** (CC BY-SA 4.0, Patafisik): rock face and scree above grass; small brown hut; cloud over the ridge. Not the road.

## 10. OSM inventory within 100 m, by route km

3384 OSM elements; 1030 within 100 m of the line.

| Km | Within 100 m (main types) | Notes |
|---|---|---|
| 0-1 | service 21, secondary 18, primary 13, bench 7, residential 4 | valley town |
| 1-2 | service 17, secondary 7, residential 4, path 4, bus stop 3 | |
| 2-3 | information (guidepost) 2, secondary 2 | bends 21-20 |
| 3-4 | information 3, path 1 | bends 19-17 |
| 4-5 | service 6, bus stop 3, information 2, church 1, retaining wall 1 | La Garde |
| 5-6 | information 2, service 2, meadow 1, reservoir 1 | |
| 6-7 | footway 3, bus stop 2, information 2, platform 2 | Le Ribot |
| 7-8 | information 2, path 2 | bends 10-9 |
| 8-9 | footway 5, information 2, bench 2, retaining wall 2, cross 1, viewpoint 1 | Dutch Corner |
| 9-10 | service 24, footway 11, retaining wall 8, stream 2, church 2, bus stop | Huez |
| 10-11 | service 24, footway 22, houses 5, secondary 4, retaining wall 3, bus stop 3 | Huez |
| 11-12 | secondary 10, footway 6, houses 6, cycleway 6, service 5, bus stop 2 | Huez outskirts |
| 12-13 | meadow 1, cycleway 1, wood 1, path 1 | open pasture |
| 13-14 | walls 2, viewpoint 1, secondary 1 | |
| 14-14.7 | secondary 26, service 12, footway 12, path 5, stream 5, bench 2, ~25 resort chalets | resort, finish |


## 11. Look-target recap

1. Road: wide hairpins, grey asphalt, painted stage-winner names, concrete retaining wall on the uphill side. Average 8 %, max 13-14 %.
2. Dutch Corner: km 9.0, Saint-Ferreol church beside the road, about 1390 m est., bend 7, Bugno 1990 sign.
3. La Garde: km 4.0-4.1, village on the slope, Saint-Pierre church.
4. Huez village: km 9.6-10.3, Sainte-Anne and Mairie, chalet-style houses.
5. Resort: km 14.0-14.7, brown timber and white render blocks, grey metal roofs, winter snow on roofs, Notre-Dame-des-Neiges tent-shaped church (14.56 km, 396 m off).
6. Finish and route end: Avenue du Rif Nel, Rond-Point du Tour de France, 1823 m.
7. Vegetation: conifer and larch 2-8 km; open meadow and scrub 8-12 km; pasture and rock above 12 km.
8. Rock: grey limestone cliffs above the road at km 6-7 and 8-10, scree above.

## 12. Open issues

1. Length: file 14.9 km, projection 14.70 km, official 13.7-13.8 km. Keep the file for the map.
2. Max gradient: the 25 % file spike at km 5.35 is noise. Use 13-14 %.
3. Bends 6-1: positions **unknown** beyond three OSM names.
4. Dutch Corner church: Saint-Ferreol is the best est.; sources conflict.
5. Road width, barriers, markings beyond names: **unknown**.
6. Altitudes per sign: **unknown**.
7. Route ends at Rif Nel, past the bend-1 sign by about 1.5 km; check whether the scene should stop at the finish line.
8. October 2026 road and lift status: **unknown**.
9. Vegetation species, cows, paragliders: **unknown**.
10. Two Commons downloads failed; re-run if more photos are needed.
