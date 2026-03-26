# Google Drive Clone - Technical Specification

A multi-account Google Drive clone built as a web development portfolio piece. It is intentionally scoped for desktop web only and optimized for small portfolio-scale datasets rather than production-scale usage.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Data Model](#data-model)
4. [Authentication and Session Model](#authentication-and-session-model)
5. [File Storage and Upload Lifecycle](#file-storage-and-upload-lifecycle)
6. [API Design](#api-design)
7. [Frontend](#frontend)
8. [Features and Behavior Rules](#features-and-behavior-rules)
9. [Testing](#testing)
10. [Deployment and Operations](#deployment-and-operations)
11. [Constraints and Non-Goals](#constraints-and-non-goals)

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────┐
│                     Vue 3 SPA                              │
│  (Vue Router · Pinia · Tailwind CSS · TypeScript)          │
└───────────────────┬───────────────────────────┬────────────┘
                    │ Same-origin JSON API      │ Presigned URLs
                    ▼                           ▼
┌──────────────────────────────────┐   ┌─────────────────────┐
│ Express 5 (TypeScript)           │   │ AWS S3              │
│ Prisma ORM                       │   │ File blobs          │
│ Cookie auth + CSRF middleware    │   │ Direct uploads      │
│ Rate limiting                    │   │ Direct downloads    │
└───────────────────┬──────────────┘   └─────────────────────┘
                    │
                    ▼
┌──────────────────────────────────┐
│ PostgreSQL (Render managed)      │
│ Users, metadata, tree, quotas,   │
│ trash state, upload state        │
└──────────────────────────────────┘
```

**Hosting model**
- The SPA and API are served from the same origin by Express on Render.
- S3 is used only for binary file storage via presigned URLs.
- The app supports real multi-account isolation: each registered user has separate files, quotas, and S3 key prefixes.

**Data flow - upload**
1. Client requests a presigned PUT URL from `POST /api/files/upload-url`.
2. API validates session, CSRF token, quota, per-file size limit, and upload rate limit.
3. API creates a pending file record and returns `{ fileId, uploadUrl }`.
4. Client uploads directly to S3 via `XMLHttpRequest` to track progress and support cancellation.
5. Client calls `PATCH /api/files/:id/confirm`.
6. API verifies the object via `HeadObject`, marks the file as uploaded, and increments quota exactly once.
7. A reconciliation job later finalizes or cleans up stale pending uploads if the browser never reaches confirm.

**Data flow - download**
1. Client requests `GET /api/files/:id/download`.
2. API validates ownership and returns a short-lived presigned GET URL with attachment headers.
3. Client navigates to the URL to download from S3 directly.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | Vue 3 (Composition API) + TypeScript |
| Routing | Vue Router 4 |
| State management | Pinia |
| Styling | Tailwind CSS |
| Backend runtime | Node.js + Express 5 |
| Backend language | TypeScript |
| ORM | Prisma |
| Database | PostgreSQL (Render managed) |
| File storage | AWS S3 |
| Auth | Email/password + stateless JWT in HttpOnly cookie |
| CSRF protection | Double-submit cookie pattern |
| Rate limiting | `express-rate-limit` |
| ZIP downloads | `archiver` |
| Deployment | Render Web Service + Render Postgres + Render Cron/Background job |

---

## Data Model

### Users

```prisma
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  storageUsed  BigInt   @default(0)            // bytes
  storageLimit BigInt   @default(1073741824)   // 1 GB default
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  files        File[]
}
```

### Files

Files and folders share one table. `isFolder` is the discriminator.

```prisma
model File {
  id                  String    @id @default(uuid())
  name                String
  mimeType            String?                       // null for folders
  size                BigInt    @default(0)        // 0 for folders
  isFolder            Boolean   @default(false)
  starred             Boolean   @default(false)
  s3Key               String?                      // null for folders
  uploadStatus        String    @default("pending") // "pending" | "uploaded" | "failed"

  parentId            String?                      // null = My Drive root
  parent              File?     @relation("FileTree", fields: [parentId], references: [id])
  children            File[]    @relation("FileTree")

  userId              String
  user                User      @relation(fields: [userId], references: [id])

  trashedAt           DateTime?                    // directly trashed by user
  trashedByAncestorId String?                     // inherited trash from a parent folder

  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  @@index([userId, parentId])
  @@index([userId, starred])
  @@index([userId, name])
  @@index([userId, trashedAt])
  @@index([userId, trashedByAncestorId])
  @@index([userId, uploadStatus])
}
```

### Data Model Rules
- `parentId = null` means the item lives in My Drive root. There is no explicit root row.
- Duplicate names are allowed within the same folder.
- `s3Key` uses the format `{userId}/{uuid}.{ext}`.
- `uploadStatus` tracks the direct-to-S3 lifecycle.
- A file is considered visible in normal views only when both `trashedAt` and `trashedByAncestorId` are `null`.

### Trash State Rules
- Direct trash sets the target row's `trashedAt = now()`.
- Trashing a folder cascades `trashedByAncestorId = <folderId>` to all descendants.
- Descendants that were already directly trashed keep their own `trashedAt`; the ancestor marker is added on top.
- Restoring a folder clears only descendant rows where `trashedByAncestorId = <folderId>`.
- If a descendant had already been directly trashed, it remains in trash after parent restore because its own `trashedAt` is still set.
- Restore uses the item's current `parentId`; if that parent no longer exists, restore to root.

### Scale Assumption
- The application is intentionally designed for hundreds to low-thousands of items per user.
- No pagination is implemented; this is an explicit portfolio-scope tradeoff, not an omission.

---

## Authentication and Session Model

### Registration
- `POST /api/auth/register`
- Request body: `{ email, password }`
- Passwords are hashed with bcrypt using cost factor `12`.
- On success, the server:
  - creates the user
  - sets the auth cookie
  - sets the CSRF cookie
  - returns the authenticated user summary

### Login
- `POST /api/auth/login`
- Request body: `{ email, password }`
- On success, the server sets the same cookies as registration and returns the authenticated user summary.

### Session Bootstrap
- `GET /api/auth/session`
- Used by the SPA on initial load and refresh.
- Returns current user metadata if the auth cookie is valid.
- Returns `401` if the session is missing or expired.

### Logout
- `POST /api/auth/logout`
- Requires a valid CSRF token.
- Clears both auth and CSRF cookies.

### JWT Cookie Strategy
- One stateless access token only; no refresh token flow.
- Token lifetime: `1 hour`.
- JWT payload: `{ userId, email, iat, exp }`.
- Signed with `HS256` using `JWT_SECRET`.
- Stored in cookie:
  - name: `drive_session`
  - `HttpOnly`
  - `Secure` (production only; omitted in local development to allow HTTP on localhost)
  - `SameSite=Lax`
  - path `/`
- No token revocation is implemented beyond expiry. This is an accepted portfolio tradeoff.

### CSRF Protection
- Same-origin deployment is required.
- Mutating requests (`POST`, `PATCH`, `DELETE`) use double-submit CSRF protection.
- Server sets a readable `csrf_token` cookie.
- Client reads `csrf_token` and sends it in `X-CSRF-Token`.
- Server rejects mutating requests when the header and cookie do not match.

### Rate Limiting
- `POST /api/auth/register`: `10 requests / 15 minutes / IP`
- `POST /api/auth/login`: `10 requests / 15 minutes / IP`
- `POST /api/files/upload-url`: `100 requests / 15 minutes / IP`

### Password Rules
- Minimum 8 characters
- No arbitrary complexity requirements beyond length

### Expired Session UX
- Any API `401` clears auth-related client state.
- The router redirects to `/login?redirect=<current-route>`.
- After successful login, the app navigates back to the original route.

---

## File Storage and Upload Lifecycle

### S3 Configuration
- Provider: AWS S3
- Bucket model: one private bucket, partitioned by user ID prefix
- Public access: blocked
- Region: same region or nearest practical region to Render deployment
- S3 CORS: allow required `PUT` and `GET` requests from the app origin

### S3 Key Format

```text
{userId}/{uuid}.{ext}
```

Example: `a1b2c3d4/550e8400-e29b-41d4-a716-446655440000.pdf`

### File Limits
- Maximum file size: `100 MB`
- Default per-user quota: `1 GB`
- Quota is enforced before upload URL generation and updated on successful confirmation.

### Upload Queue Rules
- The client supports a bounded queue with at most `3` active uploads at once.
- Additional files remain queued until a slot frees up.
- Each upload item can be in one of these states:
  - queued
  - uploading
  - completed
  - failed
  - canceled
- Users can retry failed uploads.
- Users can cancel in-progress uploads via `XMLHttpRequest.abort()`.

### Upload Confirmation Rules
- `PATCH /api/files/:id/confirm` is idempotent.
- If the file is already confirmed, the endpoint returns success without mutating quota again.
- Confirmation verifies the object exists and matches expected metadata before switching status to `uploaded`.

### Orphaned Upload Reconciliation
- A periodic reconciliation process runs for pending uploads older than `20 minutes`.
- For each stale pending row:
  - if the S3 object exists at the expected size, mark it `uploaded` and increment quota exactly once
  - if the object is missing or invalid, mark the row `failed`
  - if a stray object exists for a definitively failed record, delete it
- This reconciliation runs outside the request path through Render Cron or a background worker.

### Preview Rules
- Previewable types:
  - JPEG
  - PNG
  - GIF
  - WebP
  - PDF
- SVG is download-only, not previewable.
- Non-previewable files download instead of opening a preview modal.

### Permanent Delete
- Deleting a file removes both the database row and the S3 object.
- Deleting a folder recursively deletes all descendant rows and their S3 objects.
- `storageUsed` is decremented only for successfully uploaded files that are actually being removed.

---

## API Design

All endpoints return JSON unless the route is explicitly a streamed download. Error shape is:

```json
{ "error": "Human-readable message" }
```

### Auth Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account, set auth + CSRF cookies, return current user summary. Rate limited. |
| POST | `/api/auth/login` | Authenticate, set auth + CSRF cookies, return current user summary. Rate limited. |
| GET | `/api/auth/session` | Return current authenticated user from cookie session. |
| POST | `/api/auth/logout` | Clear auth + CSRF cookies. Requires CSRF header. |

### File Routes

All file routes require a valid session cookie. All mutating file routes also require `X-CSRF-Token`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/files` | List folder contents. Query: `parentId=<id>` optional, `foldersOnly=true` optional. Excludes rows where `trashedAt` or `trashedByAncestorId` is non-null. Sort folders first, then files, both alphabetically. |
| GET | `/api/files/search` | Search visible files by filename with `ILIKE '%term%'`. Excludes inherited-trash descendants. |
| GET | `/api/files/starred` | List all starred visible items. |
| GET | `/api/files/trash` | List top-level trash entries. Includes directly trashed items and top-level trashed folders, but not descendants hidden only by ancestor trash. |
| GET | `/api/files/:id` | Get single file or folder metadata. |
| GET | `/api/files/:id/path` | Return breadcrumb ancestors from root to parent. |
| GET | `/api/files/:id/download` | Return `{ url }` for presigned attachment download. |
| GET | `/api/files/:id/preview` | Return `{ url, mimeType }` for inline preview of raster images and PDFs only. |
| POST | `/api/files/folder` | Create folder. Body: `{ name, parentId? }`. Rejects if `parentId` refers to a trashed folder. |
| POST | `/api/files/upload-url` | Create pending record and return `{ fileId, uploadUrl }`. Body: `{ name, mimeType, size, parentId? }`. Enforces auth, CSRF, file limit, quota, and rate limit. Rejects if `parentId` refers to a trashed folder. |
| PATCH | `/api/files/:id/confirm` | Idempotently finalize an uploaded file and increment quota exactly once. |
| PATCH | `/api/files/:id` | Rename, star/unstar, or move. Body: `{ name?, starred?, parentId? }`. Move rejects if target `parentId` is trashed or would create a cycle. |
| PATCH | `/api/files/:id/trash` | Move an item to trash. Cascades `trashedByAncestorId` when the item is a folder. |
| PATCH | `/api/files/:id/restore` | Restore an item from trash. Clears direct trash on the item and clears descendant `trashedByAncestorId` only when restoring a folder. Falls back to root if current parent no longer exists. |
| DELETE | `/api/files/:id` | Permanently delete one item. Recursively deletes descendants and S3 objects for folders. |
| POST | `/api/files/bulk-trash` | Bulk trash. Body: `{ ids: string[] }`. |
| POST | `/api/files/bulk-delete` | Bulk permanent delete. Body: `{ ids: string[] }`. |
| POST | `/api/files/bulk-move` | Bulk move. Body: `{ ids: string[], parentId: string }`. |
| POST | `/api/files/bulk-restore` | Bulk restore from trash. Body: `{ ids: string[] }`. Falls back to root per item if parent no longer exists. |
| POST | `/api/files/bulk-download` | Stream a ZIP for multiple selected files. Rejects requests over `50 files` or `500 MB` total. |

### Storage Route

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/storage` | Return `{ used, limit }` in bytes for the current user. |

### Response Notes
- Session-bearing responses do not return a bearer token for local storage.
- For small portfolio datasets, list and search endpoints are unpaginated by design.
- `bulk-download` accepts file IDs only. If any selected item is a folder, the API returns `400 Bad Request` and the UI should prevent that request in normal flows.

---

## Frontend

### Project Structure

```text
src/
├── api/
│   ├── auth.ts
│   ├── files.ts
│   └── storage.ts
├── components/
│   ├── auth/
│   │   ├── LoginForm.vue
│   │   └── RegisterForm.vue
│   ├── files/
│   │   ├── Breadcrumbs.vue
│   │   ├── BulkActionBar.vue
│   │   ├── FileList.vue
│   │   ├── FilePreview.vue
│   │   └── FileRow.vue
│   ├── layout/
│   │   ├── AppHeader.vue
│   │   ├── AppSidebar.vue
│   │   └── UploadPanel.vue
│   └── modals/
│       ├── MoveModal.vue
│       ├── NewFolderModal.vue
│       └── RenameModal.vue
├── composables/
│   ├── useSelection.ts
│   └── useUpload.ts
├── router/
│   └── index.ts
├── stores/
│   ├── auth.ts
│   ├── files.ts
│   └── upload.ts
├── types/
│   └── index.ts
├── views/
│   ├── DriveView.vue
│   ├── LoginView.vue
│   └── RegisterView.vue
├── App.vue
└── main.ts
```

### Frontend Data Access Rules
- API requests use `fetch` or Axios with `credentials: 'include'`.
- The client never stores the auth token in `localStorage` or `sessionStorage`.
- Mutating API requests automatically attach `X-CSRF-Token` from the `csrf_token` cookie.
- The auth store bootstraps from `GET /api/auth/session` on app startup.

### Routes

| Path | View | Auth Required |
|------|------|--------------|
| `/login` | LoginView | No |
| `/register` | RegisterView | No |
| `/drive` | DriveView (root) | Yes |
| `/drive/folder/:id` | DriveView (folder contents) | Yes |
| `/drive/starred` | DriveView (starred) | Yes |
| `/drive/trash` | DriveView (trash) | Yes |
| `/drive/search?q=` | DriveView (search results) | Yes |

### Core UI Components

#### Sidebar
- New button with:
  - Upload file
  - New folder
- Navigation links:
  - My Drive
  - Starred
  - Trash
- Storage bar:
  - text: `X MB of 1 GB used`
  - progress colors:
    - green: under 50%
    - yellow: 50% to 80%
    - red: over 80%

#### File List
- List view only; no grid view.
- Columns:
  - Name
  - Last modified
  - File size
- Rows show icon, name, modified date, and size.
- Sorting is fixed: folders first, then files, alphabetical within each group.
- Empty state: `Drop files here or use the New button`.

#### Context Menu
- Custom right-click menu for file rows.
- Standard view actions:
  - Open
  - Download
  - Rename
  - Star/Unstar
  - Move to
  - Move to trash
- Trash view actions:
  - Restore
  - Delete forever

#### Upload Panel
- Docked to the bottom-right.
- Collapsible.
- Shows queued, active, failed, canceled, and completed uploads.
- Displays per-file progress and aggregate status.
- Uploads continue while navigating within the app.

#### Preview Modal
- Opens for raster images and PDFs only.
- Includes:
  - filename
  - close action
  - download action
- PDFs render in an `iframe` using the presigned inline preview URL.

#### Move Modal
- Loads folders lazily on expand using `GET /api/files?parentId=<id>&foldersOnly=true`.
- Does not fetch the entire tree up front.
- Prevents moving a folder into itself or any descendant.

### Keyboard and Accessibility Requirements
- Arrow keys move focused row.
- `Enter` opens the focused folder or file.
- `Space` toggles selection on the focused item.
- `Shift + Arrow` extends selection.
- `F2` starts rename.
- `Shift + F10` or Context Menu key opens the action menu.
- `Esc` closes menus/modals and clears transient UI.
- Modals use focus trap and restore focus to the triggering element on close.
- Forms, menus, and dialogs must have accessible labels and focus states.

### Desktop Scope
- The UI is desktop-web only.
- Mobile-responsive behavior is explicitly out of scope.

---

## Features and Behavior Rules

### 1. Registration and Login
- Visitors can create separate accounts with email and password.
- Each account receives isolated metadata, quota tracking, and file namespace.
- Login and registration complete in place and route into the drive UI once session bootstrap succeeds.

### 2. File Upload
- Upload sources:
  - New > Upload file
  - drag-and-drop onto file list
- Preflight checks:
  - client-side file size
  - server-side file size
  - server-side quota
  - upload rate limit
- Uploads use direct S3 PUT with progress events.
- A confirmed upload appears in the current list after successful finalize.

### 3. Folder Creation
- New > New folder
- Modal input with validation:
  - disallow `/ \ : * ? " < > |`
  - trim leading and trailing whitespace
  - reject empty names after trimming

### 4. Rename
- Triggered by context menu or `F2`.
- Rename uses a modal dialog.
- Uses the same invalid-character validation as folder creation.

### 5. Move
- Uses the lazy-loaded Move modal.
- Validation rules:
  - cannot move an item into itself
  - cannot move a folder into its descendant
  - cannot move into a trashed folder

### 6. Star/Unstar
- Toggled from context menu or row action.
- Starred view shows all visible starred items regardless of folder.

### 7. Trash
- Trashing a file sets `trashedAt`.
- Trashing a folder sets its own `trashedAt` and cascades `trashedByAncestorId` to descendants.
- Standard lists and search exclude anything with either trash field set.
- Trash view shows top-level trashed items rather than every descendant row.
- Restore behavior:
  - clearing direct trash on the selected item
  - clearing descendant ancestor-trash markers only when restoring a folder
  - preserving descendants that had been directly trashed before the parent restore
  - restoring to root if the current parent no longer exists
- Empty trash permanently deletes all items currently visible in trash for the current user.

### 8. Search
- Search is filename-only.
- Route: `/drive/search?q=<term>`
- Query implementation: case-insensitive partial match via `ILIKE`.
- Search excludes rows hidden by direct or inherited trash.

### 9. Preview and Download
- Double-click behavior:
  - folder -> navigate into folder
  - raster image or PDF -> open preview
  - all other files -> download
- SVG always downloads.

### 10. Multi-Select and Bulk Actions
- Supported selection behavior:
  - click -> single select
  - Ctrl+click -> toggle one row
  - Shift+click -> range select
- Bulk action bar appears when at least one row is selected.
- Standard bulk actions:
  - Move to
  - Move to trash
  - Download
- Trash bulk actions:
  - Restore
  - Delete forever
- Bulk download rules:
  - single file -> regular file download
  - multiple files -> `POST /api/files/bulk-download`
  - folders are not eligible; if any folder is selected, disable bulk download and show a short explanation
  - reject if selection exceeds `50 files` or `500 MB`
  - show clear user-facing error when rejected

---

## Testing

### Auth and Session
- register sets auth and CSRF cookies
- login sets auth and CSRF cookies
- logout clears both cookies
- `GET /api/auth/session` rehydrates the app on refresh
- mutating routes reject missing or invalid CSRF token
- rate limits apply to login, register, and upload URL requests
- expired session redirects to login and restores intended route after re-auth

### Trash
- trashing a folder hides descendants from standard listing and search
- restoring a folder preserves children that were directly trashed before the parent was trashed
- restoring an item with a missing parent moves it to root
- trash view shows top-level trash entries rather than inherited-trash descendants

### Uploads
- only `3` uploads run concurrently
- queued uploads start as slots become available
- cancel stops an in-progress upload
- retry works after failure
- confirm is idempotent and does not double-count storage
- reconciliation finalizes valid orphaned uploads and marks bad pending rows failed

### Bulk Download
- ZIP download works under limits
- ZIP download rejects over `50 files`
- ZIP download rejects over `500 MB`

### Accessibility
- keyboard row navigation works
- keyboard multi-select works
- context menu is keyboard accessible
- modal focus trap works
- focus returns to trigger after closing dialogs

---

## Deployment and Operations

### Render Configuration

**Web Service**
- Build command: `npm run build`
- Start command: `node dist/server.js`
- Serves:
  - built Vue assets
  - same-origin API routes

**PostgreSQL**
- Render managed PostgreSQL

**Reconciliation Worker**
- Render Cron Job or background worker runs pending-upload reconciliation on a schedule

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret |
| `AWS_ACCESS_KEY_ID` | IAM access key |
| `AWS_SECRET_ACCESS_KEY` | IAM secret |
| `AWS_REGION` | S3 region |
| `S3_BUCKET_NAME` | Private bucket name |
| `APP_ORIGIN` | Same-origin app URL used for S3 CORS allowlist and absolute redirects if needed |
| `PORT` | Render-provided port |

### Build Pipeline
1. `npm install`
2. `npx prisma generate`
3. `npx prisma migrate deploy`
4. `vite build`
5. `tsc`
6. Express serves `dist/client` and handles `/api/*`

### S3 Setup
- Block all public access
- CORS allows required `PUT` and `GET` from `APP_ORIGIN`
- IAM policy allows:
  - `s3:PutObject`
  - `s3:GetObject`
  - `s3:DeleteObject`
  - `s3:HeadObject`

---

## Constraints and Non-Goals

### Non-Goals
- real-time collaboration
- sharing files with other users
- file version history
- Office document rendering
- audio/video streaming or transcoding
- offline support or service workers
- mobile-responsive layout
- dark mode
- in-app drag-to-move between folders
- folder upload
- OAuth or social login
- full-text content search
- thumbnails or grid view
- per-folder sort preferences
- CDN or CloudFront setup
- integration with unrelated monorepo projects

### Accepted Tradeoffs
- Stateless cookie JWT with no revocation beyond expiry
- No refresh token flow
- No multipart upload; max file size remains 100 MB
- Single `File` table with nullable file-only fields
- No pagination because the target dataset size is intentionally small
- Render cold starts are acceptable for a portfolio demo
