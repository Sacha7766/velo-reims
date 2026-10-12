# Mont Ventoux (Bédoin) visual reference for the 3D cycling scene

Scope: `public/routes/ventoux.json`, from the Bédoin start (309 m) to the route end (1900 m) at the summit. Route km = projection of each point onto the route polyline (scripts in scratchpad/research-scripts/ventoux, not in WT). Anything no source gives is **unknown**; estimates are **est.**.

Route length: the file's `lengthKm` says 21.41, the coordinates project to **21.19 km** (equirectangular). Gain in the file: 1589 m; the profile runs from 309.3 m to 1900.3 m (1591 m). This document uses the projection.

## Source key
- [ROUTE] public/routes/ventoux.json; [OSM] public/osm/ventoux.json (4424 elements, 420 m corridor).
- [WIKI-EN] en.wikipedia.org/wiki/Mont_Ventoux; [WIKI-FR] fr.wikipedia.org/wiki/Mont_Ventoux (both fetched 2026-10-12).
- [SRCH-ROAD] decathlon-outdoor.com Bedoin climb and ventouxprovence.fr Chalet Reynard (search summaries).
- [SRCH-SUM] cycling-challenge.com Ventoux detail and 700mhz.cept.org licence register (search summaries).
- [SRCH-VEG] ventouxprovence.fr biosphere page (search summary).
- [MEM-1] road.cc/?p=51577 and [MEM-2] komoot.com/highlight/226327 (search summaries on the memorial).
- Photos in photos/ (manifest.json), each opened: PH-1 Simpson memorial 2011 (granite stele, cyclist, scree); PH-2 Simpson memorial 2009 (gold text, offerings); PH-3 Chalet Reynard hotel-restaurant; PH-4 car park and snack-bar frontage (identity unconfirmed); PH-5 D974 milestone 11 %, 6 km to summit; PH-6 Bedoin start sign with Simpson plaque (309 m, 22 km); PH-7 upper limestone scree (file named Col des Tempetes); PH-8 pine forest road at km 13.8.

## 0. Confidence summary

| Area | Status |
|---|---|
| Route length | 21.19 km projected [ROUTE]; file says 21.41; [WIKI-EN] 21.8 km; [WIKI-FR] 21.6 km. Use 21.19 |
| Start elevation | 309 m [ROUTE]; 309 m on the start sign [PH-6] |
| Summit elevation | 1909 m (sign [PH-6]); 1910 m [WIKI-EN, WIKI-FR]; 1912 m (souvenir marker [not used]); 1899 m (search summary). Route file ends at 1900.3 m, 44 m from the summit node [OSM] |
| Average gradient | Route file 7.4 % overall [ROUTE]; [WIKI-EN] 7.43 %; [WIKI-FR] 7.4-10 % band |
| Steepest band | Route file: km 5-14 at 9-11 %. Steepest 500 m window **10.9 % at km 8.0-8.5**; 500 m windows at km 10.5-11.0 (10.4 %) and 13.0-13.5 (9.9 %) |
| Forest section | [SRCH-ROAD] "forest stretch" about 9.5-10 % to Chalet Reynard. Route file matches (km 5-14.9 at 9-11 %). Forest on OSM only at km 3-7 and sparsely 16-21 (see section 3) |
| Road width, markings | Two-lane asphalt; white edge lines and dashed centre line visible [PH-5, PH-8]. Width: **unknown** in sources. Route-file OSM tags: secondary, 2 lanes on most of the road |
| Km markers | Yellow-topped white milestones: "D 974 / Pente a 11 % / Sommet a 6 Km" [PH-5]. Per-km list **unknown** |
| Tom Simpson memorial | km 19.84, 13 m off line, route ele 1774 m [OSM, ROUTE]. Grey granite stele, gold text [PH-1, PH-2] |
| Chalet Reynard | km 14.95, 27 m off line, route ele 1418 m [OSM, ROUTE]; sources 1417-1420 m. Hotel-restaurant [PH-3] |
| Summit tower height | 50 m [WIKI-EN]; >40 m [WIKI-FR]; 60 m [SRCH-SUM]; 69.0 m licence [SRCH-SUM]. Use **est. 50 m (range 40-69)** |
| Summit tower colour | White and red [WIKI-EN caption]. Red-and-white antenna [SRCH-SUM]. Not seen in any photo in hand |
| Summit tower base building | **unknown** |
| Wind | Mistral 151 days/yr at summit [WIKI-FR]; 90 km/h wind about 240 days/yr [WIKI-EN]; record 320 km/h (19 Nov 1967, wind from the south) [WIKI-FR]; 313 km/h mistral 20 Mar 1967 [WIKI-FR] |
| October temperature | Summit mean max 9.9 C, min 5.2 C (monthly table, search summary) |
| Cars | Road open to cars at Bédoin side; parked cars at Chalet Reynard [PH-3, PH-4, PH-8]. Closures weather-driven [WIKI-EN] |
| Paragliders | **unknown** |
| Vegetation species by altitude | Adret/ubac table [WIKI-FR] plus reforestation list [WIKI-EN]. Exact km of each zone: **est.** |

## 1. Road

- **Start**: Bédoin, route km 0.00, 309 m. Start sign "LE MONT VENTOUX 1909 m", "22 km", "Alt. 309 m" on a stone wall, with a Tom Simpson plaque beside it [PH-6]. The plaque reads "A la memoire du regrette champion cycliste Tom Simpson..." (Mutuelle de la Presse Sportive Marseillaise).
- **Gradient profile** (route file, 500 m bins):
  - km 0.0-5.0: about 3.9 % average (rises 193 m).
  - km 5.0-8.0: 8-10 %.
  - km 8.0-8.5: **10.9 %** (steepest 500 m window).
  - km 8.5-14.0: 9-10 % (rises 800 m over 5.5 km).
  - km 14.0-16.0: 5-7 % (easing toward Chalet Reynard at km 14.95).
  - km 16.0-21.2: 6-10 %, with 9.9 % at km 20.0-20.5.
  - Gentlest 500 m: km 16.0-16.5 at 5.3 %.
  - The file's 100 m peak is not in the source list; 500 m bins are the reliable figure.
- **Milestones**: yellow-topped white stone marker, "D 974", gradient and distance to summit. Sample: "Pente a 11 % / Sommet a 6 Km" [PH-5]. At 6 km to go, route km is 21.19 - 6 = **est. km 15.2**. The sample 11 % does not match the route file at that point (about 7 %), so it is a single snapshot.
- **Surface**: grey asphalt with dark patched cracks [PH-5]. Surface type in OSM: asphalt on all named sections.
- **Lines**: white edge lines, dashed centre line on the upper road [PH-5, PH-8]. Centre stripe on the lower road: **unknown**.
- **Painted names on the road**: **unknown** (not visible in any photo in hand).
- **Barriers**: concrete parapet kerb at the Chalet Reynard car park [PH-4]; red-and-white guide posts on the forest edge [PH-8]; stone kerb with rubble below the milestone [PH-5]. Guard rails: OSM shows guard rail at km 16.5 (one feature); wall barriers at km 18.5-21.5 (about 14 features) [OSM].
- **Snow poles**: red posts at the road edge (km 13.8) [PH-8]. Snow fences: OSM shows 2 man_made=snow_fence at km 15.5-16.0.
- **Hairpins**: **unknown** (no source counts them). The upper section is mostly long straights and bends, not repeated hairpins.
- **Cars and cyclists**: car park and parked cars at Chalet Reynard [PH-4]; cyclists on the climb [PH-5, PH-6]; motorbikes at the summit car park [PH-4].
- **Route end**: km **21.19**, 1900 m. 44 m from the summit node [OSM "Mont Ventoux" peak, 44.17397 N 5.27840 E]. The route ends at the summit car park and café complex [OSM names: Mont Ventoux guidepost and board, Belvedere de Provence viewpoint at km 20.85, 9 m off line]. What the route end physically is: **unknown beyond the OSM names**.

## 2. Landmarks

### 2.1 Saint-Estève
- Route km **5.47**, 159 m off line, route ele 542 m [OSM "Saint-Estève" guidepost, bus stop]. Sources: "until Saint-Estève: 3.9 % over 5.8 km" [WIKI-EN]. Est. km 5.5-5.8.
- Look: village or hamlet at a road junction, not a hairpin. Buildings and look: **unknown**.

### 2.2 Forest start and end
- Forest start: **est. km 5.0** (OSM forest/mixed landuse at km 5.0-6.0, sources: forest begins above Saint-Estève).
- Forest end: sources say "After the chalet, the forest is gone" [SRCH-ROAD]. OSM forest shows only sparse features to km 7, then none to km 14. Est. forest end **km 14.9** (Chalet Reynard).
- Photo [PH-8] at km 13.8 shows pine forest on both sides. This supports the forest reaching at least km 13.8.

### 2.3 Chalet Reynard
- Route km **14.95**, 27 m off line, route ele **1418 m** [OSM, ROUTE]. Sources 1417-1420 m [SRCH-ROAD, WIKI-EN].
- What it is: hotel-restaurant, snack bar and shop at the junction where the Bédoin road meets the road from Sault [WIKI-FR]. Also a ski/tow station (two ski stations: Chalet Reynard and Mont Serein) [WIKI-EN].
- Look [PH-3]: white two-storey hotel-restaurant, brown tiled roof edge, "CHALET REYNARD" sign, large terrace with striped awnings and parked cars. Behind it, a pale rocky slope with dark dwarf pines and a wooden hut "Station Chalet Reynard" with a tow pylon.
- The 2016 Tour stage finished near the chalet at 1435 m [WIKI-EN].

### 2.4 Other OSM points on the upper road (within 100 m)
- Plaine des Hermitants (km 15.43), Vallon de la Grave (km 15.68), Fréchière (km 16.86, 218 m off), Tête de la Grave peak (km 17.11, 213 m off).

### 2.5 Tom Simpson memorial
- Route km **19.84**, 13 m off line, route ele **1774 m** [OSM "Mémorial de Tom Simpson" node 1334315594 at 44.16971 N, 5.28618 E]. About 1.35 km from the route end [ROUTE].
- Distance from summit: [MEM-1] about 1 km below summit ("1km before the summit"); [MEM-2] 1.5 km. Route file: 1.35 km.
- Look [PH-1, PH-2]:
  - Grey granite stele (not white), roughly rounded top, carved cyclist silhouette, gold lettering "A la memoire de Tom Simpson" on the front.
  - Concrete plinth with steps (steps added at the 40th anniversary per [MEM-1]); offerings on the plinth: plastic bottles, flowers, stones, small plaques.
  - Behind it: pale grey limestone scree with sparse grass tufts. Blue sky.
- Stone: granite per [MEM-1], marble per [MEM-2]. Both grey.
- Unveiled 1968 (wife Helen) [MEM-1]. Blown over 2013 [MEM-1]. Plaque reads "There is no mountain too high" [MEM-1].
- Nearby OSM: Monument Brugge (km 20.46, 12 m off), Kraemer memorial (km 19.93, 11 m off), Mémorial Pierre Kraemer and plaque Marius Bastidon (km 19.8-20.0).

### 2.6 Summit tower (Émetteur du Mont-Ventoux)
- Position: OSM summit features at km 21.15-21.19, 18-68 m off. OSM lattice mast (height 13 m, communication) at 44.17377 N, 5.27867 E, km 21.15, 18 m off. The main tower is **not identified separately in OSM**. Est. the main tower is within 50 m of the summit node.
- Height: **est. 50 m** (range 40-69 m). Sources: 50 m [WIKI-EN], "more than 40 m" [WIKI-FR], 60 m [SRCH-SUM], 69.0 m licence height [SRCH-SUM].
- Built 1966-1968: "tour d'observation" with TDF antenna [WIKI-FR]; meteorological building 1968 [SRCH-SUM]; an earlier met station on the summit in 1882 [WIKI-EN].
- Colour: white and red [WIKI-EN caption]. Antenna: red-and-white banded mast with an antenna on top [SRCH-SUM]. Not confirmed in a photo in hand.
- Base building: **unknown**.
- Chapelle Sainte-Croix: km 20.97, 131 m off, 1884 m [OSM]. 15th-century chapel [WIKI-EN].

## 3. Vegetation, by route km and altitude

Species zones from [WIKI-FR] (both slopes):

| Altitude (m) | Zone (adret, south) | Zone (ubac, north) |
|---|---|---|
| 300-430 | Aleppo pine | Holm oak to 620 |
| 480-540 | Holm oak | Walnut 620-800 |
| to 1150 | Garrigue, true lavender | Garrigue 800-910 |
| 1130-1660 | Beech | Beech 910-1380 |
| 1480-1650 | Black pine (pin a crochets) | Black pine to 1720 |
| above 1810 | Alpine sector | Alpine sector |

Reforestation (since 1860) uses holm oak, beech, Atlas cedar, larch [WIKI-EN, WIKI-FR]. Junipers common just above the forest [WIKI-EN]. Cedar stand at Bédoin side 800-1000 m [SRCH-VEG]. The top is bare limestone, no trees [WIKI-EN].

Route-km view (OSM land use within 420 m, and sources; est. where stated):

| Route km | Altitude (m, route) | Vegetation | Basis |
|---|---|---|---|
| 0.0-2.5 | 309-378 | Vineyards (about 45 features at km 2), orchards, tree rows, hedges; then Bédoin town | OSM |
| 2.5-4.0 | 378-450 | Vineyards and orchards, first forest patches (km 3.0-3.5) | OSM |
| 4.5-5.5 | 450-540 | Wood (natural=wood), mixed forest; first forest on the line | OSM, est. start km 5.0 |
| 5.5-7.5 | 540-730 | Forest (mixed, needleleaved), pine and beech | OSM, WIKI-FR |
| 7.5-14.0 | 730-1380 | Pine and oak forest (sources); OSM sparse, so the detail is **est.** | SRCH-ROAD, PH-8 |
| 14.0-15.5 | 1380-1460 | Dwarf pines, junipers, scrub on scree, car park | PH-3, PH-4 |
| 15.5-18.5 | 1460-1600 | Grass and dwarf pines on the slope, with limestone scree | OSM (needle forest at 16.2), PH-7 (scree) |
| 18.5-21.19 | 1600-1900 | Bare limestone and scree, grass tufts, bare rock | OSM (bare_rock at km 21), WIKI-EN, PH-1, PH-2 |

Summit zone: calcareous scree (lauzes) with alpine-affinity flora; a biosphere reserve with rare species [SRCH-VEG, WIKI-FR]. Species names on the upper road: **unknown**.

Photos: [PH-8] shows tall pines and bare broadleaf trees (oak/beech type) beside the road at km 13.8. [PH-3] shows dark dwarf pines on scree at km 15. [PH-1] and [PH-2] show sparse grass tufts on scree at km 19.8.

## 4. Rock and scree
- Upper slopes (km 15-21): **white to pale grey limestone**, loose angular stones (scree). Outcrops and rubble at the roadside [PH-3, PH-7, PH-1].
- Scree colour in sun: near white; in shade: grey-blue. [PH-7] shows angular white stones and sparse dry grass.
- Stone size: loose pebble-to-fist-size, sharp-edged, not rounded river stone.
- Plants on scree: sparse tufts of dry grass and low shrubs, about 5-10 % cover [PH-1, PH-2, PH-7] (est.).
- Summit: bare calcareous rock and stones, no trees [WIKI-EN].

## 5. Bédoin village and start
- OSM names: Place de la Bourgade, Rue des Boeufs, Rue du Couvert, Rue des Barottes, Place du Portail Catheron. Many footways and steps with sett and paving-stone surfaces (cobbles). Church Saint-Pierre (km 0.0, 160 m off line). Lavoir, Chemin de la Tour, Rue du Castelan.
- Architecture style: **unknown from sources**. Est. stone-built Provence village, given the paving and narrow lanes.
- Vineyards and cherry/apricot orchards on the lower slopes: OSM vineyard features near km 0-4 (11-45 per bin). Cherry: **unknown** (OSM tags orchard only).

## 6. Life
- Cars: many on the Bédoin side. Parked cars at Chalet Reynard and at the summit car park [PH-3, PH-4, PH-8].
- Cyclists: many on the climb [PH-3, PH-6, PH-8]; memorial visited by cyclists who leave water bottles and tokens [MEM-2].
- Motorbikes: motorbikes at the summit car park [PH-4].
- Sheep and cattle: sheep grazing near the pines above Chalet Reynard (ram photo, Commons "Mont Ventoux par Bedoin, vers 1700 metres", not used in the manifest; see open issue 5) [Commons search].
- Hikers: the "Ventoux" walking trails at Chalet Reynard and the crest [SRCH-ROAD].
- Paragliders: **unknown**.

## 7. Light and wind
- Sun direction and time: **unknown** in sources.
- Photos: bright clear blue sky at Chalet Reynard and on the scree [PH-1, PH-3, PH-5]. Strong hard shadows from the pines at km 13.8 [PH-8]. Cloud over the summit on [PH-4] (overcast, not October).
- Wind: mistral about 151 days/yr at the summit [WIKI-FR]; winds of about 90 km/h on about 240 days/yr [WIKI-EN]. Record gusts 313 km/h (mistral, 20 Mar 1967) and 320 km/h (south wind, 19 Nov 1967) [WIKI-FR].
- Closures: the road is "often closed due to high winds", especially at the Col des Tempetes just before the summit [WIKI-EN]. No October schedule found.
- October summit temperature: mean max 9.9 C, min 5.2 C [search summary] (est. wind chill strong).

## 8. OSM inventory within 100 m, by route km

Counts of key-tagged features within 100 m of the line, from the 2 km bins in [OSM] (not all features).

| km | Main features (count) |
|---|---|
| 0.0-0.5 | building=yes 273; secondary road 15; service road 16; residential 13; natural=tree 12; footway 10; tourism=information 2 |
| 0.5-1.5 | building 39; vineyard 27; orchard 4; tree rows 6; secondary road 6 |
| 1.5-2.5 | vineyard 13; orchard 3; building 18; hedge 2; bus stop 1 |
| 2.5-3.0 | building 30; vineyard 7; tertiary 3; bus stops 2 |
| 3.0-4.0 | vineyard 7; orchard 4; forest 1; building 7; scrub 1 |
| 4.0-5.0 | vineyard 5; orchard 3; wood 2; grassland 1 |
| 5.0-6.0 | building 14; vineyard 2; track 3; forest 1; bus stop 1 |
| 6.0-7.5 | path 1; secondary road 1; forest 1; building 1 |
| 7.5-8.5 | path 6; service 3; tourism=information 2; secondary 2; building 2 |
| 8.5-10.0 | track 2; path 1; building 2; secondary 1 |
| 10.5-12.5 | tourism=information 3; track 5; path 2; ruins 1; secondary 2 |
| 12.5-14.0 | track 4; path 1; building 4 |
| 14.0-15.0 | building 74; track 5; secondary 9; service 4; path 3; memorial 1 (Pierre de Champeville, km 14.94); tourism=information 1; retaining wall 1 |
| 15.0-16.0 | track 5; building 8; tourism=information 3; snow_fence 2; path 3; wall 1 |
| 16.0-17.5 | retaining wall 1; guard_rail 1; building 1; secondary 1 |
| 17.5-19.5 | wall 4; path 1; secondary 1; memorial 2 (Simpson, Kraemer, km 19.84-19.93) |
| 19.5-20.5 | memorial 3 (Brugge, Simpson, Kraemer); peak 1; wall 2; tourism=information 1 |
| 20.5-21.0 | path 5; secondary 3; scree 2; wall 2; viewpoint 1 (Belvedere des Alpes, km 20.61, 137 m off); turning circle 1 |
| 21.0-21.5 | building 15; retaining wall 12; path 8; footway 8; bare_rock 5; steps 5; service 4; pedestrian 4 |

Not in the dump within 100 m: car park polygons (none tagged), toll (none), lift stations (none tagged by name).

## 9. Look-target recap for the scene
1. **Road**: asphalt, 2 lanes, white edge lines, dashed centre on the upper section. Yellow-topped white D974 milestones with gradient and distance to summit.
2. **Forest**: pines and bare broadleaf trees beside the road, roughly km 5 to 14.9. Steepest band km 8-8.5 (10.9 %) and km 9-14 at 9-10 %.
3. **Chalet Reynard** (km 14.95, 1418 m): white two-storey hotel-restaurant, brown roof edge, terrace with striped awnings, cars, behind it a pale scree slope with dark pines and a wooden ski-tow hut.
4. **Upper slopes** (km 15-21): pale limestone scree, sparse grass tufts, dark dwarf pines below km 17.
5. **Simpson memorial** (km 19.84, 1774 m): grey granite stele with carved cyclist and gold text, concrete plinth and steps, offerings. Scree behind.
6. **Summit** (km 21.15-21.19, 1900 m): white-and-red mast or tower (est. 50 m), bare limestone, car park and café. Chapelle Sainte-Croix 131 m off.

## 10. Open issues
1. Summit tower height: 50 m [WIKI-EN], >40 m [WIKI-FR], 60 m and 69 m [SRCH-SUM]. No tower photo in hand; est. 50 m.
2. Summit elevation: 1909 m (signs) vs 1910 m (Wikipedias). Route file ends at 1900.3 m, 44 m short of the peak node. Scene uses 1900 m.
3. Forest extent: OSM shows forest only at km 3-7 and 16-21; sources and PH-8 show forest to about km 14.9. Est. km 5-14.9 used.
4. Milestone: PH-5 (11 %, 6 km to go, est. km 15.2) disagrees with the route file (about 7 %). One sign only.
5. Missing: summit tower photo, Bedoin street, hairpin count, Saint-Estève look, road names painted on the surface, road width.
6. Mislabelled files: PH-7 (file "Col des Tempetes") shows scree; PH-5 (file "terrace") shows a milestone. Described by content.
7. PH-4 identity (Chalet Reynard or summit complex) not confirmed. Route end is the summit car park and cafe per OSM names only.
8. No October closure schedule found; closures are wind-driven [WIKI-EN].

Scripts (not in WT): scratchpad/research-scripts/ventoux/project.py, points.py, fetch_photos.py.
