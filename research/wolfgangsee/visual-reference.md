# Wolfgangsee route visual reference for the 3D cycling scene

Scope: `public/routes/wolfgangsee.json`, from the St. Gilgen centre (route km 0.00) through Strobl to the St. Wolfgang market square (route end). Route km = projection of each point onto the route polyline (script in scratchpad/research-scripts/wolfgangsee, not in WT). Anything no source gives is **unknown**; estimates are **est.**.

Route length: the file's `lengthKm` says **18.31**; the coordinates project to **18.20 km** (507 points, equirectangular). This document uses 18.20. Elevation in the file: **539.5-567.3 m**, gain 104 m.

## Source key
- [ROUTE] `public/routes/wolfgangsee.json`. [OSM] `public/osm/wolfgangsee.json` (420 m corridor, centroids, not surveyed).
- [LAKE] OSM relation 1764080 "Wolfgangsee" polygon via Nominatim (ODbL). Overpass unreachable this run. Partly validated, partly contradicted (section 2).
- [SAL-LAKE] salzkammergut.at/oesterreich-destination/detail/22/wolfgangsee.html, austria.info/de-de/locations/wolfgangsee/ (search summaries).
- [SCHIFF] salzkammergut.at/oesterreich-poi/detail/400639/wolfgangsee-schifffahrt.html. [STROBL] salzburgerland.com/de/strobl/. [PARK] salzkammergut.at/oesterreich-poi/detail/103479/parkplatz-3-zentrum.html.
- [RAD] biketrailspfannenstiel.ch/auskunft/radweg-um-wolfgangsee/ (search summary). A second, undated source (URL not kept) claims a cycling ban Fürberg to Brunnwinkel. Unverified.
- [SCHAF] 5schaetze.at GJF_Interaktiv_DE_2026_WEB.pdf (search summary). [WIKI-OLD] Wikipedia-derived copy, URL not kept, lower confidence.
- [ARCH] hotel captions: oberoesterreich.at/oesterreich-unterkunft/detail/160162 (balconies), /160292 (flowers), /430018586 (shutters). Weak evidence.
- [HYDRO] Upper Austrian hydrographic reports Jun-Jul 2026 (search summary, URL not kept). [SUN] computed here, est. +/- 3 min.
- [C-1] to [C-9] photos in `photos/` (manifest.json), each opened (section 10).

## 0. Confidence summary

| Area | Status |
|---|---|
| Route length | 18.20 km projected [ROUTE]; file says 18.31 (open issue 1) |
| Start | St. Gilgen centre, Mozartplatz/Rathaus, km 0.00. Rathaus 30 m off the line [OSM] |
| Route end | St. Wolfgang Marktplatz, km 18.20. OSM tags it `highway=living_street` [OSM] |
| B158 | Wolfgangseestraße (OSM primary) km 6.95-~9.8, then through Strobl; St. Wolfgang Straße (secondary) from km 12.8 [OSM] |
| Cycle path beside B158 | Yes for most of the route [RAD]. Exact km **unknown**. OSM cycleways within 100 m only at km 4.7-5.2 and 14.8-16.0 |
| Width, markings, guard rails | **unknown**. OSM lanes tag: 2 at km 7.1-7.5, 3 at km 9.5 |
| Tunnels | None on the route. Culverts and small bridges only [OSM] |
| Lake distances | **Medium** for km 0-4.3 and 15.7-18.2; **low** for km 4.5-15 (section 2) |
| Speed limit | 50 km/h per a search snippet citing OSM, unverified. Not in the dump |
| Lake colour, temperature | Light to deep blue and green, lime particles [SAL-LAKE]. Summer 22-26 C [HYDRO]. October water **unknown** |
| Schafberg, Zwölferhorn | About 1782 m [WIKI-OLD, SCHAF]; 1521 m [WIKI-OLD] |
| St. Wolfgang old-town traffic | **unknown**. No ban found. OSM: living street |
| October | Est. only (section 7). Autumn foliage in [C-4, C-9] |
| Vegetation species | **unknown**. Spruce-dominated slopes in photos. Beech est. |
| Architecture rules | **unknown**. Caption evidence only (section 4) |

## 1. Road

- **km 0-6.4, St. Gilgen to Abersee**: heads roughly ESE from the town centre. Km 0-1 is town streets (Mozartplatz, Pichlerplatz, Steinklüftstraße). Km 1-6 runs mostly 0-300 m from the lake outline [LAKE], with lakeside buildings and boathouses. Abersee bus stop at km 6.40, 9 m off the line [OSM].
- **km 6.95-9.8, Wolfgangseestraße (B158)**: primary, asphalt, two lanes per OSM at km 7.1-7.5 (three at 9.5). Km 4.5-9 is 250-1300 m from the outline [LAKE], which conflicts with the "along the shore" wording in [RAD] (section 2).
- **km 9.6-12.8, Strobl**: Strobl Haberg stop at km 9.66, Breitenbach and Urschlag stops at km 10.1 and 11.2. Village centre at km 12.2-12.6 (s'Platzl 12.20, Busbahnhof Strobl 12.48). Seeklause kayak slipway [STROBL] at km 12.17.
- **Turn to the east shore, km 12.8**: Bahnstraße (km 11.9-12.7) becomes **St. Wolfgang Straße (secondary) at km 12.82**, with a bridge at 12.85 [OSM].
- **km 12.8-15.7, east road**: Seethurn bus stops at km 13.46-13.51 (Parkhotel Seethurn 167 m off). Hotel and restaurant Bürglstein at km 15.13-15.14 [OSM].
- **km 15.7-18.2, east shore**: back at the lake from km 15.75. Bathing place Badeplatz Bacherlwiese at km 16.59 (65 m from the outline). Appesbach stop at km 16.9-17.1; the Appesbach waterway point sits 1 m from the outline [LAKE]. Au stop at km 17.7.
- **Route end, km 18.20**: Marktplatz (`living_street`, km 18.19-18.20). Schiffsanlegestelle (boat landing) at km 18.01, 10 m from the outline [LAKE]. Im Weissen Rössl at km 18.20 (55 m off), Pfarrkirche St. Wolfgang at 18.20 (64 m off) [OSM].

Bridges on the route (OSM, bridge=yes): km 0.63, 5.13, 5.55, 6.03, 6.49, 6.61, 10.24 (primary), 12.85, 13.83, 14.38, 15.08 (St. Wolfgang Straße). Culverts at km 8.7, 9.6, 14.0, 14.4, 16.9. Footway passage (`tunnel=building_passage`) at km 18.20. Width, kerbs, rails: **unknown**.

## 2. The lake and the shore

- **Lake facts** [SAL-LAKE]: 12.4 km2, 10.3 km long (one source 11.9), about 2 km wide, max depth 114 m. Summer water to 24 C.
- **Route distance to lake outline** [LAKE]: km 0.0 322 m; 1.0 71 m; 2.0 21 m; 2.5 15 m; 4.0 17 m; 4.5 252 m; 6.0 1125 m; 8.0 538 m; 9.0 260 m; 10.0 626 m; 12.0 201 m; 13.0 767 m; 14.0 856 m; 16.0 12 m; 18.0 70 m.
- **Within 50 m of the outline**: km 0.85-0.93, 1.70-3.02, 3.23-4.10, 4.15-4.25, 15.75-16.48, 17.88-17.95. **Lakeside start is about km 1.7**. The lake is back at the road at km 15.75.
- **Validation** (named OSM points): Im Weissen Rössl 17 m, Schiffsanlegestelle St. Wolfgang Markt 10 m, Badeplatz Bacherlwiese 65 m, Appesbach 1 m, Seeklause 29 m. **Conflicts**: s'Platzl 363 m (lakeside lily square per Commons title), Strobl Haberg 600 m, Gschwendt Landauer 500 m, Strobl Seethurn 760 m, Hotel Bürglstein 583-596 m. Either the polygon is coarse at Strobl or the road really runs inland. The ferry landing "Gschwendt Parkplatz" [SCHIFF] at km 8.2 supports the lakeside reading. **Unresolved.**
- **Working rule for the scene**: lakeside (under 100 m) at km 0-1.0, 1.7-4.2 and 15.7-18.2. Inland with the lake seen through trees at km 4.5-9. **Km 9.5-15: unknown, do not model a lake-level shoulder there until checked.**
- **Boats**: passenger ships (ÖSTERREICH, [C-2]), dinghies and moored sailboats ([C-1], [C-3], [C-7]). Fleet 5 or 6 (disputed). Landing stages: St. Gilgen, Fürberg, Ried-Falkenstein, St. Wolfgang Schafbergbahn, St. Wolfgang Markt, Gschwendt Parkplatz, Strobl [SCHIFF].
- **Paragliding**: free-flying landing field Zwölferhorn Landeplatz Laim (OSM node 7454161440) about 400 m west of the start [OSM]. Paragliders over the lake: est. only.

## 3. Mountains and landmarks

- **Schafberg** (above St. Wolfgang, direction est.): about 1782 m [WIKI-OLD, SCHAF]. Cog railway runs daily to 1 Nov 2026 [SCHAF]. Valley station position **unknown** (not in the dump). Bare rock summit and cliffs in [C-5] and [C-8].
- **Zwölferhorn** (south of St. Gilgen): 1521 m [WIKI-OLD]. Cable car valley station at km 0.25, 48 m off the line [OSM]. Forested ridge behind [C-4] and [C-7].
- **Bürglstein** (north of Strobl) [STROBL]: wooded hill with panoramic trail, on the right of the route at km 13-15 (est.).
- **St. Wolfgang parish church**: white plaster, grey pointed spire and clock face [C-5, C-6]. Pfarrkirche at km 18.20.

## 4. Buildings and village architecture

- **St. Gilgen** [C-3, C-4, C-7]: church spire (onion dome in [C-3]), red and grey roofs, lakefront villas and hotels, some white facades. Hotels Stern, Kendler, Brunetti, Radetzky within 90 m of the start [OSM].
- **Strobl** [STROBL, C-1, C-2]: small lakefront promenade, summer villas from about 1900, bronze "Platonic Lovers" sculpture. Apartments and guesthouses along km 11.9-12.3 [OSM].
- **St. Wolfgang** [C-5, C-6]: dense lakefront of 3-4 storey hotels and houses. White or cream plaster, dark or red-tile pitched roofs, lakeside terraces with red awnings, boathouses at the shore. Hotels within 100 m of km 18.0-18.2 [OSM]: Weißes Rössl, Schwarzes Rössl, Weißer Bär, Zum weissen Hirschen, Zimmerbräu, Seehof, apartment Zum Grünen Haus. Old-town street widths **unknown**.
- **Salzkammergut detail** (caption evidence, low confidence): wooden balconies at one St. Wolfgang hotel [ARCH falkenstein]; flowers in pots and boxes at one guesthouse [ARCH haus-melanie]; green shutters at one guesthouse [ARCH the-view]. None is a village-wide rule. White plaster is what the photos show, not a rule in any source.

## 5. Vegetation by route km

Species **unknown** in all sources. Beech est. on lower slopes and lake edge; spruce and fir est. on steep slopes, as in [C-5, C-8, C-9]. Counts are OSM features within 100 m.

| Route km | OSM within 100 m | Notes |
|---|---|---|
| 0-1 | Houses 68, service and residential roads; no trees counted | Lakefront villas, planted lawns |
| 1-2 | Grass 6, forest 4, sheds 17 | Town edge |
| 2-4 | Grass and meadow 5, scrub 1 | Open lakeside meadows |
| 4-6 | Trees 2, primary road, cycleways 3, tracks | Bridges and culverts |
| 6-8 | Grass 9, garages 14, sheds 37 | Villages on the slopes |
| 8-9 | Trees 8, grass 9, residential landuse 8 | Trees near Gschwendt |
| 9-11 | Meadow 3, grass 11, paths 7 | Strobl outskirts |
| 12-13 | Trees 14, grass 16 | Strobl centre, lawns |
| 13-14 | Houses 17, streams, farmland (est.) | Seethurn |
| 14-16 | Streams 8, cycleways 4-6, wayside shrine | Forest edge, Bürglstein |
| 16-18 | Meadow 2, static caravans 4, memorial | East shore, bathing |
| 18-18.2 | Benches 16, buildings 82 | St. Wolfgang old town |

## 6. Life

- **Cyclists**: cycle path alongside the B158 for most of the length [RAD]. Ban Fürberg to Brunnwinkel reported by an undated source, unverified.
- **Cars**: B158 heavy in summer [RAD]. Car park 3 min from centre, 8 EUR a day [PARK].
- **Boats**: passenger ships, dinghies, moored sailboats [C-1, C-2, C-3, C-7].
- **Paragliders**: Zwölferhorn field (section 2), est. only. **Swans, ducks**: unknown. A small rowing boat or kayak in [C-6].

## 7. Light and October

- **Sun, St. Wolfgang, 12 Oct 2026** [SUN, est. +/- 3 min]: sunrise **07:19 CEST**, sunset **18:26 CEST**.
- **Sun direction** (est.): route runs NW to SE. Low sun ESE in the morning, WSW in the afternoon.
- **Water**: summer 22-26 C [HYDRO]. October **unknown**, est. 15-18 C.
- **Weather**: no October source. Photos: [C-4] clear, snow on peaks; [C-7] grey, mist. Est.: clear mornings, lake mist.
- **Foliage**: orange and yellow trees in St. Gilgen [C-4] and on the left shore [C-9, 1993]. Peak colour date **unknown**.

## 8. OSM inventory within 100 m, by route km

Counts are features within 100 m of the line. Full dump in research-scripts.

| km | Dominant features | Named points (km) |
|---|---|---|
| 0-1 | Houses 68, roads, sheds 32 | Hotel Stern, Rathaus St. Gilgen (0.00); Zwölferhorn Seilbahn (0.25, 48 m) |
| 1-4 | Houses, sheds, grass, forest 4 | Villa Skrein (0.74), Schwand info (4.37) |
| 4-8 | Primary roads 12-20, sheds, detached houses | Abersee bus stop (6.40, 9 m), Stockschützenhalle (7.12), Wiesenhof hotel (7.55) |
| 8-10 | Detached houses 18-23, trees 8, service roads 29 | Gschwendt Landauer stop (8.20), Strobl Haberg stop (9.66), Moosbach culvert (9.61) |
| 10-12 | Grass 8-16, detached houses 48, service roads 36 | Aberseer Heimathaus (10.22), Theo-Lingen-Denkmal (11.91) |
| 12-13 | Detached houses 41, trees 14, grass 16 | s'Platzl (12.20), Busbahnhof Strobl (12.48), Gutshof Wolfgangsee (12.56), Seeklause (12.17, 613 m) |
| 13-15 | Buildings 26-44, secondary road, streams 5 | Seethurn stops (13.46-13.51), Hotel Bürglstein (15.13, 15 m), Gasthof Bürglstein (15.14) |
| 15-17 | Buildings 44-52, cycleways 6, static caravans | Schwarzenbach shelter (15.04), Badeplatz Bacherlwiese (16.59, 62 m), Appesbach stop (16.99) |
| 17-18 | Buildings 52, benches 20, apartments 20 | Kapelle (17.49), Tourismus office (17.81, 21 m), Au stop (17.70) |
| 18-18.2 | Buildings 82, living street 16 | Schiffsanlegestelle (18.01, 65 m), Weißes Rössl (18.20), Pfarrkirche (18.20, 64 m) |

Not in the dump within 100 m: Schafbergbahn valley station, Fürberg and Ried ferry landings, Strobl ferry landing, toll gates.

## 9. Look-target recap

1. St. Gilgen start (km 0-1): lakefront town, cream villas, red roofs, onion-dome spire.
2. Lakeside B158 (km 1.7-4.2): road beside the water, jetties, moored sailboats, Zwölferhorn ridge.
3. Inland (km 4.5-9): meadows and woodland, lake mostly out of view (est., low confidence).
4. Strobl (km 9.6-12.8): village centre with promenade and bathing area at km 12.2-12.6.
5. Turn to the east shore (km 12.8): St. Wolfgang Straße, bridges, woodland.
6. East shore (km 15.7-18.2): lake back at the road, bathing area (16.6), hotels and boathouses.
7. St. Wolfgang end (km 18.2): white church with grey spire, lakeside hotels with red awnings, boat landing, market square as living street.
8. Schafberg above St. Wolfgang, bare rock summit (direction est.). Zwölferhorn south of St. Gilgen.
9. Light: sunrise 07:19, sunset 18:26 CEST on 12 Oct (est.).


## 10. Photos (manifest.json, all CC BY-SA, each opened and described)

- **C-1** strobl-am-see-01: timber jetty, moored sailboat, clear shallow water, summer. Village across the lake unverified.
- **C-2** strobl-ausflugsschiff: passenger ship ÖSTERREICH on open water. Lake only, not a road view.
- **C-3** st-gilgen-mit-see: St. Gilgen from above, onion-dome spire, many dinghies on the lake.
- **C-4** st-gilgen-und-see: autumn, orange trees, snow on the highest peaks.
- **C-5** st-wolfgang-ortsansicht: aerial-style St. Wolfgang, white tower church, hotels, forested mountain behind.
- **C-6** st-wolfgang-austria: lakefront from the water, white church with grey spire and clock, hotels with red awnings.
- **C-7** st-gilgen-molo: wooden jetty, moored sailboats, mist on the mountain, grey sky. Location not captioned.
- **C-8** aerial-southeast: whole lake from the south-east, St. Wolfgang lower right, bare rock summit upper right.
- **C-9** area-october-1993: personal snapshot on a boat, forest with some yellowing trees, October 1993.

Gap: no free-licence road-level photo of the B158, Strobl centre or St. Wolfgang street was found.


## 11. Open issues

1. Route length: file 18.31 km vs projected 18.20 km. Check the source of 18.31.
2. Lake outline at Strobl and Gschwendt: polygon 300-600 m off s'Platzl, Strobl Haberg, Gschwendt, Bürglstein; Seeklause 29 m. Check with Overpass or a GIS layer.
3. Km 4.5-9: sources say the B158 runs along the shore, the polygon says 250-1300 m inland. Confirm with a map or road photo.
4. Cycling ban Fürberg to Brunnwinkel: undated source. Check municipality notices.
5. Marktplatz (`living_street`): car access and volume unknown. The route ends in the square.
6. Schafbergbahn valley station: not in the dump, position unknown.
7. Road width, rails, markings, cycle-path km: unknown. Speed limit 50 km/h unverified.
8. Species, architecture rules, October water and climate: unknown or est. only.
9. Schafberg 1782 m, Zwölferhorn 1521 m: old and secondary sources.
10. Photos: no free-licence road-level photo. C-1 village across the lake unverified.
