# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An MCP (Model Context Protocol) server exposing SMHI (Swedish Meteorological and Hydrological Institute) weather data as tools, built against SMHI's current `snow1g` point-forecast API. SMHI retired the older `pmp3g` API on 2026-03-31; this is a fresh implementation, not a migration.

## Commands

```bash
npm install
npm run typecheck      # tsc --noEmit
npm test                # vitest run (all tests, single run)
npm run test:watch      # vitest (watch mode)
npm run test:coverage   # vitest run --coverage
npm run build            # tsc -> dist/
npm start                 # node dist/index.js
```

Run a single test file: `npx vitest run src/__tests__/tools.test.ts`
Run tests matching a name: `npx vitest run -t "getFireRisk"`

CI (`.github/workflows/ci.yml`) runs on Node 20.x/22.x/24.x: `npm ci`, `npm run typecheck`, `npm test`, `npm run build`. Match this locally before pushing.

## Architecture

**Request flow:** `src/index.ts` (MCP server, stdio transport) → tool module in `src/tools/*.ts` (zod schema + handler) → `src/smhi-client.ts` (fetches SMHI APIs, shapes raw responses) → lookup tables (`weather-symbols.ts`, `fire-risk-classes.ts`) for human-readable descriptions.

**Adding a new tool** touches four places:
1. `src/smhi-client.ts` — fetch function against the relevant SMHI API/category, plus a converter from the raw SMHI shape to a processed type.
2. `src/types.ts` — raw API response types and processed output types for the new data.
3. `src/tools/<name>.ts` — zod input schema (`z.object` with `.describe()` on each field) + async handler calling the client function. Exports the schema, the handler, and the inferred input type.
4. `src/tools/index.ts` — re-export the new schema/handler/type.
5. `src/index.ts` — register the tool in the `ListToolsRequestSchema` handler (JSON Schema `inputSchema`, description, `READONLY_ANNOTATIONS`) and add a `case` in the `CallToolRequestSchema` switch that parses input with the zod schema and calls the handler.

Each tool module is a thin adapter: input validation lives in the zod schema (`src/index.ts` re-validates with the same schema before dispatch), and all HTTP/data-shaping logic lives in `smhi-client.ts`. Tool handlers just call the client and wrap the result with `location`/`period` metadata.

**Several independent SMHI APIs are wired up:**
- `snow1g` (forecast) and `fwif1g` (fire weather index) both live under `opendata-download-metfcst.smhi.se`, share `validateCoordinates`, and return 404 for out-of-coverage points — mapped to a descriptive `SMHIClientError`.
- `mesan2g` (Mesan2gv3 meteorological analysis, `get_weather_analysis`) lives under `opendata-download-metanalys.smhi.se` and follows the same point-query/`validateCoordinates`/404-mapping shape as `snow1g`/`fwif1g`, but is a gridded "best current estimate" analysis (observations blended with a short-range model) covering the past ~24 hours, newest entry first — not a forward-looking forecast. Several fields (`air_temperature_min/max`, the 3/12/24h precipitation and snow-change windows) are only populated at some hours, so they're optional in `MesanTimeSeriesData`.
- Radar (`opendata-download-radar.smhi.se`) is a two-step fetch: get the product metadata JSON to find the latest PNG link, then fetch and base64-encode the image. No coordinates involved (Sweden-only, no input params).

**Error handling:** all client functions throw `SMHIClientError` (with optional `statusCode`) on network failure, non-OK responses, or missing data. `src/index.ts`'s tool-call handler catches everything and returns `{ content: [...], isError: true }` rather than throwing across the MCP boundary — never let an exception escape the `CallToolRequestSchema` handler.

**Raw vs. processed data:** `get_forecast` returns the (lightly renamed) raw SMHI time series (`parameters` = raw `SMHITimeSeriesData`) for every field including ones no other tool exposes. `get_current_weather`/`get_hourly_forecast`/`get_daily_summary` return the processed `CurrentWeather`/`HourlyForecast`/`DailySummary` shapes with resolved `weatherDescription` strings. `get_fire_risk` flattens FWIF1G's parameter-array format (`FWIParameter[]` with single-element `values`) into a flat record via `fwiParamsToRecord`, then resolves class descriptions (fire/grass/forest-dryness — the latter is daily-only).

**Units** (consistent across tools): temperature °C, wind speed m/s, pressure hPa, precipitation mm, humidity/cloud-cover/probabilities %. FWI/ISI/BUI/FFMC/DMC/DC fire indices are unitless.

**Coverage:** Sweden, Norway, Finland, Denmark, Estonia, parts of Latvia/Lithuania for forecast, fire-risk, and weather-analysis tools; `get_radar_image` is Sweden-only.

## Release process

Versioning and `CHANGELOG.md` are managed by [release-please](https://github.com/googleapis/release-please) (`.github/workflows/release-please.yml`), triggered on every push to `main`. It bumps `package.json`, updates `CHANGELOG.md`, and tags + creates a GitHub Release when its release PR is merged — no npm publish step.

This depends on commit messages (or squash-merge PR titles) following [Conventional Commits](https://www.conventionalcommits.org/): `feat: ...` (minor bump), `fix: ...` (patch bump), `feat!: ...`/`BREAKING CHANGE:` footer (major bump), `chore:`/`docs:`/`refactor:`/`test:` (no bump, still changelogged). A plain, unprefixed commit message is treated as a chore.

## Testing conventions

Tests mock global `fetch` (`vi.stubGlobal('fetch', ...)`) against JSON fixtures in `src/__tests__/fixtures/` (`forecast-response.json`, `fire-risk-response.json`, `radar-comp-response.json`) rather than hitting the live SMHI API. When changing a raw response type in `types.ts` or the shape SMHI returns, update the matching fixture.

## Import note

This machine also has a Codex config (`~/.codex/config.toml`) and a Gemini CLI config (`~/.gemini/`, `GEMINI.md`) at the user level. If you want to bring over MCP servers, slash commands, or instructions from those into Claude Code, reply `/import` to scan what's importable.
