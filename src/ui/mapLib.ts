// MapLibre with its worker where the production build puts it: it looks for the worker next to its own module,
// which the build doesn't copy, so in the app the map stayed blank and nothing on it answered. The worker is one
// self-contained file, emitted as an asset here.

import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import mapWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

maplibregl.setWorkerUrl(mapWorker);

export { maplibregl };

/** OpenFreeMap's street map (OpenStreetMap data): light, coloured roads, like a phone's map app. */
export const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
