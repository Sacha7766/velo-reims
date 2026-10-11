# Route presets

Baked by `node scripts/bake-routes.mjs [id|--all]` from BRouter (OSM routing, `fastbike` unless noted). Elevation comes from BRouter's SRTM data; `hm` is BRouter's filtered ascent. `category` is `climb | rolling | flat | city`; climbs are trimmed at their highest point, loops end exactly at their start.

| id | name | category | km | hm | loop | source notes |
| --- | --- | --- | ---: | ---: | --- | --- |
| grossglockner | Großglockner Hochalpenstraße | climb | 26.58 | 1860 | no | one via point |
| gaisberg | Gaisberg | climb | 10.03 | 704 | no | |
| kitzbueheler-horn | Kitzbüheler Horn | climb | 11.05 | 923 | no | |
| alpe-dhuez | Alpe d'Huez | climb | 14.90 | 1135 | no | |
| stelvio | Passo dello Stelvio | climb | 25.32 | 1855 | no | |
| ventoux | Mont Ventoux (Bédoin) | climb | 21.41 | 1589 | no | |
| wachau | Wachau | flat | 38.94 | 71 | no | Melk, Danube bridge to Emmersdorf, B3 on the north bank via Spitz, Weißenkirchen (B3 climbs inland over Wösendorf/Joching hill) and Dürnstein, to Krems |
| neusiedler-see | Neusiedler See | flat | 25.75 | 4 | no | `trekking` profile. Weiden am See, Podersdorf, Illmitz, Apetlon on lakeside and Seewinkel cycle paths |
| wolfgangsee | Wolfgangsee | rolling | 18.31 | 104 | no | St. Gilgen, B158 to Strobl, then the east shore to St. Wolfgang. No road link back along the north shore, so one-way |
| formentor | Cap de Formentor | rolling | 19.40 | 556 | no | Port de Pollença to the lighthouse on Ma-2210 (Mirador es Colomer at ~5.4 km); the hairpin at the very end is the lighthouse turnaround |
| sa-calobra | Sa Calobra | climb | 9.69 | 686 | no | Port road end to the Ma-2141/Ma-10 junction at Coll dels Reis; includes the "knot" (an `underpasses` entry), and a false ramp at 2.7 km is a `cuts` span |
| central-park | Central Park Loop | city | 9.89 | 55 | yes | Counter-clockwise: East Drive north, around Harlem Meer, West Drive south, Center Drive east. Start at 72nd St / East Drive |
| sydney | Sydney Coast & Park | city | 17.66 | 228 | yes | Bondi Beach, Tamarama, Bronte, Clovelly, Coogee, Randwick, through Centennial Park, Oxford St back to Bondi. Roads only, no steps |
| vienna-ring | Wiener Ringstraße | city | 5.88 | 16 | yes | Clockwise from Stubenring over Parkring, Kärntner Ring, Opernring, Burgring, Universitätsring, Schottenring and Franz-Josefs-Kai |

Notes: the six climbs and their numbers were not re-fetched, only `category`/`loop` were added. Do not put via points on side streets or footways next to the road; BRouter turns them into out-and-back spurs.

Hand-added fields (not from the bake): `underpasses` lists where the road passes under itself, as `[lon, lat]` near the crossing, the clearance and the bridge model. The earlier pass goes under: the route finds the crossing, drops the lower pass, and builds a short underpass with the model as its bore (`route.ts`, `Tunnel.ts`). `cuts` are spans in metres where the DEM is the rock above a road cutting rather than the road; the profile takes its lower hull there, as it does across every tunnel.
