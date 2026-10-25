// Builds docs/world/island.html: the Serpentine Island plan with the relief map, new roads, loops, later
// highlights and build order. Run layout.mjs and relief.py first (docs/world/README.md).
import fs from 'node:fs';
import { join } from 'node:path';
import { M, OUT } from './geometry.mjs';
const HERE = new URL('.', import.meta.url).pathname;
const relief = fs.readFileSync(join(OUT, 'relief.jpg')).toString('base64');
const U = 10, Y1 = 76;
const X = (x) => +(x * U).toFixed(1), Y = (y) => +((Y1 - y) * U).toFixed(1);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const n = (v) => v.toLocaleString('en-US');
const sign = (v) => (v > 0 ? '+' : v < 0 ? '−' : '±') + n(Math.abs(v));

// label spots in world km: [x, y, anchor]
const ROUTE_LABEL = {
  'sa-calobra': [15.9, 66.4, 'end'], formentor: [33.2, 70.6, 'middle'], wolfgangsee: [18.6, 53.4, 'middle'], gaisberg: [29.7, 57.9, 'start'],
  grossglockner: [28.8, 45.2, 'end'], 'kitzbueheler-horn': [41.2, 51.4, 'start'], stelvio: [42.9, 35.6, 'start'], 'alpe-dhuez': [43.1, 28.4, 'start'],
  ventoux: [27.4, 18.0, 'middle'], wachau: [51.4, 33.2, 'start'], 'vienna-ring': [71.1, 39.6, 'middle'], 'central-park': [72.6, 50.6, 'end'],
  sydney: [81.4, 41.3, 'start'], 'neusiedler-see': [77.6, 25.0, 'start'],
};
const SHORT = { grossglockner: 'Großglockner', stelvio: 'Stelvio', ventoux: 'Mont Ventoux', formentor: 'Cap de Formentor', 'vienna-ring': 'Wiener Ring', sydney: 'Sydney', 'central-park': 'Central Park' };
const SUMMIT_LABEL = {
  'Coll dels Reis': [0.8, -0.2, 'start', true], Gaisberg: [0.8, -0.9, 'start', false], Hochtor: [-0.9, -0.5, 'end', true],
  'Kitzbüheler Horn': [0.8, -0.6, 'start', false], 'Passo dello Stelvio': [0, -1.5, 'middle', false], "Alpe d'Huez": [0.8, 0.3, 'start', false], 'Mont Ventoux': [0, 0.9, 'middle', false],
};
const TOWN_LABEL = {
  'Port de Pollença': [-0.5, -1.0, 'end'], 'St. Gilgen': [-0.8, 0.1, 'end'], Strobl: [0.7, -0.7, 'start'], Fusch: [0.8, 0.4, 'start'], 'Kitzbühel': [-0.7, -0.9, 'end'],
  Prato: [0.8, 0.0, 'start'], "Bourg-d'Oisans": [-0.8, -0.7, 'end'], 'Bédoin': [-0.8, -0.5, 'end'], 'Chalet Reynard': [0.8, -0.5, 'start'], Melk: [-0.8, -0.8, 'end'],
  Spitz: [0.8, -0.9, 'start'], Krems: [0, -1.4, 'middle'], Weiden: [0.8, 0.2, 'start'],
};
const REGIONS = [
  ['Tramuntana coast', 24, 73.4], ['Lake country', 17.5, 48.6], ['The High Alps', 37.0, 41.7], ['Provence', 19.4, 24.6],
  ['Danube valley', 57.5, 31.2], ['The City', 76.2, 53.4],
];

const routeLines = M.routes.map((r) => `<g class="route" data-tip="${esc(`<b>${r.name}</b><span>Real road · ${r.km} km · ${n(r.gain)} m climbing</span>`)}"><path class="case" d="${r.d}"/><path class="line" d="${r.d}"/></g>`).join('');
const newRoads = M.roads.map((r) => `<g class="newroad" data-tip="${esc(`<b>${r.name}</b><span>New road · ≈${r.km} km · ${sign(r.dh)} m · ${r.grade} %</span>`)}"><path class="hit" d="${r.d}"/><path class="dash" d="${r.d}"/></g>`).join('');
const loopLayers = M.loops.map((l) => `<g class="loop" data-loop="${l.id}">${l.d.map((d) => `<path d="${d}"/>`).join('')}</g>`).join('');
const label = (x, y, anchor, text, cls) => `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}">${text}</text>`;
const routeLabels = M.routes.map((r) => { const [x, y, a] = ROUTE_LABEL[r.id]; return label(X(x), Y(y), a, esc(SHORT[r.id] ?? r.name), 'rlabel'); }).join('');
const summits = M.summits.map((s) => {
  const [dx, dy, a, named] = SUMMIT_LABEL[s.name];
  return `<path class="peak" d="M${s.x},${s.y - 5}l4.6,8h-9.2z"/>` + label(+(s.x + dx * U).toFixed(1), +(s.y - dy * U + 3).toFixed(1), a, `${named ? esc(s.name) + ' ' : ''}${n(s.ele)} m`, 'slabel');
}).join('');
const towns = M.towns.filter((t) => TOWN_LABEL[t.name]).map((t) => {
  const [dx, dy, a] = TOWN_LABEL[t.name];
  return `<circle class="town" cx="${t.x}" cy="${t.y}" r="2.6"/>` + label(+(t.x + dx * U).toFixed(1), +(t.y - dy * U + 3).toFixed(1), a, esc(t.name), 'tlabel');
}).join('');
const regions = REGIONS.map(([t, x, y]) => label(X(x), Y(y), 'middle', esc(t), 'region')).join('');
const water = label(X(15.5), Y(39), 'middle', 'The Fjord', 'water') + label(X(58.2), Y(42.6), 'middle', 'Danube', 'water small') + label(X(60), Y(20.6), 'middle', 'Open country', 'region dim open-label') + label(X(60), Y(19.2), 'middle', 'room for new routes', 'tlabel dim open-label');
// famous places to add later: where they would go on the island (world km), drawn faded
const LATER = [
  { name: 'Galibier', shape: 'peak', x: 37.6, y: 21.4, lab: [0, -1.5, 'middle'], first: true, why: 'Tour de France icon, 2,642 m', fit: "A real neighbour of Alpe d'Huez: Bourg-d'Oisans, Col du Lautaret, Galibier", needs: 'Nothing new' },
  { name: 'Gavia · Mortirolo', shape: 'peak', x: 33.4, y: 29.4, lab: [-0.8, -0.4, 'end'], why: "The Giro's toughest pair; the Mortirolo is about 10 % for 12 km", fit: 'Real neighbours on the far side of the Stelvio, around Bormio', needs: 'Nothing new' },
  { name: 'Tremola', shape: 'peak', x: 35.8, y: 38.8, lab: [0, -1.5, 'middle'], why: 'Cobbled hairpins on the old Gotthard road', fit: 'Across the snowy core of the High Alps', needs: 'Cobbles' },
  { name: 'Sella Ronda', shape: 'loop', x: 52.6, y: 46.8, r: 3, lab: [0, -0.3, 'middle'], first: true, why: 'Four Dolomite passes in one loop of about 55 km', fit: 'The empty land northeast of the Alps, off the valley road at Prato', needs: 'Dolomite rock and pasture art' },
  { name: 'Zoncolan', shape: 'peak', x: 58.4, y: 47.4, lab: [0, -1.5, 'middle'], why: 'About 10 km at 12 %, one of the steepest Giro finishes', fit: 'Next to the Dolomites, as in reality', needs: 'Nothing new' },
  { name: 'Ötztal · Timmelsjoch', shape: 'peak', x: 41.5, y: 55.6, lab: [0, -1.5, 'middle'], why: 'Kühtai and the Timmelsjoch (2,509 m) of the Ötztaler Radmarathon', fit: 'Tyrol, north of Kitzbühel', needs: 'Nothing new' },
  { name: 'Ghisallo', shape: 'peak', x: 9.4, y: 55.6, lab: [0, -1.5, 'middle'], why: "The cyclists' chapel above Lake Como, on the route of Il Lombardia", fit: 'Lake country, west of St. Gilgen', needs: 'Nothing new' },
  { name: 'Trollstigen', shape: 'peak', x: 26.6, y: 41.4, lab: [-0.8, -0.4, 'end'], first: true, why: '11 hairpins past a waterfall', fit: 'At the head of the fjord, climbing to the Großglockner road', needs: 'Nordic landscape art, a waterfall' },
  { name: 'Atlantic Road', shape: 'coast', pts: [[10, 50.2], [7.6, 47.8], [6.2, 45], [5.4, 42]], lab: [7.4, 40.6, 'middle'], first: true, why: '8 km of bridges hopping from island to island over the sea', fit: 'Across the mouth of the fjord', needs: 'Bridges over water' },
  { name: 'Teide', shape: 'island', x: 40.5, y: 9.8, r: 3.2, lab: [0, -1.9, 'middle'], why: "From the sea to over 2,000 m, where the pros hold training camps", fit: 'Its own volcano island off the south coast, reached by a bridge', needs: 'Volcano landscape, a bridge' },
  { name: 'Riviera', shape: 'coast', pts: [[14.6, 25.5], [15.6, 21.2], [17.8, 18.6], [21.5, 16.9], [26, 16.1]], lab: [13.4, 22.4, 'end'], why: 'Cipressa and Poggio, the end of Milan–San Remo', fit: 'The southwest coast, next to Provence as in reality', needs: 'Mediterranean coast art, as for Mallorca' },
  { name: 'Tourmalet', shape: 'peak', x: 51, y: 18.6, lab: [0, -1.5, 'middle'], why: 'The pass the Tour has climbed most, 2,115 m', fit: 'A Pyrenees ridge south of Melk', needs: 'Nothing new' },
  { name: 'Angliru', shape: 'peak', x: 46.6, y: 17.6, lab: [0, -1.5, 'middle'], why: "The Vuelta's steepest climb, with ramps of 23 %", fit: 'Beside the Pyrenees', needs: 'Nothing new' },
  { name: 'Strade Bianche', shape: 'area', x: 58.6, y: 19.2, rx: 3.6, ry: 2.4, lab: [0, -0.3, 'middle'], why: "White gravel roads of Tuscany, finishing in Siena's Piazza del Campo", fit: 'The open south', needs: 'Gravel roads, Tuscan hills and cypresses' },
  { name: 'Flanders · Roubaix', shape: 'area', x: 58.6, y: 26.4, rx: 4, ry: 2.8, lab: [0, -0.3, 'middle'], first: true, why: 'Cobbled bergs of the Tour of Flanders, the Arenberg forest and the Roubaix velodrome', fit: "The flat land inside the Danube's bend", needs: 'Cobbles: their look, rumble sound and rolling resistance' },
  { name: 'Champs-Élysées', shape: 'city', x: 67.2, y: 45.6, lab: [0, 1.2, 'middle'], first: true, why: "The Tour's final stage, round the Arc de Triomphe", fit: 'A fourth quarter of the City', needs: 'City art, shared with the City' },
];
const laterSvg = LATER.map((l) => {
  const tipText = `<b>${l.name}</b><span>${l.why}</span><span>Goes: ${l.fit}</span><span>Needs: ${l.needs}</span>`;
  let g = '';
  const cx = X(l.x ?? 0), cy = Y(l.y ?? 0);
  if (l.shape === 'peak') g = `<path class="lpeak" d="M${cx},${cy - 5.5}l5,8.5h-10z"/>`;
  if (l.shape === 'city') g = `<rect class="lpeak" x="${cx - 4}" y="${cy - 4}" width="8" height="8"/>`;
  if (l.shape === 'loop') g = `<circle class="larea" cx="${cx}" cy="${cy}" r="${l.r * U}"/>`;
  if (l.shape === 'area') g = `<ellipse class="larea" cx="${cx}" cy="${cy}" rx="${l.rx * U}" ry="${l.ry * U}"/>`;
  if (l.shape === 'island') g = `<path class="lroad" d="M${cx},${cy - l.r * U}V${Y(16.2)}"/><ellipse class="lisle" cx="${cx}" cy="${cy}" rx="${l.r * U}" ry="${l.r * U * 0.8}"/><path class="lpeak" d="M${cx},${cy - 7}l7,11h-14z"/>`;
  if (l.shape === 'coast') g = `<path class="lroad" d="M${l.pts.map(([x, y]) => `${X(x)},${Y(y)}`).join('L')}"/>`;
  const [lx, ly, a] = l.shape === 'coast' ? [X(l.lab[0]), Y(l.lab[1]), l.lab[2]] : [+(cx + l.lab[0] * U).toFixed(1), +(cy - l.lab[1] * U + 3.5).toFixed(1), l.lab[2]];
  const hit = l.shape === 'coast' ? `<path class="hit" d="M${l.pts.map(([x, y]) => `${X(x)},${Y(y)}`).join('L')}"/>` : `<circle class="lhit" cx="${cx}" cy="${cy}" r="${Math.max(10, (l.r ?? l.rx ?? 0) * U)}"/>`;
  return `<g class="litem" data-tip="${esc(tipText)}">${hit}${g}${label(lx, ly, a, esc(l.name), 'llabel')}</g>`;
}).join('');
const laterRows = LATER.map((l) => `<tr><td>${esc(l.name)}${l.first ? ' <span class="chip">first</span>' : ''}</td><td>${esc(l.why)}</td><td>${esc(l.fit)}</td><td>${esc(l.needs)}</td></tr>`).join('');

const scale = `<g class="scale" transform="translate(${X(6)},${Y(12)})"><path d="M0,0h100M0,-4v8M50,-3v6M100,-4v8"/><text x="0" y="-8">0</text><text x="50" y="-8" text-anchor="middle">5</text><text x="100" y="-8" text-anchor="middle">10 km</text></g><g class="north" transform="translate(${X(84.5)},${Y(70)})"><path d="M0,-16l6,16l-6,-4l-6,4z"/><text y="14" text-anchor="middle">N</text></g>`;

const svg = `<svg class="map-svg" viewBox="0 0 900 700" role="img" aria-label="Map of the island: the real routes in white, new roads dashed in yellow">
<image href="data:image/jpeg;base64,${relief}" width="900" height="700"/>
<g class="regions">${regions}${water}</g>
<path class="river" d="${M.river[0]}"/>
<g class="routes">${routeLines}</g>
<g class="newroads">${newRoads}</g>
<g class="later">${laterSvg}</g>
<g class="loops">${loopLayers}</g>
<g class="marks">${summits}${towns}</g>
<g class="labels">${routeLabels}</g>
${scale}
</svg>`;

const NAMES = Object.fromEntries(M.routes.map((r) => [r.id, SHORT[r.id] ?? r.name]));
const ROAD_NOTE = {
  'Coast road': 'Hairpins down the cliffs from the Coll dels Reis to Port de Pollença.',
  'Over to the lakes': 'From the Mallorca pass down into Austrian lake country: the first biome seam.',
  'Strobl to Gaisberg': 'Flat lakeside road. The first spike.',
  'Down to the sea': 'From the foot of the Gaisberg down to Port de Pollença.',
  'Into the Alps': 'Up the valley from the lakes to Fusch.',
  'Valley road west': 'Alpine valley floor between Fusch and Kitzbühel.',
  'Valley road east': 'On along the valley to Prato.',
  'High road': 'Over the top: Hochtor to the Stelvio pass, the highest road on the island.',
  'Col road': 'Balcony road from Alpe d\'Huez to the Stelvio hairpins at about 1,800 m.',
  'Sault road': 'From Bourg up to Chalet Reynard, where the real Sault road joins the Ventoux.',
  'Danube gorge': 'Down the gorge beside the young Danube to Melk.',
  'Down to the Danube': 'From Prato down to Spitz in the Wachau.',
  'Krems to the city': 'Along the Danube into Vienna.',
  'Ring to the park': 'City streets, new buildings.',
  'Ring to Bondi': 'City streets down to the coast.',
  'Park to Bondi': 'City streets.',
  'Coogee to the lake': 'Coast road south to the Neusiedler See.',
};

const roadRows = M.roads.map((r) => `<tr data-road="${esc(r.name)}"><td>${esc(r.name)}</td><td>${esc(NAMES[r.from[0]])} → ${esc(NAMES[r.to[0]])}</td><td class="num">≈ ${r.km}</td><td class="num">${sign(r.dh)}</td><td class="num">${r.grade} %</td><td>${esc(ROAD_NOTE[r.name] ?? '')}</td></tr>`).join('');
const loopButtons = M.loops.map((l) => `<button type="button" class="loop-btn" id="loop-${l.id}" data-loop="${l.id}" aria-pressed="false"><b>${esc(l.name)}</b><span>${l.km} km · ${n(l.up)} m</span></button>`).join('');
const loopList = M.loops.map((l) => `<li><b>${esc(l.name)}</b> <span class="figs">${l.km} km · about ${n(l.up)} m climbing</span><br>${esc(l.note)}</li>`).join('');

const html = `<title>Serpentine Island</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:ital,wght@0,400;0,500;0,600;1,400&family=Instrument+Serif:ital@1&display=swap">
<style>
/* Layout: one reading column, the map breaks out wide; Serpentine's own ink, signal yellow and Barlow Condensed. */
:root {
  --bg: #0d1b24; --panel: #132a36; --panel-2: #1c3a49; --line: rgba(238, 243, 244, 0.13);
  --fg: #eef3f4; --muted: #8fa3ad; --accent: #ffc93c; --accent-text: #ffc93c; --accent-soft: rgba(255, 201, 60, 0.14);
  --map-bg: #102634; --map-road: #f4f7f8; --map-case: #0d1b24; --map-new: #ffc93c; --map-river: #79bfdc; --map-label: #f4f7f8; --map-halo: rgba(9, 20, 27, 0.85); --map-later: #7ff5ff; --later-key: #7ff5ff;
  --display: 'Barlow Condensed', 'Arial Narrow', sans-serif; --body: 'Barlow', 'Helvetica Neue', Arial, sans-serif; --serif: 'Instrument Serif', Georgia, serif;
  color-scheme: dark;
}
@media (prefers-color-scheme: light) { :root:not([data-theme="dark"]) {
  --bg: #eef2f3; --panel: #ffffff; --panel-2: #e2e9eb; --line: rgba(13, 27, 36, 0.14);
  --fg: #0d1b24; --muted: #4b616c; --accent: #e0a400; --accent-text: #8a5d00; --accent-soft: rgba(224, 164, 0, 0.16); --later-key: #12808c; color-scheme: light; } }
:root[data-theme="light"] {
  --bg: #eef2f3; --panel: #ffffff; --panel-2: #e2e9eb; --line: rgba(13, 27, 36, 0.14);
  --fg: #0d1b24; --muted: #4b616c; --accent: #e0a400; --accent-text: #8a5d00; --accent-soft: rgba(224, 164, 0, 0.16); --later-key: #12808c; color-scheme: light; }
body { background: var(--bg); color: var(--fg); font: 400 1.0625rem/1.6 var(--body); }
.page { max-width: 1160px; margin: 0 auto; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 40px 72px; display: grid; gap: 56px; }
.col { max-width: 46rem; display: grid; gap: 14px; min-width: 0; }
h1, h2, h3 { font-family: var(--display); font-weight: 700; line-height: 1.05; margin: 0; text-wrap: balance; letter-spacing: 0.005em; }
h1 { font-size: clamp(3rem, 8vw, 5.4rem); text-transform: uppercase; }
h2 { font-size: 1.9rem; text-transform: uppercase; }
p { margin: 0; }
.eyebrow { font-family: var(--display); font-weight: 600; text-transform: uppercase; letter-spacing: 0.14em; color: var(--accent-text); font-size: 0.95rem; }
.lead { font-size: 1.25rem; line-height: 1.5; }
.muted { color: var(--muted); }
.facts { display: flex; flex-wrap: wrap; gap: 10px 28px; margin: 6px 0 0; padding: 0; list-style: none; }
.facts li { display: grid; }
.facts b { font-family: var(--display); font-size: 1.9rem; font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums; }
.facts span { color: var(--muted); font-size: 0.9rem; }
figure { margin: 0; display: grid; gap: 12px; }
.loops-bar { display: flex; flex-wrap: wrap; gap: 8px; }
.loop-btn { font: inherit; color: var(--fg); background: var(--panel); border: 1px solid var(--line); border-radius: 6px; padding: 7px 12px; cursor: pointer; display: grid; text-align: left; line-height: 1.25; }
.loop-btn b { font-family: var(--display); font-weight: 600; font-size: 1.05rem; text-transform: uppercase; letter-spacing: 0.03em; }
.loop-btn span { font-size: 0.85rem; color: var(--muted); font-variant-numeric: tabular-nums; }
.loop-btn:hover { border-color: var(--accent); }
.loop-btn[aria-pressed="true"] { background: var(--accent-soft); border-color: var(--accent); }
.loop-btn:focus-visible, .map-svg g:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.map-wrap { position: relative; background: var(--map-bg); border-radius: 8px; overflow: hidden; }
.map-scroll { overflow-x: auto; }
.map-svg { display: block; width: 100%; min-width: 760px; height: auto; }
.legend { display: flex; flex-wrap: wrap; gap: 8px 22px; font-size: 0.92rem; color: var(--muted); }
.legend i { display: inline-block; vertical-align: middle; margin-right: 8px; }
.k-real { width: 26px; height: 4px; background: var(--fg); border-radius: 2px; }
.k-new { width: 26px; height: 0; border-top: 3px dashed var(--accent); }
.k-river { width: 26px; height: 3px; background: var(--map-river); }
.k-peak { width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 10px solid var(--fg); }
.tip { position: absolute; pointer-events: none; background: var(--map-case); color: var(--map-label); border: 1px solid rgba(238, 243, 244, 0.2); border-radius: 6px; padding: 6px 10px; font-size: 0.88rem; line-height: 1.35; display: grid; max-width: 260px; z-index: 2; }
.tip b { font-family: var(--display); font-size: 1.05rem; text-transform: uppercase; letter-spacing: 0.03em; }
.map-svg .case { fill: none; stroke: var(--map-case); stroke-width: 5; stroke-linejoin: round; stroke-linecap: round; opacity: 0.75; }
.map-svg .line { fill: none; stroke: var(--map-road); stroke-width: 2.3; stroke-linejoin: round; stroke-linecap: round; }
.map-svg .dash { fill: none; stroke: var(--map-new); stroke-width: 2.4; stroke-dasharray: 6 4; stroke-linecap: round; }
.map-svg .hit { fill: none; stroke: transparent; stroke-width: 14; }
.map-svg .route, .map-svg .newroad { cursor: default; transition: opacity 0.2s; }
.map-svg .route:hover .line { stroke: var(--map-new); }
.map-svg .newroad:hover .dash { stroke-width: 3.6; }
.map-svg .river { fill: none; stroke: var(--map-river); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; opacity: 0.9; }
.map-svg .loop path { fill: none; stroke: var(--map-new); stroke-width: 6; stroke-linecap: round; stroke-linejoin: round; opacity: 0; transition: opacity 0.2s; }
.map-svg[data-active] .route, .map-svg[data-active] .newroad { opacity: 0.35; }
.map-svg[data-active="giants"] .loop[data-loop="giants"] path, .map-svg[data-active="danube"] .loop[data-loop="danube"] path,
.map-svg[data-active="tramuntana"] .loop[data-loop="tramuntana"] path, .map-svg[data-active="city"] .loop[data-loop="city"] path { opacity: 0.95; }
.map-svg .loops { pointer-events: none; }
.map-svg text { paint-order: stroke; stroke: var(--map-halo); stroke-width: 3px; stroke-linejoin: round; fill: var(--map-label); }
.map-svg .rlabel { font: 700 14px var(--display); text-transform: uppercase; letter-spacing: 0.04em; }
.map-svg .slabel { font: 600 11px var(--display); letter-spacing: 0.02em; }
.map-svg .tlabel { font: 500 10.5px var(--body); }
.map-svg .region { font: 600 15px var(--display); text-transform: uppercase; letter-spacing: 0.24em; fill: rgba(244, 247, 248, 0.6); stroke-width: 0; }
.map-svg .water { font: italic 17px var(--serif); fill: #a9d6ea; stroke-width: 0; letter-spacing: 0.02em; }
.map-svg .water.small { font-size: 14px; }
.map-svg .dim { opacity: 0.7; }
.map-svg[data-later="off"] .later { display: none; }
.map-svg:not([data-later="off"]) .open-label { display: none; }
.map-svg .lpeak { fill: none; stroke: var(--map-later); stroke-width: 1.6; }
.map-svg .larea { fill: rgba(127, 245, 255, 0.07); stroke: var(--map-later); stroke-width: 1.4; stroke-dasharray: 4 3; }
.map-svg .lisle { fill: rgba(127, 245, 255, 0.1); stroke: var(--map-later); stroke-width: 1.4; stroke-dasharray: 4 3; }
.map-svg .lroad { fill: none; stroke: var(--map-later); stroke-width: 2; stroke-dasharray: 3 4; stroke-linecap: round; }
.map-svg .lhit { fill: transparent; }
.map-svg .llabel { font: 600 11px var(--display); text-transform: uppercase; letter-spacing: 0.06em; fill: var(--map-later); }
.map-svg .litem:hover .lpeak, .map-svg .litem:hover .larea, .map-svg .litem:hover .lroad { stroke-width: 2.6; }
.map-svg[data-active] .later { opacity: 0.3; }
.k-later { width: 12px; height: 12px; border: 1.6px dashed var(--later-key); border-radius: 50%; }
.later-btn[aria-pressed="true"] { background: rgba(127, 245, 255, 0.1); border-color: var(--later-key); }
.later-btn:hover { border-color: var(--later-key); }
.chip { font: 600 0.72rem var(--display); text-transform: uppercase; letter-spacing: 0.08em; color: var(--accent-text); border: 1px solid var(--accent); border-radius: 4px; padding: 0 5px; margin-left: 6px; vertical-align: 2px; }
.map-svg .peak { fill: var(--map-label); stroke: var(--map-case); stroke-width: 1.2; }
.map-svg .town { fill: var(--map-case); stroke: var(--map-label); stroke-width: 1.4; }
.map-svg .scale path, .map-svg .north path { stroke: var(--map-label); stroke-width: 1.6; fill: var(--map-label); }
.map-svg .scale text, .map-svg .north text { font: 600 11px var(--display); stroke-width: 0; }
.note { font-size: 0.92rem; color: var(--muted); max-width: 46rem; }
ul.rules, ol.steps, ul.loops-list, ul.qs { margin: 0; padding-left: 1.2em; display: grid; gap: 10px; }
.rules b, .steps b, .qs b { font-weight: 600; }
.figs { color: var(--muted); font-variant-numeric: tabular-nums; }
.regions-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(19rem, 1fr)); gap: 12px; }
.region-card { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 14px 16px; display: grid; gap: 4px; align-content: start; min-width: 0; }
.region-card h3 { font-size: 1.25rem; text-transform: uppercase; letter-spacing: 0.03em; }
.region-card .alt { font-family: var(--display); color: var(--accent-text); font-weight: 600; font-variant-numeric: tabular-nums; }
.region-card p { font-size: 0.95rem; }
.table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 8px; }
table { border-collapse: collapse; width: 100%; min-width: 760px; font-size: 0.95rem; }
th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--line); vertical-align: top; }
th { font-family: var(--display); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; font-size: 0.85rem; color: var(--muted); background: var(--panel); }
tr:last-child td { border-bottom: 0; }
td:first-child { font-weight: 600; white-space: nowrap; }
.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
tr[data-road]:hover { background: var(--accent-soft); }
.steps li::marker { font-family: var(--display); font-weight: 700; color: var(--accent-text); }
.two { display: grid; grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr)); gap: 40px; }
.two > * { min-width: 0; }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
</style>
<div class="page">
  <header class="col">
    <p class="eyebrow">Serpentine · plan for one world · draft, 25 Oct 2026</p>
    <h1>Serpentine Island</h1>
    <p class="lead">All fourteen routes on one invented island, joined by new roads, so you can ride from the Mallorca coast over the Alps to the city without a loading screen, like Los Santos in GTA or Zwift's Watopia. Each route keeps its real road, heights, aerial photos, buildings and trees. The land and roads between them are made up to fit.</p>
    <ul class="facts">
      <li><b>14</b><span>real routes</span></li>
      <li><b>${M.real} km</b><span>real road</span></li>
      <li><b>≈ ${Math.round(M.made / 10) * 10} km</b><span>new road, ${M.roads.length} links</span></li>
      <li><b>75 × 60 km</b><span>a bit smaller than Mallorca</span></li>
      <li><b>2,758 m</b><span>highest road, Stelvio</span></li>
    </ul>
  </header>

  <figure>
    <div class="loops-bar" role="group" aria-label="Show a loop on the map">${loopButtons}<button type="button" class="loop-btn later-btn" id="later-toggle" aria-pressed="true"><b>Later highlights</b><span>${LATER.length} famous places to add</span></button></div>
    <div class="map-wrap" id="map-wrap">
      <div class="map-scroll">${svg}</div>
      <div class="tip" id="tip" hidden></div>
    </div>
    <div class="legend">
      <span><i class="k-real"></i>Real road, with its real surroundings</span>
      <span><i class="k-new"></i>New road</span>
      <span><i class="k-river"></i>River</span>
      <span><i class="k-peak"></i>Top of a climb, real height</span>
      <span><i class="k-later"></i>Later: famous places to add</span>
    </div>
    <p class="note">The relief is a first test of how the game would build the land: real heights within about 1.5 km of each road (the same elevation tiles the app uses today), a soft seam, and land filled in from the edges with rough hills, coast and rivers drawn by hand. Lengths of new roads are estimates. Hover a road for its numbers, or a faded mark for a place we could add later.</p>
  </figure>

  <section class="col">
    <h2>How it fits together</h2>
    <ul class="rules">
      <li><b>Real heights stay real.</b> Every summit keeps its true height, so the island is high in the middle and low at the coast: Mallorca and Sydney sit on the sea, the lakes at 550 m, the alpine villages at 720–900 m and the passes above them.</li>
      <li><b>North stays up.</b> Routes are moved but never turned, so the light in their aerial photos matches the sun and every hairpin stays where it is.</li>
      <li><b>Each route brings its surroundings.</b> About 1.5 km of real ground either side of the road, a lake or a coast where it has one. Beyond that a soft seam blends into invented land.</li>
      <li><b>New roads are short and rideable.</b> Mostly 5 to 11 km, never steeper than about 6.5 % on average, with hairpins where the height has to be climbed.</li>
      <li><b>Real junctions where they exist.</b> The Sault road joins the Ventoux at Chalet Reynard as it does in France; Strobl and Spitz are real places on their routes.</li>
      <li><b>Summits that end in reality end here too.</b> Gaisberg, Kitzbüheler Horn, Ventoux, the Formentor lighthouse and the port of Sa Calobra are turnarounds.</li>
    </ul>
  </section>

  <section class="col" style="max-width:none">
    <h2>Regions</h2>
    <div class="regions-grid">
      <div class="region-card"><h3>Tramuntana coast</h3><span class="alt">0–674 m</span><p>Sa Calobra and Cap de Formentor on the north coast, joined by the Coast road over the Coll dels Reis.</p></div>
      <div class="region-card"><h3>Lake country</h3><span class="alt">540–1,275 m</span><p>Wolfgangsee and the Gaisberg, between the Mallorca cliffs and the Alps.</p></div>
      <div class="region-card"><h3>The High Alps</h3><span class="alt">720–2,758 m</span><p>Großglockner, Stelvio, Kitzbüheler Horn and Alpe d'Huez round one snowy core, with a valley road at their feet and the High road across the top.</p></div>
      <div class="region-card"><h3>Provence</h3><span class="alt">309–1,900 m</span><p>Mont Ventoux alone in the southwest, reached by the Sault road from Bourg.</p></div>
      <div class="region-card"><h3>Danube valley</h3><span class="alt">197–253 m</span><p>The Wachau. The Danube rises in the Alps, runs through the gorge to Melk and on past Vienna to the sea.</p></div>
      <div class="region-card"><h3>The City and the lake</h3><span class="alt">4–179 m</span><p>Wiener Ring, Central Park and Sydney's coast as three quarters of one city, the Neusiedler See south of it.</p></div>
    </div>
  </section>

  <section class="col" style="max-width:none">
    <h2>The new roads</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>Road</th><th>Joins</th><th class="num">km</th><th class="num">Height</th><th class="num">Avg</th><th>What it is</th></tr></thead>
      <tbody>${roadRows}</tbody>
    </table></div>
  </section>

  <section class="col" style="max-width:none">
    <h2>Later: famous places to add</h2>
    <p class="muted" style="max-width:46rem">The faded marks on the map. "First" marks where I'd start: the biggest names for the least new road, and riding the island doesn't have yet (cobbles, the fjord roads, a Grand Tour finish).</p>
    <div class="table-wrap"><table>
      <thead><tr><th>Place</th><th>Why it's famous</th><th>Where it goes</th><th>Needs</th></tr></thead>
      <tbody>${laterRows}</tbody>
    </table></div>
  </section>

  <section class="two">
    <div class="col">
      <h2>Loops to ride</h2>
      <ul class="loops-list">${loopList}</ul>
      <p class="muted">Plus the out-and-back climbs from each loop, and everything at once: about ${Math.round((M.real + M.made) / 10) * 10} km of road.</p>
    </div>
    <div class="col">
      <h2>Riding it</h2>
      <ul class="rules">
        <li><b>Junctions.</b> The HUD shows the turn ahead; the Zwift Ride's D-pad or the arrow keys pick it. Without a choice you stay on your road.</li>
        <li><b>World map.</b> See where you are and start anywhere on the island.</li>
        <li><b>Named routes stay.</b> "Ride the Stelvio" starts you in Prato, with the same banners, records, ghosts and segments as today.</li>
        <li><b>GPS and Strava.</b> The island has no real place on Earth, so rides get coordinates on an empty patch of ocean, as Zwift does with Watopia, and show as a Virtual Ride. Real Strava segments can't match there, but the app still knows the real road under you and can time those segments itself. The single routes stay as they are, with real GPS, for anyone who wants real segments on Strava.</li>
      </ul>
    </div>
  </section>

  <section class="col">
    <h2>Build order</h2>
    <ol class="steps">
      <li><b>Spike: two routes and one road.</b> Gaisberg and Wolfgangsee joined by the 5.5 km Strobl road. Proves the land builder (real ground inside, filled land outside, the seam), one new road, a junction and streaming, measured on the M5 Max and an older MacBook Air. <span class="figs">1–2 weeks</span></li>
      <li><b>The hard seam.</b> Add Cap de Formentor over the Down to the sea road: sea level to mountains, Mallorca photos next to Austrian ones, two kinds of trees and ground blending. <span class="figs">about 1 week</span></li>
      <li><b>The High Alps as the first world you can ride.</b> Großglockner, Stelvio, Kitzbüheler Horn and Alpe d'Huez with the valley roads, the High road and the Col road: about 77 km real and 40 km new. World map, rides on the road network, FIT files with island coordinates. <span class="figs">3–5 weeks</span></li>
      <li><b>Coast, lakes, Danube and Ventoux.</b> Region by region, each shipped when it looks right. <span class="figs">a few weeks</span></li>
      <li><b>The City.</b> Last, because invented streets and buildings between three real cities are the most art work.</li>
      <li><b>Ride together on the island.</b> The 1.3 plan, but everyone in one world instead of on one road.</li>
    </ol>
    <p class="muted">All in all a few months. Each step ships on its own, and today's routes keep working the whole time. The engine work from 1.1 (ride time from the clock, freeing memory after a ride) comes first, because streaming a world needs both.</p>
  </section>

  <section class="col">
    <h2>For you to decide</h2>
    <ul class="qs">
      <li><b>The layout.</b> Mallorca north, Alps in the middle, Provence southwest, the city east. Move anything you want somewhere else.</li>
      <li><b>The name.</b> "Serpentine Island" is a placeholder.</li>
      <li><b>The cities.</b> On the island, last (my suggestion), or a separate city world.</li>
      <li><b>Real heights.</b> Keep them (my suggestion) or level the routes to fit tighter, which would cost the summits their real numbers.</li>
      <li><b>Today's single routes.</b> Keep them as a mode with real GPS (my suggestion).</li>
    </ul>
  </section>
</div>
<script>
(() => {
  const svg = document.querySelector('.map-svg');
  const wrap = document.getElementById('map-wrap');
  const tip = document.getElementById('tip');
  const buttons = [...document.querySelectorAll('.loop-btn[data-loop]')];
  const later = document.getElementById('later-toggle');
  later.addEventListener('click', () => {
    const on = later.getAttribute('aria-pressed') !== 'true';
    later.setAttribute('aria-pressed', String(on));
    if (on) delete svg.dataset.later; else svg.dataset.later = 'off';
  });
  function show(id) {
    const on = id && svg.dataset.active !== id ? id : null;
    if (on) svg.dataset.active = on; else delete svg.dataset.active;
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.loop === on)));
  }
  buttons.forEach((b) => b.addEventListener('click', () => show(b.dataset.loop)));
  svg.addEventListener('pointermove', (e) => {
    const g = e.target.closest('[data-tip]');
    if (!g) { tip.hidden = true; return; }
    tip.innerHTML = g.dataset.tip;
    tip.hidden = false;
    const r = wrap.getBoundingClientRect();
    let x = e.clientX - r.left + 14, y = e.clientY - r.top + 14;
    if (x + tip.offsetWidth > r.width - 8) x = e.clientX - r.left - tip.offsetWidth - 14;
    if (y + tip.offsetHeight > r.height - 8) y = e.clientY - r.top - tip.offsetHeight - 14;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  });
  svg.addEventListener('pointerleave', () => { tip.hidden = true; });
  document.querySelectorAll('tr[data-road]').forEach((row) => {
    const g = [...svg.querySelectorAll('.newroad')].find((n) => n.dataset.tip.includes('<b>' + row.dataset.road + '</b>'));
    if (!g) return;
    row.addEventListener('mouseenter', () => g.querySelector('.dash').style.strokeWidth = '5');
    row.addEventListener('mouseleave', () => g.querySelector('.dash').style.strokeWidth = '');
  });
})();
</script>
`;
const file = join(HERE, '../../docs/world/island.html');
fs.writeFileSync(file, html);
console.log(`wrote ${file} (${(html.length / 1024).toFixed(0)} KB)`);
