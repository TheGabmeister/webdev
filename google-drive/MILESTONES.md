# Milestones

Each milestone is self-contained and testable before moving to the next.

---

## Milestone 1 — Foundation

Scaffolding, database, auth system, and auth UI.

### Backend
- [ ] Initialize Node.js + Express 5 + TypeScript project
- [ ] Configure Prisma with PostgreSQL
- [ ] Create `User` and `File` models, generate migration
- [ ] Implement `POST /api/auth/register` and `POST /api/auth/login` with bcrypt
- [ ] Implement `GET /api/auth/session` for SPA bootstrap
- [ ] Implement `POST /api/auth/logout`
- [ ] JWT in `HttpOnly` cookie (`drive_session`)
- [ ] CSRF double-submit cookie pattern (`csrf_token` cookie + `X-CSRF-Token` header)
- [ ] Auth middleware on `/api/*` (exclude `/api/auth/*`)
- [ ] Rate limiting on register, login

### Frontend
- [ ] Initialize Vue 3 + TypeScript + Vite + Vue Router + Pinia + Tailwind
- [ ] Configure build so Express serves the SPA from `dist/client/`
- [ ] Auth store with session bootstrap from `GET /api/auth/session`
- [ ] CSRF: read `csrf_token` cookie, attach `X-CSRF-Token` on mutating requests
- [ ] Login and Register views with form validation
- [ ] Router guard: redirect unauthenticated users to `/login?redirect=<route>`
- [ ] Redirect to `/drive` after successful login/register
- [ ] Handle 401 responses globally: clear auth state, redirect to login

### Verify
- [ ] Register a new user → cookie is set → redirected to `/drive`
- [ ] Refresh the page → session rehydrates from `GET /api/auth/session`
- [ ] Logout → cookie cleared → redirected to `/login`
- [ ] Mutating request without CSRF token → 401
- [ ] 11th login attempt in 15 minutes → 429

---

## Milestone 2 — File API + S3

All backend file operations. No frontend beyond what's needed to manually test.

### Backend
- [ ] AWS S3 client configuration
- [ ] `POST /api/files/upload-url` — validate quota, file size, rate limit; create pending record; return presigned PUT URL
- [ ] `PATCH /api/files/:id/confirm` — idempotent; verify via `HeadObject`; flip status; increment quota once
- [ ] `GET /api/files/:id/download` — presigned GET with `Content-Disposition: attachment`
- [ ] `GET /api/files/:id/preview` — presigned GET with `Content-Disposition: inline` (images + PDF only)
- [ ] `POST /api/files/folder` — create folder with name validation
- [ ] `GET /api/files` — list folder contents; exclude trashed; folders first, alphabetical
- [ ] `GET /api/files/:id` — single item metadata
- [ ] `GET /api/files/:id/path` — breadcrumb ancestor chain
- [ ] `GET /api/files/search` — `ILIKE` filename search, exclude trashed
- [ ] `GET /api/files/starred` — all visible starred items
- [ ] `GET /api/files/trash` — top-level trashed items only
- [ ] `PATCH /api/files/:id` — rename, star/unstar, move (with cycle detection for folders)
- [ ] `PATCH /api/files/:id/trash` — set `trashedAt`; cascade `trashedByAncestorId` for folders
- [ ] `PATCH /api/files/:id/restore` — clear direct trash; clear descendant ancestor-trash; fall back to root if parent gone
- [ ] `DELETE /api/files/:id` — permanent delete; recursive for folders; remove S3 objects; decrement quota
- [ ] `POST /api/files/bulk-trash`, `bulk-delete`, `bulk-move`
- [ ] `POST /api/files/bulk-download` — stream ZIP via `archiver`; reject >50 files or >500 MB; reject folders
- [ ] `GET /api/storage` — return `{ used, limit }`
- [ ] Orphaned upload reconciliation script (standalone, runnable via Render Cron)

### Verify
- [ ] Upload a file via `curl` using presigned URL → confirm → file record is `uploaded`, quota incremented
- [ ] Download returns presigned URL with correct filename
- [ ] Create nested folders → list contents → breadcrumb path is correct
- [ ] Trash a folder → descendants hidden from list and search → restore → descendants reappear (except individually trashed ones)
- [ ] Permanent delete folder → all descendant rows and S3 objects gone, quota decremented
- [ ] Bulk download 3 files → ZIP streams correctly
- [ ] Bulk download 51 files → 400 error

---

## Milestone 3 — Core Frontend

Main drive UI: navigation, file list, folders, context menu, search, starred, trash.

### Frontend
- [ ] App layout: sidebar + header + main content area (`DriveView`)
- [ ] Sidebar: New button (dropdown), nav links (My Drive, Starred, Trash), storage usage bar
- [ ] File list component: columns (name, modified, size), file type icons, empty state
- [ ] Folder navigation: click folder → route to `/drive/folder/:id` → fetch contents
- [ ] Breadcrumbs from `/api/files/:id/path`
- [ ] Context menu (right-click): Open, Download, Rename, Star/Unstar, Move to, Move to trash
- [ ] Trash view context menu: Restore, Delete forever
- [ ] Empty trash button
- [ ] New folder modal with name validation
- [ ] Rename modal with name validation
- [ ] Search bar in header → navigates to `/drive/search?q=`
- [ ] Starred view
- [ ] Trash view
- [ ] File preview modal (images in `<img>`, PDFs in `<iframe>`)
- [ ] Double-click behavior: folder → navigate, previewable → preview, other → download
- [ ] Pinia files store for current folder state and CRUD operations

### Verify
- [ ] Create folders, navigate in and out, breadcrumbs update correctly
- [ ] Right-click → Rename → name updates in list
- [ ] Right-click → Star → appears in Starred view
- [ ] Right-click → Move to trash → disappears from list → appears in Trash view
- [ ] Restore from trash → reappears in original folder
- [ ] Delete forever → gone permanently
- [ ] Empty trash → all trash items gone
- [ ] Search by filename → results shown
- [ ] Double-click image → preview modal opens
- [ ] Double-click PDF → preview modal opens
- [ ] Double-click .zip → downloads

---

## Milestone 4 — Uploads, Multi-Select, Polish

Upload panel, drag-and-drop, multi-select with bulk actions, keyboard accessibility.

### Frontend
- [ ] Upload panel (bottom-right, collapsible): queue display, per-file progress, retry, cancel
- [ ] Upload composable: bounded queue (max 3 concurrent), presigned URL flow, `XMLHttpRequest` progress tracking
- [ ] Drag-and-drop: `dragenter`/`dragover`/`drop` on file list area, visual overlay
- [ ] New > Upload file button triggers file picker
- [ ] Quota check before upload; show error when over limit
- [ ] Multi-select: click (single), Ctrl+click (toggle), Shift+click (range)
- [ ] Bulk action bar: Move to, Move to trash, Download (context-aware for trash view: Restore, Delete forever)
- [ ] Move modal: lazy-loaded folder tree, prevents cycles
- [ ] Bulk download: single file → direct download, multiple → ZIP, folders disabled with explanation
- [ ] Keyboard navigation: arrow keys, Enter to open, Space to toggle select, Shift+Arrow for range, F2 rename, Esc to close
- [ ] Focus traps in modals, focus restore on close
- [ ] Accessible labels on forms, menus, dialogs

### Verify
- [ ] Upload 5 files → 3 active + 2 queued → all complete
- [ ] Cancel mid-upload → upload stops, file not in list
- [ ] Retry failed upload → succeeds
- [ ] Upload when quota is full → error shown, upload blocked
- [ ] Drag files onto file list → uploads start
- [ ] Ctrl+click 3 files → bulk bar shows "3 selected" → Move to trash → all 3 trashed
- [ ] Shift+click range → correct range selected
- [ ] Bulk download 2 files → ZIP downloads
- [ ] Select a folder + file → bulk download disabled with explanation
- [ ] Arrow keys navigate rows, Enter opens, F2 renames
- [ ] Tab through modal → focus stays trapped → Esc closes → focus returns to trigger
