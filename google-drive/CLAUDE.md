# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Google Drive clone — desktop web only, multi-account, portfolio piece. No code exists yet; the project is fully specified in `SPEC.md` with implementation tracked in `MILESTONES.md`.

## Build and Dev Commands

Once scaffolded, the project uses a monorepo structure with Vue 3 frontend + Express 5 backend served from the same origin.

```bash
npm run dev          # Start dev server (Express + Vite dev middleware)
npm run build        # Full production build: prisma generate → vite build → tsc
node dist/server.js  # Start production server
npx prisma migrate dev    # Create/apply migrations in development
npx prisma migrate deploy # Apply migrations in production
npx prisma studio         # Visual database browser
npm test             # Run all tests (Vitest + supertest)
npm test -- --run    # Run tests once without watch mode
npm test -- auth     # Run tests matching "auth"
```

## Architecture

- **Same-origin deployment**: Express serves both the Vue SPA (`dist/client/`) and the JSON API (`/api/*`). No separate frontend host.
- **Auth is cookie-based, not bearer-token**: JWT lives in an `HttpOnly` cookie (`drive_session`), never in localStorage. The `Secure` flag is conditional — production only, omitted for localhost HTTP.
- **CSRF via double-submit cookie**: Mutating requests require an `X-CSRF-Token` header matching the `csrf_token` cookie. Auth failure = 401, CSRF failure = 403.
- **Auth middleware exclusions**: Only `/api/auth/register`, `/api/auth/login`, and `/api/auth/session` skip auth middleware. `/api/auth/logout` requires both auth and CSRF.
- **Direct S3 uploads**: Files never pass through the Express server. Client gets a presigned PUT URL, uploads directly to S3, then confirms via `PATCH /api/files/:id/confirm`. Confirm is idempotent and must never double-increment quota.
- **Confirm failure behavior**: If confirm cannot find a valid S3 object yet, return `409 Conflict` and leave the record `pending` for retry or later reconciliation.
- **Single File table**: Files and folders share one table with `isFolder` as discriminator. `parentId = null` means root (no explicit root row). Duplicate names are allowed.
- **Two-field trash model**: `trashedAt` for directly trashed items, `trashedByAncestorId` for cascade-inherited trash. Both must be null for an item to be "visible" in normal views.
- **Orphaned upload reconciliation**: A standalone script (Render Cron) cleans up pending uploads older than 20 minutes — not part of the request path.

## Key Rules

- Follow `MILESTONES.md` delivery order (M1→M7) unless explicitly told otherwise.
- If a request conflicts with `SPEC.md` or `MILESTONES.md`, surface the conflict instead of silently diverging.
- Preview support: JPEG, PNG, GIF, WebP, PDF only. SVG is download-only.
- Name validation (folders and rename): block `/ \ : * ? " < > |`, trim whitespace, reject empty-after-trim.
- Bulk download: files only (no folders), max 50 files, max 500 MB. Reuse trash listing + bulk-delete for empty-trash (no dedicated endpoint).
- Upload queue bounded to 3 concurrent uploads client-side.
- Rate limits: register/login 10 per 15min per IP, upload-url 100 per 15min per IP.

## Environment Variables

`DATABASE_URL`, `JWT_SECRET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET_NAME`, `APP_ORIGIN`, `PORT`
