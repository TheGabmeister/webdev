# AGENTS.md

Project guidance for future Codex sessions working in `c:\dev\webdev\google-drive`.

## Scope
- This project is a desktop web Google Drive clone for a portfolio piece.
- Ignore unrelated monorepo projects; only work within `google-drive`.
- Web only. No mobile-responsive work, no desktop app, no native mobile app.
- Keep implementation aligned with `SPEC.md` and `MILESTONES.md`. If they conflict with ad hoc assumptions, prefer the documents.

## Product boundaries
- Real account isolation per user, but no collaboration or sharing features.
- No OAuth, no social login, no refresh tokens.
- No dark mode, grid view, thumbnails, folder upload, offline mode, or full-text content search.
- Small portfolio-scale data only: hundreds to low-thousands of items per user. No pagination unless the spec is changed.

## Architecture
- Frontend: Vue 3 + TypeScript + Vue Router + Pinia + Tailwind.
- Backend: Node.js + Express 5 + TypeScript + Prisma + PostgreSQL.
- File storage: AWS S3 via presigned URLs.
- Deployment target: Render, with same-origin SPA + API served by Express.
- Reconciliation for stale uploads runs outside the request path via Render Cron/background worker.

## Auth and security
- Auth is cookie-based, not bearer-token-in-localStorage.
- Use one JWT access token in `drive_session` cookie with:
  - `HttpOnly`
  - `Secure`
  - `SameSite=Lax`
  - path `/`
- Mutating routes use double-submit CSRF:
  - readable `csrf_token` cookie
  - `X-CSRF-Token` request header
- Treat auth failure and CSRF failure differently:
  - `401` for missing/expired auth
  - `403` for CSRF rejection
- Expired session UX: redirect to `/login?redirect=<current-route>` and restore destination after login.
- Rate limits required:
  - register: `10 / 15 min / IP`
  - login: `10 / 15 min / IP`
  - upload-url: `100 / 15 min / IP`

## Data model rules
- Use a single `File` table for files and folders.
- `parentId = null` means My Drive root. There is no root row.
- Duplicate names in the same folder are allowed.
- Required `File` fields include:
  - upload state: `uploadStatus`
  - trash state: `trashedAt`, `trashedByAncestorId`
- Visible items in normal views must exclude rows where either `trashedAt` or `trashedByAncestorId` is non-null.
- Trash behavior:
  - direct trash sets `trashedAt`
  - trashing a folder cascades `trashedByAncestorId` to descendants
  - restoring a folder clears only descendant `trashedByAncestorId` for that ancestor
  - descendants directly trashed earlier remain trashed after parent restore
  - restore uses current `parentId`; if parent is gone, restore to root

## File handling rules
- Max file size: `100 MB`
- Default quota: `1 GB`
- Upload flow:
  - request upload URL
  - upload directly to S3 with `XMLHttpRequest`
  - confirm with idempotent `PATCH /api/files/:id/confirm`
- Confirm must never double-increment quota.
- Upload queue is bounded to `3` active uploads.
- Canceled/abandoned uploads are handled by reconciliation of stale pending rows older than `20 minutes`.
- Preview support is limited to:
  - JPEG
  - PNG
  - GIF
  - WebP
  - PDF
- SVG is download-only.

## API and UX constraints
- `GET /api/files` must support `foldersOnly=true` for the lazy-loaded move modal.
- `GET /api/files/trash` returns top-level trash entries only.
- `POST /api/files/bulk-download` is file-only:
  - reject folders
  - reject selections over `50 files`
  - reject selections over `500 MB`
- Empty trash should reuse trash listing + bulk delete behavior; do not invent a dedicated endpoint unless the spec changes.
- Rename uses a modal, not inline rename.
- Name validation for folder creation and rename must:
  - block `/ \\ : * ? \" < > |`
  - trim leading/trailing whitespace
  - reject empty-after-trim input

## Frontend expectations
- Auth store bootstraps from `GET /api/auth/session`.
- Use `credentials: 'include'` for API requests.
- Do not store auth tokens in `localStorage` or `sessionStorage`.
- Add an auth-bootstrap loading state to avoid redirect flicker before session check completes.
- Core keyboard support is required:
  - Arrow keys
  - Enter
  - Space
  - Shift+Arrow
  - F2
  - Shift+F10 / Context Menu key
  - Esc
- Modals require focus trap and focus return.

## Delivery order
- Follow `MILESTONES.md` unless the user explicitly changes sequencing.
- Current milestone structure:
  - Milestone 1: foundation/auth
  - Milestone 2: file API + S3
  - Milestone 3: core frontend
  - Milestone 4: uploads, multi-select, polish
  - Milestone 5: deployment and operations

## Working rules for future sessions
- Before implementing, check `SPEC.md`, `MILESTONES.md`, and this file for alignment.
- If a request would conflict with these docs, surface the conflict explicitly instead of silently diverging.
- Prefer small, milestone-consistent changes over speculative abstractions.
