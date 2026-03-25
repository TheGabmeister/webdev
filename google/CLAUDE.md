# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Dev server:** `npm run dev` (runs `tsx src/server.ts` with hot reload)
- **Build:** `npm run build` (runs `tsc`, outputs to `dist/`)
- **Start production:** `npm run start` (runs `node dist/server.js`)

No test framework or linter is configured.

## Architecture

This is a Google-style web search engine that proxies queries through the Brave Search API.

**Backend** (`src/server.ts`): Express 5 server with a single API endpoint `GET /api/search?q=<query>` that proxies to Brave Search, keeping the API key server-side. Also serves the static frontend from `public/`.

**Frontend** (`public/`): Vanilla HTML/CSS/JS with two pages:
- `index.html` — home page with centered search form
- `results.html` — displays search results fetched from `/api/search`
- `search.js` — shared client logic: clear-button behavior, result fetching, and rendering with HTML escaping
- `style.css` — Google-inspired design with light/dark mode via `prefers-color-scheme`

## Environment

Requires a `.env` file (see `.env.example`):
- `BRAVE_API_KEY` — Brave Search API key (required)
- `PORT` — server port (default: 3000)

## TypeScript

ESM modules (`"type": "module"` in package.json). Strict mode with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` enabled. Uses `nodenext` module resolution.
