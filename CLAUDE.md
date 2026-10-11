# Serpentine: working rules

Serpentine is an open-source indoor-cycling app (a home-made Zwift): real roads from geodata, smart-trainer
control over Web Bluetooth. Vite + React 19 + TypeScript, three.js 0.186 with pmndrs postprocessing, a small
local API in `server/` (rides on disk, Strava). Runs at http://localhost:5199 (`npm run dev`), Chrome only.

## Where things are

- `src/engine/`: the 3D world. `Engine.ts` builds it; `atmosphere.ts` (`patchMaterial`) adds curvature, haze,
  sun visibility, cloud and terrain shadows and tunnel light to every material; `terrainMaterial.ts`,
  `Vegetation.ts`, `GroundCover.ts`, `Road.ts`, `Roadside.ts`, `Buildings.ts`, `Props.ts`, `Life.ts`, `biome.ts`
  (Alpine and Mediterranean).
- `src/geo/`: routes, DEM, imagery sources, OSM parsing, baked trees. `src/sim/`: ride session, physics,
  drivetrain, storage, rider profiles, Strava client. `src/devices/`: FTMS, FE-C, Zwift Ride, sensors. `src/ui/`: React.
- `public/`: baked data per route (`routes/`, `osm/`, `trees/`, `dem/`, `scenes/`) and models and textures.
- `scripts/`: bakes (`bake-*.mjs|py`), capture (`shots-set.mjs`, `match-shots.mjs`, `flyover.mjs`), review
  helpers (`compare.py`, `sheet.py`), probes. `scripts/blender/` drives the open Blender (Blender Lab MCP add-on, :9876).
- `docs/art/`: art direction, one brief per route, the review scorecard. `docs/lessons.md`: what we learned.
- `research/<route>/`: fact sheets and QA reviews (committed); photos, street-level frames, data and reference
  boards (gitignored, third-party licences).

## Visual work: the loop

Builder and approver are never the same agent.

1. **Brief first.** Visual work on a route starts from `docs/art/<route>.md`. If it has no brief, write one from
   `docs/art/_template.md` before building. New facts about the real place go into the brief, not into code comments.
2. **Build.**
3. **Capture** with `scripts/shots-set.mjs` (and `scripts/match-shots.mjs` where references have a heading).
   A frame with tiles still pending is not evidence; re-shoot it.
4. **Review** with the `serpentine-reviewer` agent (`.claude/agents/`). It only looks, scores against
   `docs/art/scorecard.md` and says APPROVE or REJECT. Save its report verbatim to `research/<route>/review-<date>.md`.
5. **Fix** blockers first, then the worst findings, re-capture the same frames, review again until APPROVE.
6. **Write it down.** Every fix adds an entry to `docs/lessons.md` (symptom, cause, fix, where). Update the brief's
   status. Chris's feedback goes into the brief's feedback log with his reason ("too dark at dusk: the road
   disappears").

## Rules

- Subagents run on Haiku (`model: "haiku"`), Sonnet only when Haiku clearly can't do the task.
- Never commit third-party photos, street-level frames or boards. Credit sources in the research notes.
- No scraping: not Google (Street View, Maps), not Strava. Strava only through the official API with the owner's own
  app; credentials live in `~/Documents/Serpentine/strava.json` (mode 600), never in the repo or in logs.
- Don't interrupt a ride. Never close, reload or navigate a tab at :5199, restart the dev server, or edit `server/`
  or `vite.config.ts` without asking. Edits in `src/` hot-reload too. Tests run in a separate headless browser with
  `?nobt=1`, never against Chris's Chrome profile or a trainer someone is riding.
- Don't edit `src/` while `flyover.mjs` or a shot batch runs: HMR reloads the page mid-capture.
- Every new material goes through `patchMaterial` (it is idempotent). Place objects with `terrain.groundHeight`
  (the flattened road surface), not the raw DEM.
- TypeScript is strict with `erasableSyntaxOnly` (no constructor parameter properties). `npm run typecheck` before committing.
- Comment density and naming follow the surrounding code: comments say why, not what.
