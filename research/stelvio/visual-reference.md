# Passo dello Stelvio, east ramp (Prad / Prato allo Stelvio to the pass): visual reference for the 3D cycling scene

Scope: `public/routes/stelvio.json`, from Prad / Prato allo Stelvio (905 m, km 0) to the pass (2757.5 m, km 25.26). Route km = projection of each point onto the route polyline (script in scratchpad/research-scripts/stelvio, not in WT). Anything no source gives is **unknown**; estimates are **est.**.

Route length: metadata says 25.32 km, the coordinates project to **25.26 km**. Elevation span 905 to 2757.5 m = 1852 m (file gain 1855). A naive sum of positive steps (1942 m) is DEM noise; do not use it.

## Source key
- [WIKI-EN] https://en.wikipedia.org/wiki/Stelvio_Pass (2757 m; 48 hairpins north side "numbered with stones", 34 south; built 1820-25; closure months)
- [WIKI-DE] https://de.wikipedia.org/wiki/Stilfser_Joch (Gomagoi 1260 m; Franzenshoehe 2188 m; 48 numbered Kehren; 1825 opening; wooden avalanche tunnels on the east ramp; pass hotels; Ortler 3905 m)
- [CYC-UP] https://cyclingup.eu/english/Italy_Alps/Passo_dello_Stelvio-east.php (east profile: 24.7 km, 1849 m, mean 7.5 %, steepest km 10.2 %, steepest 250 m 13 %; Franzenshoehe "slightly above the tree line"; 19 hairpins above Franzenshoehe; traffic counts)
- [SB] https://sportivebreaks.com/cycling-climbs/stelvio-prato/ (search summary: numbering counts down to the top; climb proper starts at Trafoi by hairpin 46; treeline near turn 22)
- [GRAN] search summary, 75 hairpins in total, 48 numbered with stones on the north side; ANAS-maintained; guard rails on exposed bends (unverified)
- [WUM-AT] https://www.wandernundmehr.at/faq/wann-ist-der-stelvio-pass-offen (search summary: season about 1 Jun to 1 Nov; sources conflict)
- [PARK] https://www.provincia.tn.it/en/Administration/Locations/Protected-areas/Stelvio (search summary: larch and spruce forest, pastures, subalpine heath above)
- [TREE] https://literature.wolkersdorfer.info/literature/Vegetation at the Upper Timberline.pdf (search summary: Zirbe about 2000-2300 m in the eastern Alps; general, not Stelvio-specific)
- [CM-*] Wikimedia Commons file pages, one per photo, in `photos/manifest.json` (each opened and described)
- [OSM] `public/osm/stelvio.json` (4651 elements, projected to route km; centroids, not surveyed)

## 0. Confidence summary

| Area | Status |
|---|---|
| Pass height | 2757 m [WIKI-EN, WIKI-DE]; Cima Coppi sign says 2760 m [CM-cima]. **High** |
| Hairpins, this side | **48** [WIKI-EN, WIKI-DE, GRAN]; 75 total [GRAN]; 34 Bormio side [WIKI-EN]. Totals vary, 48 is consistent |
| Hairpin numbering | Numbers on stones at the bend; counts **down** to the top [SB, GRAN]. Km per number: **est.** (section 1.1) |
| Grade, whole side | Mean 7.5 %, steepest km 10.2 %, steepest 250 m 13 % [CYC-UP]. Route file: steepest 500 m 10.4 % (km 14.8). Steepest 100 m about 16 % at km 15.2 (DEM-noisy, est.) |
| Grade, km 0-5.5 | Max 7 % [CYC-UP]; route file mean 4.3 % over km 0-5. Consistent |
| Road width | 5-6 m at apex [GRAN, unverified]; rest **unknown** |
| Surface | Mid-grey asphalt, white edge lines [CM-kehre, CM-climb]. Condition "average" 2015 [CYC-UP] |
| Barriers | Dry-stone walls on the uphill side of many bends [CM-kehre, CM-climb]; galvanised rail on exposed outside edges near the valley [CM-valley]. Per-hairpin mapping: **unknown** |
| Tunnels and snow galleries | Historic wooden avalanche tunnels, about 3.5 km on the east ramp, built soon after 1825; partly burned in 1848 near Trafoi [WIKI-DE]. **Present state unknown**. OSM `tunnel=yes` at km 8.28 and two at km 4.0-4.1; not identified |
| Pass top | Hotels, souvenir shops, Cima Coppi sign, Tibet hut 200 m off the line at km 24.4 [OSM, CM-top-hotels, CM-tibet] |
| Franzenshoehe | Berghotel, 2188 m [WIKI-DE]. Only an old postcard for the look [CM-franzenshoehe] |
| Season 2026 | Open per the latest result (dated 9 Oct 2026, unverified). Usual end about 1 Nov [WUM-AT, WIKI-EN]. **Verify with ANAS / Suedtirol traffic info before any use** |
| Trees | Larch and spruce forest, Zirbe above, alpine pasture above that [PARK]. Stelvio-specific species by altitude: **unknown** |
| Treeline, this side | "Slightly above the tree line" at Franzenshoehe [CYC-UP]: treeline **est. 2100-2200 m, route km 17.5-18.7** |
| Glaciers | Stelvio glacier 3450 m [WIKI-EN]; Ortler snow faces from Trafoi and the pass [CM-trafoi, CM-tibet, WIKI-DE] |
| Traffic | More than 25 racing cyclists and more than 180 cars or bikes per hour on a peak day, 2015 [CYC-UP] |

Conflicts: length 24.7 km [CYC-UP], 25.3 km [route file], 28 km north side [WIKI-EN]. Hairpin total 48 / 60 / 70 / 75 depending on source. Summit 2757 m vs sign 2760 m.

## 1. Road

### 1.1 Hairpins
- 48 on this side, numbered on stones, counting down toward the top [WIKI-EN, SB]. No photo in our set shows a number sign, so its style is **unknown**.
- Est. route km, linear between anchors (anchors: hairpin 46 at Trafoi, route km about 10.0 [SB]; hairpin 19 at Franzenshoehe, km about 18.7 [CYC-UP, OSM]; hairpin 1 at the pass, km 25.2):

| Hairpin | 46 | 40 | 30 | 25 | 19 | 10 | 5 | 1 |
|---|---|---|---|---|---|---|---|---|
| est. km | 10.0 | 11.9 | 15.2 | 16.8 | 18.7 | 21.9 | 23.7 | 25.2 |

- Hairpins 47-48 lie below Trafoi, est. km 8.5-10. About 3 hairpins per km above Trafoi (est.).
- Bella Vista: OSM has Hotel Bella Vista at Trafoi, km 11.05 [OSM]; [SB] places a "Bella Vista" near the top. Possibly two hotels; **open**.
- A stone memorial between bends 32 and 33 marks an 1876 murder [WIKI-DE]. Km **unknown**.

### 1.2 Width, surface, barriers
- Two lanes, no shoulder, est. 5-6 m. Campers and buses reverse at some apexes [GRAN, unverified].
- Asphalt with white centre and edge lines. Dry-stone walls on the uphill side of bends, grey and brown-red stone [CM-kehre, CM-climb].
- [WIKI-DE]: the steep slope above Franzenshoehe was planned with many tight switchbacks (61 on the north ramp). Stone for high walls was lacking and the slate unstable, so long switchbacks were built instead. That is why the upper zigzags look as they do.
- Metal guard rail with timber posts along the outside of an east-side valley bend [CM-valley]. Coverage elsewhere: **unknown**.
- Historic wooden avalanche sheds, about 3.5 km [WIKI-DE]: present state **unknown**.

## 2. Villages

### 2.1 Prad / Prato allo Stelvio (km 0-1.3, 905-950 m)
- Valley floor town: Hotel Prad (1.27 km), fuel stations, supermarket, bus stops [OSM]. Rendered 2-3 storey houses (OSM building names only; look **est.**).
- Open valley meadows, orchards and farm buildings from about km 2 to 5 [OSM].

### 2.2 Gomagoi (km 6.1-7.1, about 1260 m)
- [WIKI-DE] Gomagoi at 1260 m; the SS 622 to Suldental branches here. OSM: road "Gomagoi" at km 6.1-6.9, bus stop at 7.05, Hotel Gomagoierhof at 7.06, Hotel Gallia at 6.65 [OSM].
- Architecture: **unknown** (no photo opened; Commons has a "Hotel Post in Gomagoi" category, not checked).

### 2.3 Trafoi (km 9.9-11.2, about 1460-1530 m by route file)
- OSM: bus stops at 9.92, 10.74 (Hotel Post), 10.98; hotels and guest houses (Tannenheim 9.92, Tuckett 10.13, Stelvio Residence 10.66, Dalliadahof 10.79, Interski 10.93); Naturatrafoi visitor centre 11.05; church "Mariae Heimsuchung" 11.46 km, 86 m off [OSM].
- Look [CM-trafoi]: about six white and grey-rendered houses on a meadow at the valley head, spruce forest on both slopes, Ortler glacier behind, a gravel farm track in front. Timber balconies: **unknown**.
- Memorial "Erstbesteigung des Ortler 1804" at km 15.17, 5 m off the road [OSM name only; content unverified].
- Trafoi stream check dams (weirs): OSM shows 16-30 per km at km 7-9 [OSM].

### 2.4 Franzenshoehe (km 18.7-19.1, 2188 m)
- [WIKI-DE] 2188 m; [CYC-UP] just above treeline. OSM: bus stop 18.66, access road 18.38, Berghotel Franzenshoehe at 19.11 km, 128 m off [OSM].
- [CM-franzenshoehe] old undated postcard: three- and four-storey white hotel blocks, hipped and pitched metal roofs, stone-and-timber annex, yard with stacked timber. Steep rock and glacier behind (Ortler). Current look: **unknown**.

### 2.5 Tibet hut (km 24.4, about 2480 m)
- OSM Alpengasthof Tibet, 24.39 km, 204 m off the line [OSM]. [CM-tibet]: round two-storey stone-and-timber tower with conical metal roof, flat terrace with red-and-white parasols, timber annex, Ortler snow face behind, bare scree.

## 3. Pass top (km 25.0-25.3, 2757 m)
- [CM-top-hotels]: tarmac plaza, three-storey white hotel with dark timber upper floor, sign "HOTEL STILFSERJOCH - SKI SCHULE CAPITANI"; souvenir stand with jersey racks and postcards; timber kiosk; motorbikes; cars; a stone observation tower in the distance; Ortler massif with snow.
- [CM-cima]: stained timber shop with coloured shutters, jersey racks, magnets, Cima Coppi sign "2760 m / 9055 ft", white and black pass sign, number-plate display.
- OSM hotels: Passo Stelvio (25.23), Genziana (25.25), Pirovano Quarto (25.26), Cristallo (25.26), Folgore (25.26); chapel Santa Maria in Neve (25.26, 38 m off) [OSM].
- [WIKI-DE]: first pass hotel Ferdinandshoehe 1897; Kaiser-Franz-Joseph obelisk 1925; several hotels, cafes and kiosks; a bank branch said to have Europe's highest counter (claim).
- Route end: km 25.26 on the plaza. The road continues to Umbrail and Bormio, outside the route file.

## 4. Vegetation by route km

| Route km | Route ele (m) | OSM within 100 m | Notes |
|---|---|---|---|
| 0-1.3 | 905-950 | Town: buildings, lamps, bus stops | Valley floor |
| 1.3-5 | 950-1120 | Meadows (11 at km 4), orchards, tracks, guard rail | Meadows; pine grove at the valley edge (OSM "Kiefernhain"), not on the road |
| 5-7 | 1120-1270 | Meadow, scrub, forest sparse | Forest begins on slopes [CM-valley] |
| 7-10 | 1270-1480 | Weirs, scrub, grassland, wood (2) | Spruce and larch on slopes (est.) |
| 10-16 | 1480-1900 | Forest, scrub, path | Spruce dominant [PARK]; larch likely (est.) |
| 16-18 | 1900-2150 | Forest (1), wood (1), scrub (3) | Thinning forest |
| 18-19 | 2150-2220 | Scree, wood, scrub | **Treeline est. km 18** [CYC-UP] |
| 19-25 | 2220-2757 | Scree, bare rock, viewpoints | Open alpine |

- Larch turning gold in October: **unknown** for this side. No autumn photo in our set. Larch likely below about 2000 m (est.).

## 5. Rock and glaciers
- Upper road: grey bare rock faces and scree [CM-payer]. Walls: brown-red and grey stone [CM-kehre]. [WIKI-DE] mentions unstable slate on the upper slope. Geology per source: **unknown**.
- Ortler (3905 m [WIKI-DE]; park 3899 m) from Trafoi and the pass, east-south-east of the pass [WIKI-DE, CM-tibet, CM-top-hotels].
- Stelvio glacier 3450 m [WIKI-EN]; visibility from the ramp **unknown**.
- Snow patches on scree in June photos above about 2400 m. October snow: **unknown**.

## 6. Life
- Road cyclists in groups, motorbikes stopped on the plaza, cars parked, souvenir shoppers [CM-top-hotels, CM-cima].
- Traffic on a peak day: more than 180 cars or bikes per hour [CYC-UP]. October is lighter (est.).

## 7. Light
- No source gives light data. Photos: hard midday light, blue sky, cumulus at altitude [CM-top-hotels, CM-payer]; hazy flat light in the valley [CM-valley].
- Sun direction per hairpin: **unknown**. Trafoi valley walls shade the lower road in the morning (est.).

## 8. OSM inventory within 100 m of the line, by route km
Counts are OSM features projected to the route, not surveyed.

| Route km | Notable features within 100 m |
|---|---|
| 0-1 | Town: 250+ buildings, lamps (93), bus stops (4), benches, trees (11) |
| 1-3 | Street lamps, secondary road, track, meadows, orchards, stream culverts (2) |
| 3-5 | Water, meadows (11), guard rails (5 at km 4), bus stops (4), tunnel=yes (2) at km 4 |
| 5-7 | Meadow, tracks, bus stops (2), memorial at 4.9 km (17 m), Gomagoi road and bus stops, Gomagoi hotel 7.06 |
| 7-9 | Weirs (16 and 26), scrub, grassland, bridge, tunnel=yes at 8.28 (1) |
| 9-11 | Weirs (30), Trafoi hotels and guest houses (9.9-11.2), bus stops (3), bridges (4) |
| 11-13 | Museum 11.05, church 11.46, guideposts (3), track, path |
| 13-15 | Track, path, guidepost, stream, memorial 15.17 (5 m), restaurant 15.15 |
| 15-18 | Screes, grassland, forest (1), wood (1), scrub (3), bridge |
| 18-19 | Franzenshoehe bus stop 18.66, access road, Tibet trail, scrub |
| 19-23 | Scree, bare rock, viewpoint 23.43 |
| 23-25 | Tibet hut 24.39 (204 m), retaining walls (12 at 25 km), footway, steps, barrier fence |
| 25-25.3 | Pass plaza: hotels (5), viewpoint 25.17 (7 m), Cima Coppi sign, guidepost, chapel 25.26, memorial 25.26 |

## 9. Look-target recap for the 3D scene
- Road: mid-grey asphalt, white edge lines, dry-stone walls on the uphill side of bends, galvanised rail on exposed outside edges near the valley.
- Hairpins: numbered on stones (48 on this side), counting down to the top. Upper steep slope above Franzenshoehe has long switchbacks [WIKI-DE].
- Gomagoi (1260 m): South Tyrolean rendered houses, km 6-7.
- Trafoi (km 10-11): white-rendered houses on a meadow, spruce around, Ortler glacier behind.
- Franzenshoehe (km 18.7, 2188 m): white hotel blocks, metal roofs, stone and timber annex, steep rock and glacier behind.
- Pass top (km 25.2, 2757 m): white hotels, timber facades with coloured shutters, souvenir stands, Cima Coppi sign, motorbikes, tarmac plaza, Ortler south-east.
- Vegetation: spruce and larch forest from Prad to about km 18; treeline est. km 18 (2150-2200 m); bare scree and alpine grass above.
- Rock: pale grey bare rock and scree above treeline; brown-red stone in walls.

## 10. Open issues
1. Hairpin km are estimates from two anchors; no number sign seen in any photo.
2. Avalanche tunnels/sheds: present state unknown; check OSM `tunnel=yes` at km 8.28 and km 4.
3. Bella Vista: Trafoi (km 11.05) vs. near the top [SB]. Confirm.
4. Franzenshoehe look today: only an old postcard. Need a recent photo.
5. Larch colour in October: no evidence on this side.
6. Road status today (12 Oct 2026): latest search result says open (dated 9 Oct). Verify.
7. Summit 2757 m (route, Wikipedia) vs sign 2760 m. Use 2757.
8. Gain: use 1852 m (elevation span).
9. Village in P-5 is not named in the photo; identity unconfirmed.

## 11. Photos (photos/manifest.json)
- P-1 stelvio-kehre-2021-aug-25-zintosch7 (CC BY-SA 4.0): cyclist on a hairpin, dry-stone wall, white edge line.
- P-2 stelvio-climb-2021-aug-25-zintosch7 (CC BY-SA 4.0): riders beside a tall dry-stone wall, a car at the edge.
- P-3 stelvio-pass-top-hotels-2015-steffs88 (CC BY-SA 4.0): pass plaza, Hotel Stilfserjoch, souvenir stand, motorbikes, Ortler.
- P-4 stelvio-tibet-hut-ortler-2015-steffs88 (CC BY-SA 4.0): Tibet hut, stone-and-timber tower, Ortler snow face.
- P-5 stelvio-valley-village-guardrail-sjaak (CC BY 2.0): valley village, guard rail, spruce, glaciers; village not named.
- P-6 stelvio-switchbacks-from-above-sjaak (CC BY 2.0): switchbacks far below, pylons, screes.
- P-7 franzenshoehe-ortler-cascafico-cc0 (CC0): old postcard, Franzenshoehe hotels with Ortler.
- P-8 trafoi-talschluss-whgler (CC BY-SA 4.0): Trafoi village, spruce, glacier at the valley head.
- P-9 stelvio-cima-coppi-zintosch7 (CC BY-SA 4.0): Cima Coppi sign "2760 m", souvenir shop.
- P-10 stelvio-payer-view-uwelino (CC BY-SA 4.0): scree ridge, pale switchbacks toward the pass.
