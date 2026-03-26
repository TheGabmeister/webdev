# Milestones

Each milestone is self-contained and testable before moving to the next.

---

## Milestone 1 — Foundation

Scaffolding, database, auth system, and auth UI.

### Backend
- [ ] Initialize Node.js + Express 5 + TypeScript project
- [ ] Configure Prisma with PostgreSQL
- [ ] Create the full initial `User` and `File` schema required by the spec, including quota fields, upload state, trash state, and indexes; generate migration
- [ ] Implement `POST /api/auth/register` and `POST /api/auth/login` with bcrypt
- [ ] Implement `GET /api/auth/session` for SPA bootstrap
- [ ] Implement `POST /api/auth/logout`
- [ ] JWT in `drive_session` cookie with `HttpOnly`, `SameSite=Lax`, path `/`, and conditional `Secure` flag (HTTPS only in production; omitted for localhost)
- [ ] CSRF double-submit cookie pattern (`csrf_token` cookie + `X-CSRF-Token` header)
- [ ] Auth middleware on `/api/*` (exclude `/api/auth/register`, `/api/auth/login`, and `/api/auth/session`; `/api/auth/logout` requires auth + CSRF)
- [ ] Rate limiting on register, login

### Frontend
- [ ] Initialize Vue 3 + TypeScript + Vite + Vue Router + Pinia + Tailwind
- [ ] Configure build so Express serves the SPA from `dist/client/`
- [ ] Auth store with session bootstrap from `GET /api/auth/session`
- [ ] Auth bootstrap loading state so protected routes do not flicker before session check completes
- [ ] CSRF: read `csrf_token` cookie, attach `X-CSRF-Token` on mutating requests
- [ ] Login and Register views with form validation
- [ ] Router guard: redirect unauthenticated users to `/login?redirect=<route>`
- [ ] After login, redirect to `redirect` query target if present; otherwise `/drive`
- [ ] After registration, redirect to `/drive`
- [ ] Handle 401 responses globally: clear auth state, redirect to login with `redirect=<current-route>`
- [ ] Handle 403 CSRF responses without logging the user out

### Tests
- [ ] Set up test runner (Vitest + supertest)
- [ ] Register → sets auth + CSRF cookies, returns user summary
- [ ] Login → sets auth + CSRF cookies, returns user summary
- [ ] Login with wrong password → 401, no cookies set
- [ ] Register with duplicate email → 409
- [ ] Register with short password (< 8 chars) → 400
- [ ] `GET /api/auth/session` with valid cookie → returns user
- [ ] `GET /api/auth/session` with no cookie → 401
- [ ] `POST /api/auth/logout` → clears both cookies
- [ ] Mutating request without CSRF token → 403
- [ ] Mutating request with mismatched CSRF token → 403
- [ ] Auth-required endpoint without session cookie → 401
- [ ] Rate limit: 11th login in 15 minutes → 429

### Verify (manual)
- [ ] Register a new user → cookie is set → redirected to `/drive`
- [ ] Refresh the page → session rehydrates from `GET /api/auth/session`
- [ ] Logout → cookie cleared → redirected to `/login`
- [ ] Expired session on a protected route → redirected to `/login?redirect=<route>` → after login returns to original route
- [ ] Mutating request without CSRF token → 403, session remains intact
- [ ] 11th login attempt in 15 minutes → 429

---

## Milestone 2 — S3 Upload Lifecycle

Presigned URL upload/download flow, confirmation, quota tracking, and storage endpoint.

### Backend
- [ ] AWS S3 client configuration
- [ ] `POST /api/files/upload-url` — validate quota, file size, rate limit, reject trashed `parentId`; create pending record; return presigned PUT URL
- [ ] `PATCH /api/files/:id/confirm` — idempotent; verify via `HeadObject`; flip status; increment quota once
- [ ] `GET /api/files/:id/download` — presigned GET with `Content-Disposition: attachment`
- [ ] `GET /api/files/:id/preview` — presigned GET with `Content-Disposition: inline` (images + PDF only)
- [ ] `GET /api/storage` — return `{ used, limit }`
- [ ] Rate limiting on upload-url

### Tests
- [ ] Upload URL request → returns `{ fileId, uploadUrl }`, file record is `pending`
- [ ] Upload URL with file size > 100 MB → 400
- [ ] Upload URL when quota would be exceeded → 413
- [ ] Upload URL with trashed `parentId` → 400
- [ ] Confirm after S3 upload → status flips to `uploaded`, `storageUsed` incremented
- [ ] Confirm same file again → 200 success, `storageUsed` not incremented twice
- [ ] Confirm file that doesn't exist in S3 → status stays `pending` or `failed`
- [ ] Download returns presigned URL with correct `Content-Disposition: attachment` filename
- [ ] Preview for JPEG → returns `{ url, mimeType }`
- [ ] Preview for PDF → returns `{ url, mimeType }`
- [ ] Preview for .zip → 400 (not previewable)
- [ ] Preview for SVG → 400 (download-only)
- [ ] `GET /api/storage` returns correct `{ used, limit }`
- [ ] `GET /api/storage` reflects incremented usage after upload confirm
- [ ] 101st upload URL request in 15 minutes → 429

### Verify (manual)
- [ ] Upload a file via `curl` using presigned URL → confirm → file record is `uploaded`, quota incremented
- [ ] Repeat confirm on the same uploaded file → success response, quota not incremented twice
- [ ] Download returns presigned URL with correct filename

---

## Milestone 3 — File Tree and Trash

Folder CRUD, listing, search, starred, breadcrumbs, trash/restore with cascade logic.

### Backend
- [ ] `POST /api/files/folder` — create folder with invalid-character validation, trimmed names, reject empty-after-trim input, and reject trashed `parentId`
- [ ] `GET /api/files` — list folder contents; exclude trashed; folders first, alphabetical; support `foldersOnly=true` for lazy-loaded move modal
- [ ] `GET /api/files/:id` — single item metadata
- [ ] `GET /api/files/:id/path` — breadcrumb ancestor chain
- [ ] `GET /api/files/search` — `ILIKE` filename search, exclude trashed
- [ ] `GET /api/files/starred` — all visible starred items
- [ ] `GET /api/files/trash` — top-level trashed items only
- [ ] `PATCH /api/files/:id` — rename, star/unstar, move (with cycle detection for folders; reject trashed target parent)
- [ ] `PATCH /api/files/:id/trash` — set `trashedAt`; cascade `trashedByAncestorId` for folders
- [ ] `PATCH /api/files/:id/restore` — clear direct trash; clear descendant ancestor-trash; fall back to root if parent gone
- [ ] `DELETE /api/files/:id` — permanent delete; recursive for folders; remove S3 objects; decrement quota

### Tests
- [ ] Create folder → returns folder with `isFolder: true`
- [ ] Create folder with name containing `/` → 400
- [ ] Create folder with name `"  "` (whitespace only) → 400
- [ ] Create folder with trashed `parentId` → 400
- [ ] List root → returns only non-trashed items, folders first then files, alphabetical
- [ ] List with `foldersOnly=true` → returns only folders
- [ ] List folder with trashed children → trashed children excluded
- [ ] `GET /api/files/:id` → returns correct metadata
- [ ] `GET /api/files/:id/path` for nested folder → returns ancestor chain from root
- [ ] Search by partial filename → returns matching non-trashed items
- [ ] Search excludes directly trashed items
- [ ] Search excludes items with `trashedByAncestorId` set
- [ ] Star a file → `starred: true`; `GET /api/files/starred` includes it
- [ ] Unstar a file → `starred: false`; `GET /api/files/starred` excludes it
- [ ] Rename a file → name updated
- [ ] Rename with invalid characters → 400
- [ ] Move file to different folder → `parentId` updated
- [ ] Move folder into itself → 400
- [ ] Move folder into its own descendant → 400
- [ ] Move into trashed folder → 400
- [ ] Trash a file → `trashedAt` set; excluded from list and search
- [ ] Trash a folder → `trashedAt` set on folder; `trashedByAncestorId` set on all descendants
- [ ] Trash a folder where a child was already directly trashed → child keeps its own `trashedAt`, gains `trashedByAncestorId`
- [ ] `GET /api/files/trash` → returns only top-level trashed items, not inherited-trash descendants
- [ ] Restore a file → `trashedAt` cleared; reappears in list
- [ ] Restore a folder → clears `trashedByAncestorId` on descendants; descendants that were directly trashed remain trashed
- [ ] Restore item whose parent was permanently deleted → restored to root (`parentId = null`)
- [ ] Permanent delete file → DB row gone, S3 object deleted, `storageUsed` decremented
- [ ] Permanent delete folder → all descendant rows and S3 objects deleted, `storageUsed` decremented for each file

### Verify (manual)
- [ ] Create nested folders → list contents → breadcrumb path is correct
- [ ] `GET /api/files?parentId=<id>&foldersOnly=true` → returns folders only
- [ ] Trash a folder → descendants hidden from list and search → restore → descendants reappear (except individually trashed ones)
- [ ] `GET /api/files/trash` → shows only top-level trashed items, not inherited-trash descendants
- [ ] Permanent delete folder → all descendant rows and S3 objects gone, quota decremented
- [ ] `GET /api/storage` increases after upload confirm and decreases after permanent delete
- [ ] Attempt to create folder / upload / move into a trashed folder → 400

---

## Milestone 4 — Bulk Operations and Seed Script

Bulk endpoints, reconciliation script, and a seed script for frontend milestone testing.

### Backend
- [ ] `POST /api/files/bulk-trash` — bulk trash. Body: `{ ids: string[] }`
- [ ] `POST /api/files/bulk-restore` — bulk restore. Body: `{ ids: string[] }`. Falls back to root per item if parent gone
- [ ] `POST /api/files/bulk-delete` — bulk permanent delete. Body: `{ ids: string[] }`
- [ ] `POST /api/files/bulk-move` — bulk move. Body: `{ ids: string[], parentId: string }`
- [ ] `POST /api/files/bulk-download` — stream ZIP via `archiver`; reject >50 files or >500 MB; reject folders
- [ ] Orphaned upload reconciliation script (standalone, runnable via Render Cron)
- [ ] Seed script: creates a test user with nested folders, sample files (via presigned URL flow), starred items, and trashed items for frontend testing

### Tests
- [ ] Bulk trash 3 files → all three have `trashedAt` set
- [ ] Bulk restore 2 trashed files → both restored
- [ ] Bulk restore file whose parent is deleted → restored to root
- [ ] Bulk delete 2 files → DB rows and S3 objects gone, quota decremented
- [ ] Bulk move 3 files to a new folder → all three have updated `parentId`
- [ ] Bulk download 3 files → ZIP streams with correct filenames
- [ ] Bulk download 51 files → 400
- [ ] Bulk download over 500 MB total → 400
- [ ] Bulk download with a folder in selection → 400
- [ ] Reconciliation: stale pending upload with valid S3 object → marked `uploaded`, quota incremented once
- [ ] Reconciliation: stale pending upload with missing S3 object → marked `failed`
- [ ] Seed script runs without errors and creates expected data

### Verify (manual)
- [ ] Bulk restore 2 trashed files → both restored; bulk restore file whose parent is deleted → restored to root
- [ ] Bulk download 3 files → ZIP streams correctly
- [ ] Bulk download 51 files → 400 error
- [ ] Stale pending upload with valid S3 object → reconciliation marks uploaded once; invalid/missing object → marked failed
- [ ] Seed script creates usable test data for subsequent milestones

---

## Milestone 5 — Core Frontend

Main drive UI: navigation, file list, folders, context menu, search, starred, trash.

> **Note:** M5 has no upload UI. Verification assumes test files are created via M4's seed script.

### Frontend
- [ ] App layout: sidebar + header + main content area (`DriveView`)
- [ ] Sidebar: New button (dropdown), nav links (My Drive, Starred, Trash), storage usage bar
- [ ] Storage usage fetch from `GET /api/storage`, with refresh after quota-affecting mutations
- [ ] File list component: columns (name, modified, size), file type icons, empty state
- [ ] Folder navigation: click folder → route to `/drive/folder/:id` → fetch contents
- [ ] Breadcrumbs from `/api/files/:id/path`
- [ ] Context menu (right-click): Open, Download, Rename, Star/Unstar, Move to trash
- [ ] Trash view context menu: Restore, Delete forever
- [ ] Empty trash button using trash listing + `POST /api/files/bulk-delete` (no separate endpoint)
- [ ] New folder modal with invalid-character validation, trimmed names, and reject empty-after-trim input
- [ ] Rename modal with invalid-character validation, trimmed names, and reject empty-after-trim input
- [ ] Search bar in header → navigates to `/drive/search?q=`
- [ ] Starred view
- [ ] Trash view
- [ ] File preview modal (images in `<img>`, PDFs in `<iframe>`)
- [ ] Double-click behavior: folder → navigate, previewable → preview, other → download
- [ ] Pinia files store for current folder state and CRUD operations

### Verify (manual)
- [ ] Create folders, navigate in and out, breadcrumbs update correctly
- [ ] Right-click → Rename → name updates in list
- [ ] Right-click → Star → appears in Starred view
- [ ] Right-click → Move to trash → disappears from list → appears in Trash view
- [ ] Restore from trash → reappears under current parent, or in root if parent no longer exists
- [ ] Delete forever → gone permanently
- [ ] Empty trash → all trash items gone
- [ ] Search by filename → results shown
- [ ] Double-click image → preview modal opens
- [ ] Double-click PDF → preview modal opens
- [ ] Double-click SVG → no preview modal; file downloads instead
- [ ] Double-click .zip → downloads

---

## Milestone 6 — Uploads, Multi-Select, Polish

Upload panel, drag-and-drop, multi-select with bulk actions, keyboard accessibility.

### Frontend
- [ ] Upload panel (bottom-right, collapsible): queue display, per-file progress, retry, cancel
- [ ] Upload composable: bounded queue (max 3 concurrent), presigned URL flow, `XMLHttpRequest` progress tracking
- [ ] Drag-and-drop: `dragenter`/`dragover`/`drop` on file list area, visual overlay
- [ ] New > Upload file button triggers file picker
- [ ] Quota check before upload; show error when over limit
- [ ] Multi-select: click (single), Ctrl+click (toggle), Shift+click (range)
- [ ] Bulk action bar: Move to, Move to trash, Download (context-aware for trash view: Restore via `bulk-restore`, Delete forever)
- [ ] File context menu adds Move to
- [ ] Move modal: lazy-loaded folder tree, prevents cycles
- [ ] Bulk download frontend: single file → direct download, multiple → call `POST /api/files/bulk-download`, folders disabled with explanation
- [ ] Keyboard navigation: arrow keys, Enter to open, Space to toggle select, Shift+Arrow for range, F2 rename, Shift+F10 or Context Menu key to open actions, Esc to close
- [ ] Focus traps in modals, focus restore on close
- [ ] Accessible labels on forms, menus, dialogs

### Verify (manual)
- [ ] Upload 5 files → 3 active + 2 queued → all complete
- [ ] Cancel mid-upload → upload stops, file not in list
- [ ] Retry failed upload → succeeds
- [ ] Upload when quota is full → error shown, upload blocked
- [ ] Drag files onto file list → uploads start
- [ ] Ctrl+click 3 files → bulk bar shows "3 selected" → Move to trash → all 3 trashed
- [ ] Shift+click range → correct range selected
- [ ] Bulk download 2 files → ZIP downloads
- [ ] Bulk download 51 files → rejected with user-facing error
- [ ] Bulk download over `500 MB` total → rejected with user-facing error
- [ ] Select a folder + file → bulk download disabled with explanation
- [ ] Canceled upload remains out of the file list and is later marked failed or cleaned up by reconciliation
- [ ] Attempt to move a folder into its descendant → blocked with user-facing error
- [ ] Arrow keys navigate rows, Enter opens, F2 renames, Shift+F10 opens context menu
- [ ] Tab through modal → focus stays trapped → Esc closes → focus returns to trigger

---

## Milestone 7 — Deployment and Operations

Render deployment, S3 setup, environment wiring, and production-like smoke checks.

### Backend and Infra
- [ ] Create `render.yaml` with web service, Postgres, and cron job definitions
- [ ] Configure environment variables in Render dashboard: `DATABASE_URL`, `JWT_SECRET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET_NAME`, `APP_ORIGIN`, `PORT`
- [ ] Configure S3 bucket with private access and CORS for `PUT` and `GET` from production `APP_ORIGIN`
- [ ] Configure IAM user with scoped policy: `PutObject`, `GetObject`, `DeleteObject`, `HeadObject`
- [ ] Configure Render build/start pipeline: `npm install` → `prisma generate` → `prisma migrate deploy` → `vite build` → `tsc`
- [ ] Configure Render Cron Job for orphaned upload reconciliation

### Verify (manual)
- [ ] Deployed app serves SPA and API from the same origin
- [ ] Login, session bootstrap, and logout work in deployed environment with secure cookies
- [ ] Direct S3 upload works from deployed frontend origin
- [ ] File download and inline preview work in deployed environment
- [ ] Reconciliation job runs successfully in deployed environment
