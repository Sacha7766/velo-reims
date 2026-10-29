# Champagne around Reims: visual reference for the Reims loops

Scope: `reims-grand-tour`, `mont-de-berru`, `vallee-de-la-suippe` and `plaine-de-betheny` (public/routes), 17 villages
between Bétheny, the Suippe valley and the Mont de Berru (Marne); and two loops added on 2026-10-29,
`massif-de-saint-thierry` (the vineyard hills north-west of Reims, from Courcy) and `suippe-amont` (the plateau and
the upper Suippe from Warmeriville to Bétheniville), whose landmarks are in their briefs. Anything no source shows is **unknown**; estimates
are **est.**. Route km are along each route file.

## Source key

- [ROUTE] public/routes/<id>.json (BRouter, elevations from its DEM).
- [OSM] BBBike extract of 2026-10-29 (3.89–4.41 E, 49.23–49.44 N), baked into public/osm/<id>.json.
- [IGN] BD ORTHO tiles (data.geopf.fr), looked at around Nogent-l'Abbesse. The Marne mosaic around the Mont de Berru
  was flown on 28 April, 29 April and 9 May 2025 at 20 cm (IGN mosaic graph, WFS layer
  `ORTHOIMAGERY.ORTHOPHOTOS.GRAPHE-MOSAIQUAGE:graphe_bdortho`): the photo shows the plain in spring.
- [RPG] Registre Parcellaire Graphique, latest campaign (IGN / ASP, Licence Ouverte 2.0), WFS layer
  `RPG.LATEST:parcelles_graphiques`, baked by `scripts/bake-fields.mjs` into `public/fields/<id>.json`: each
  declared parcel's outline and crop code.
- [PNX-n] Panoramax 360° photos, cut to a forward view along the route (`streetlevel/`, manifest.json holds the
  links). All by **atchisson**, 2025-08-26, CC BY-SA 4.0:

| Ref | File | Route km | Panoramax id |
|---|---|---|---|
| PNX-1 | plaine-de-betheny-km02.00-2861bbf9-avant.jpg | Bétheny loop 2.0 | 2861bbf9-33f2-4bac-aea1-41acebce5d11 |
| PNX-2 | plaine-de-betheny-km03.00-1cefcded-avant.jpg | Bétheny loop 3.0 | 1cefcded-f1c0-4211-83a3-faa4bbd26cf4 |
| PNX-3 | plaine-de-betheny-km04.00-daa40742-avant.jpg | Bétheny loop 4.0 | daa40742-6ca8-4158-8a03-de2bc22a4b22 |
| PNX-4 | plaine-de-betheny-km05.00-2aa643ee-avant.jpg | Bétheny loop 5.0 | 2aa643ee-8662-4d43-b942-dee9f09c812d |
| PNX-5 | plaine-de-betheny-km06.00-31a9ef82-avant.jpg | Bétheny loop 6.0 | 31a9ef82-72dd-471d-b9d0-5637436fef47 |
| PNX-6 | reims-grand-tour-km34.00-6fa11a8b-avant.jpg | grand tour 34.0 (Bazancourt) | 6fa11a8b-60ac-4646-8299-18c1b111b231 |
| PNX-7 | reims-grand-tour-km36.00-71b01cc7-avant.jpg | grand tour 36.0 | 71b01cc7-44af-4cf3-9d1c-a03d1aacdf69 |
| PNX-8 | reims-grand-tour-km37.00-9bf27e05-avant.jpg | grand tour 37.0 (roundabout in open country) | 9bf27e05-c62a-4d5c-8eb0-b885d799396a |
| PNX-9 | reims-grand-tour-km38.00-5a1e7783-avant.jpg | grand tour 38.0 | 5a1e7783-096a-4a33-a5c2-d5408cfc3bd8 |
| PNX-10 | reims-grand-tour-km39.00-f98e078f-avant.jpg | grand tour 39.0 | f98e078f-8500-4559-8c0d-20a46b952fbc |
| PNX-11 | vallee-de-la-suippe-km24.00-5860b245-avant.jpg | Suippe loop 24.0 (Bazancourt, west end) | 5860b245-044d-48c6-90e6-d6fc6f0203fe |
| PNX-12 | vallee-de-la-suippe-km25.00-b96752e3-avant.jpg | Suippe loop 25.0 (Boult-sur-Suippe) | b96752e3-087a-42e7-917d-510d999ff2dc |
| PNX-13 | vallee-de-la-suippe-km26.00-a85e6d8d-avant.jpg | Suippe loop 26.0 | a85e6d8d-73a6-492a-98b3-5a5459cceac1 |

- [CMN-n] Wikimedia Commons photos in `photos/` (manifest.json has page, licence and author of each): Garitan
  (CC BY-SA 3.0, 2012: the mairies, churches and war memorials of Berru, Caurel, Lavannes and Witry), Lucas
  Tabary-Maujean (CC BY-SA 4.0, 2024: Berru church and vines), Tournasol7 (CC BY-SA 4.0, 2021: Saint-Rémi at
  Bazancourt), Florian Pépellin (CC BY-SA 4.0, 2024: Bazancourt station) and an anonymous author (CC BY-SA 4.0, 2024:
  book boxes in Berru and Witry). The download stopped on the shared address's rate limit after 22 files.

Coverage: Panoramax has 2,573 photos in the area, but on the Mont de Berru loop only 7, all at km 30 (Witry).
The Suippe valley (Warmeriville to Fresne) and the Bétheny–Fresne road are well covered. Wikimedia Commons photos
per village go to `photos/` (manifest.json) as the rate limit on the shared build address allows.

## Confidence summary

| Area | Status |
|---|---|
| Relief | Very flat plain, 70–140 m [ROUTE]; the Mont de Berru is the one hill (route top 200.8 m on its flank) |
| Fields | Huge open parcels, horizon far and straight [PNX-1..5, 7, 9, 10, 13]. Late August: pale beige stubble and bare chalky soil, dark green sugar beet, tall green maize [PNX-3, 7, 10] |
| Rural road | Two lanes, est. 5–6 m, mid-grey asphalt with patches, white dashed centre line, no edge lines, grass to the asphalt edge [PNX-1, 3, 4, 5, 7, 9, 10] |
| Village street | Curbs, pavements, painted bays, raised crossings, street lamps on tall poles, overhead wires [PNX-6, 11, 12] |
| Houses | Two storeys, cream or beige render or pale stone, red-brown tile roofs, some dark grey roofs, red brick gate pillars [PNX-6, 12] |
| Trees | Few in the plain; copses as dark islands on the horizon; a row of round-crowned broadleaf trees at a junction [PNX-1, 2, 3, 5]. Species **unknown** |
| Road furniture | White delineator post with a red band [PNX-10]; blue round mandatory sign at a roundabout [PNX-8]. Km markers and village signs **unknown** (not in any frame) |
| Season of the photos | 2025-08-26, after the cereal harvest |

## Road

- Minor roads between villages: two lanes, no shoulder, no ditch in view, no barrier; the grass verge runs to the
  asphalt; the asphalt is mid-grey, lighter where patched [PNX-1, 3, 4, 5].
- Centre line: white dashes with long gaps [PNX-3, 4, 5, 7, 9, 10]; continuous lines on one stretch [PNX-2].
  Dash and gap lengths: **unknown** (est. 3 m dash, 10 m gap, the usual French rural T1 pattern).
- Field tracks join at right angles, chalky white gravel [PNX-3, 5, 13].
- Roundabout: white edge line, curbs, blue round "keep right" sign, white direction signs on posts [PNX-8].
- Delineator: white post with a red band on the verge [PNX-10].
- Village streets: curbs and pavements, painted parking bays, raised zebra crossing [PNX-11]; tall street lamps
  with a curved arm [PNX-6]; overhead wires on poles [PNX-12]; a red fire hydrant [PNX-11].

## Ground and fields

- Stubble and bare soil: pale beige to light grey-brown, chalk showing through [PNX-1, 2, 9, 13].
- Sugar beet: low, dark green [PNX-7, 10]; maize: tall, mid green [PNX-3].
- Verges: green grass with tall dry grass at the field edge [PNX-4, 10].
- Exact hex values: **unknown** until sampled from the frames.
- Crops around the Mont de Berru loop, by area of the parcels within 1.1 km [RPG]: winter wheat 33 %, sugar beet
  21 %, winter barley 14 %, spring barley 10 %, alfalfa 9 %, winter rape 7 %; vines 1 % of the area but 500 small
  parcels on the hill's flanks; fallow, potatoes, hemp, maize each under 1 %. At the end of August the cereals
  and rape are harvested (stubble, disced or greening again), beet still stands dark green until its harvest
  from mid-September, alfalfa grows back between cuts.

## Buildings

- Bazancourt [PNX-6]: two-storey houses, pale stone or render, red brick gate pillars with a white gate, low walls
  with metal railings.
- Bazancourt, west end [PNX-11]: a long workshop with a sawtooth roof behind a lawn and trees, a raised crossing.
- Boult-sur-Suippe [PNX-12]: beige rendered houses, red-brown tile roofs with a low pitch, a garage with a white door.
- Never in this region: Alpine timber balconies, log stacks, Salzburg farmhouses, spruce (all seen in the current
  Alpine fallback).

## Landmarks on the Mont de Berru loop [OSM]

| km | What | Distance, side |
|---|---|---|
| 0.6 | Witry-lès-Reims: schools, mairie (Église Saint-Symphorien 369 m left) | 58–94 m left |
| 3.2 | water tower | 239 m right |
| 3.4 | Caurel: Église Saint-Basle, mairie, war memorial | 89–115 m left |
| 5.0 | Lavannes: Église Saint-Lambert, mairie, Commonwealth WWII graves | 227–280 m left |
| 11.0 | Époye: Église Saint-Pierre, mairie, restaurant Au Soleil d'Or | 14–42 m right |
| 16.0 | Beine-Nauroy: Église Saint-Laurent, war memorial, mairie | 13–37 m left |
| 16.4 | Observatoire de Beine-Nauroy (tower) | 301 m right |
| 19.5 | battlefield (historic) | 285 m right |
| 20.7 | Nogent-l'Abbesse: hôtel de ville, war memorial, Église Saint-Pierre | 16–55 m left |
| 23.8 | Berru: Église Saint-Martin, mairie, war memorial | 13–16 m left |
| 25.9 | restaurant L'Ermitage, near the route top (200 m) | 62 m right |
| 26.4 | Croix des Aviateurs (wayside cross) | 334 m left |
| 28.1 | Cernay-lès-Reims: mairie, war memorial, Église Saint-Martin | 11–41 m |
| 30.5 | Witry: Carrefour fuel station | 39 m left |

Churches and public buildings [CMN]: Saint-Martin at Berru is warm grey-beige rubble under slate, a square tower
with a slate pyramid spire and round-headed windows; Saint-Lambert at Lavannes is pale limestone with two slate spires
and a brown tile nave roof; the Witry church is pale stone under a slate spire. The mairies are pale dressed or
rock-faced stone with slate (Berru, Witry: mansards) or dark brown tile roofs (Caurel), white roller shutters, and at
Lavannes red brick window surrounds on the stone and oxblood shutters.
