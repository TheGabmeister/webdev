# Google Drive Clone — Technical Specification

A single-user Google Drive clone built as a web development portfolio piece. Web only — no desktop or mobile clients.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Data Model](#data-model)
4. [Authentication](#authentication)
5. [File Storage (S3)](#file-storage-s3)
6. [API Design](#api-design)
7. [Frontend](#frontend)
8. [Features](#features)
9. [Deployment](#deployment)
10. [Constraints & Non-Goals](#constraints--non-goals)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Vue 3 SPA                           │
│  (Vue Router · Pinia · Tailwind CSS · TypeScript)       │
└──────────────┬──────────────────────┬───────────────────┘
               │ REST API             │ Presigned URLs
               ▼                      ▼
┌──────────────────────────┐   ┌──────────────┐
│   Express (TypeScript)   │   │   AWS S3      │
│   JWT auth middleware     │   │   File blobs  │
│   Prisma ORM             │   │               │
└──────────────┬───────────┘   └───────────────┘
               │
               ▼
┌──────────────────────────┐
│  PostgreSQL (Render)     │
│  File metadata, users,   │
│  folder tree, quotas     │
└──────────────────────────┘
```

**Data flow — upload:**
1. Client requests a presigned PUT URL from the API (`POST /api/files/upload-url`)
2. API validates quota, generates presigned URL, returns it + a file record ID
3. Client uploads directly to S3 via presigned URL, tracking progress with `XMLHttpRequest`
4. Client confirms upload completion to API (`PATCH /api/files/:id/confirm`)
5. API verifies the S3 object exists, marks file record as `uploaded`

**Data flow — download:**
1. Client requests a presigned GET URL from the API (`GET /api/files/:id/download`)
2. API generates a short-lived presigned URL with `Content-Disposition: attachment; filename="original-name.pdf"`
3. Client redirects the browser to the presigned URL

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
| Auth | Email/password + stateless JWT (jsonwebtoken) |
| Deployment | Render (Web Service + Postgres) |

---

## Data Model

### Users

```prisma
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  passwordHash  String
  storageUsed   BigInt   @default(0)   // bytes
  storageLimit  BigInt   @default(1073741824) // 1 GB default
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  files         File[]
}
```

### Files (files and folders share one table)

```prisma
model File {
  id          String    @id @default(uuid())
  name        String                        // original filename, duplicates allowed
  mimeType    String?                       // null for folders
  size        BigInt    @default(0)         // bytes, 0 for folders
  isFolder    Boolean   @default(false)
  starred     Boolean   @default(false)
  s3Key       String?                       // null for folders, "{userId}/{uuid}.{ext}" for files
  uploadStatus String   @default("pending") // "pending" | "uploaded" | "failed"

  parentId    String?                       // null = root level ("My Drive")
  parent      File?     @relation("FileTree", fields: [parentId], references: [id])
  children    File[]    @relation("FileTree")

  userId      String
  user        User      @relation(fields: [userId], references: [id])

  trashedAt   DateTime?                     // null = not trashed
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([userId, parentId])              // folder listing queries
  @@index([userId, trashedAt])             // trash listing queries
  @@index([userId, starred])               // starred listing queries
  @@index([userId, name])                  // search queries
}
```

**Key design decisions:**
- Files and folders in one table — `isFolder` discriminates. Simplifies the tree model and queries.
- `parentId = null` means root level (My Drive). There is no explicit root folder row.
- Duplicate names are allowed in the same folder — files are identified by UUID, not path.
- `s3Key` follows the pattern `{userId}/{uuid}.{ext}` — human-debuggable in the S3 console.
- `uploadStatus` tracks the presigned URL flow: file record created at "pending", flipped to "uploaded" after client confirms. A background job (or on-demand cleanup) can purge stale "pending" records.

---

## Authentication

### Registration
- `POST /api/auth/register` — email + password
- Password hashed with bcrypt (cost factor 12)
- Returns JWT access token

### Login
- `POST /api/auth/login` — email + password
- Verifies bcrypt hash
- Returns JWT access token

### JWT Strategy
- **Stateless** — no server-side token store, no refresh tokens
- Access token expires in **1 hour**
- Payload: `{ userId, email, iat, exp }`
- Signed with `HS256` using a server-side secret (`JWT_SECRET` env var)
- Sent as `Authorization: Bearer <token>` header on every API request
- **No revocation mechanism** — accepted tradeoff for a single-user portfolio piece. If this were production, we'd add a token version column or refresh token allowlist.

### Auth Middleware
- Express middleware validates JWT on all `/api/*` routes except `/api/auth/*`
- Invalid/expired tokens return `401 Unauthorized`
- Decoded `userId` is attached to `req.user` for downstream handlers

### Password Requirements
- Minimum 8 characters
- No other complexity requirements (avoidance of security theater)

---

## File Storage (S3)

### Configuration
- **Provider:** AWS S3
- **Bucket:** Single bucket, partitioned by user ID in key prefix
- **Region:** `us-east-1` (or whichever is closest to Render deployment)
- **CORS:** Configured to allow PUT from the frontend origin (for presigned uploads)

### S3 Key Format
```
{userId}/{uuid}.{ext}
```
Example: `a1b2c3d4/550e8400-e29b-41d4-a716-446655440000.pdf`

- UUID ensures no collisions
- Extension preserved for debuggability in S3 console
- Original filename stored only in the database

### Presigned URLs

**Upload (PUT):**
- Generated by `POST /api/files/upload-url`
- Expires in 15 minutes
- Scoped to specific S3 key and content type
- Client uploads directly to S3, bypassing the application server

**Download (GET):**
- Generated by `GET /api/files/:id/download`
- Expires in 5 minutes
- Includes `Content-Disposition: attachment; filename="original-name.pdf"` so the browser downloads with the correct filename
- Response header override set via `ResponseContentDisposition` parameter on the presigned URL

### File Size Limit
- **100 MB maximum** per file
- Enforced in two places:
  1. Client-side: check `file.size` before requesting presigned URL
  2. Server-side: include `Content-Length` condition on the presigned URL

### Storage Quota
- Each user has a `storageLimit` (default 1 GB) and tracked `storageUsed`
- Before generating a presigned upload URL, the API checks: `storageUsed + requestedFileSize <= storageLimit`
- If over quota, return `413 Payload Too Large` with a message
- `storageUsed` is incremented on upload confirmation, decremented on permanent delete
- The sidebar displays a usage bar: "X MB of Y GB used"

### S3 Cleanup
- When a file is permanently deleted, the API deletes the S3 object in the same request
- Stale "pending" upload records (presigned URL generated but never confirmed) should be cleaned up periodically — either via a cron job or lazily on next folder listing

---

## API Design

All endpoints return JSON. Errors follow the format `{ error: string }`.

### Auth Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account, return JWT |
| POST | `/api/auth/login` | Authenticate, return JWT |

### File Routes (all require auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/files` | List files in a folder. Query: `?parentId=<id>` (omit for root). Returns files where `trashedAt IS NULL`, sorted alphabetically (folders first). |
| GET | `/api/files/search` | Search by filename. Query: `?q=<term>`. Returns matching non-trashed files via `ILIKE '%term%'`. |
| GET | `/api/files/starred` | List all starred, non-trashed files. |
| GET | `/api/files/trash` | List top-level trashed items (items whose `trashedAt IS NOT NULL` and whose parent is not trashed). |
| GET | `/api/files/:id` | Get single file/folder metadata. |
| GET | `/api/files/:id/download` | Generate presigned GET URL, return `{ url }`. |
| GET | `/api/files/:id/path` | Return ancestor chain for breadcrumb rendering: `[{ id, name }, ...]` from root to parent. |
| POST | `/api/files/folder` | Create a folder. Body: `{ name, parentId? }`. |
| POST | `/api/files/upload-url` | Request presigned upload URL. Body: `{ name, mimeType, size, parentId? }`. Returns `{ uploadUrl, fileId }`. Validates quota and file size. |
| PATCH | `/api/files/:id/confirm` | Confirm upload completed. Verifies S3 object exists via `HeadObject`, sets `uploadStatus = "uploaded"`, increments `storageUsed`. |
| PATCH | `/api/files/:id` | Update file metadata. Body: `{ name?, starred?, parentId? }`. Used for rename, star/unstar, and move. |
| PATCH | `/api/files/:id/trash` | Soft-delete: set `trashedAt = now()`. |
| PATCH | `/api/files/:id/restore` | Restore from trash: set `trashedAt = null`. If original parent is trashed, restore to root. |
| DELETE | `/api/files/:id` | Permanent delete. Removes DB record + S3 object. Decrements `storageUsed`. If folder, recursively deletes all descendants and their S3 objects. |
| POST | `/api/files/bulk-trash` | Bulk soft-delete. Body: `{ ids: string[] }`. |
| POST | `/api/files/bulk-delete` | Bulk permanent delete. Body: `{ ids: string[] }`. |
| POST | `/api/files/bulk-move` | Bulk move. Body: `{ ids: string[], parentId: string }`. |

### Storage Route

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/storage` | Return `{ used: number, limit: number }` in bytes. |

### Preview Route

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/files/:id/preview` | Generate presigned GET URL for inline viewing (Content-Disposition: inline). Only for images and PDFs. Returns `{ url, mimeType }`. |

---

## Frontend

### Project Structure
```
src/
├── api/                     # Axios/fetch wrappers for API calls
│   ├── auth.ts
│   ├── files.ts
│   └── storage.ts
├── components/
│   ├── layout/
│   │   ├── AppHeader.vue    # Top bar: search input, user menu
│   │   ├── AppSidebar.vue   # Left sidebar: nav + storage bar
│   │   └── UploadPanel.vue  # Bottom-right upload progress panel
│   ├── files/
│   │   ├── FileList.vue     # Main file listing (list view)
│   │   ├── FileRow.vue      # Single row in file list
│   │   ├── Breadcrumbs.vue  # Folder path breadcrumbs
│   │   ├── FilePreview.vue  # Image/PDF preview modal
│   │   └── BulkActionBar.vue # Actions bar when files are selected
│   ├── modals/
│   │   ├── NewFolderModal.vue
│   │   ├── RenameModal.vue
│   │   └── MoveModal.vue    # Folder picker for move operation
│   └── auth/
│       ├── LoginForm.vue
│       └── RegisterForm.vue
├── composables/
│   ├── useSelection.ts      # Multi-select logic (Ctrl+click, Shift+click)
│   └── useUpload.ts         # Upload queue, progress tracking, presigned URL flow
├── stores/
│   ├── auth.ts              # JWT token, user info, login/logout
│   ├── files.ts             # Current folder contents, CRUD operations
│   └── upload.ts            # Upload queue state
├── router/
│   └── index.ts             # Route definitions
├── views/
│   ├── LoginView.vue
│   ├── RegisterView.vue
│   └── DriveView.vue        # Main layout: sidebar + header + file list
├── types/
│   └── index.ts             # Shared TypeScript interfaces
├── App.vue
└── main.ts
```

### Routes

| Path | View | Auth Required |
|------|------|--------------|
| `/login` | LoginView | No |
| `/register` | RegisterView | No |
| `/drive` | DriveView (root folder) | Yes |
| `/drive/folder/:id` | DriveView (specific folder) | Yes |
| `/drive/starred` | DriveView (starred filter) | Yes |
| `/drive/trash` | DriveView (trash) | Yes |
| `/drive/search?q=` | DriveView (search results) | Yes |

### Key UI Components

#### Sidebar
- "New" button (dropdown: Upload file, New folder)
- Navigation links: My Drive, Starred, Trash
- Storage usage bar at the bottom: "X MB of 1 GB used" with a progress bar

#### File List (List View)
- Column headers: Name, Last modified, File size
- Sorted alphabetically, folders first, then files
- Each row shows: file type icon, name, modified date, size
- Single-click selects (with Ctrl/Shift modifiers for multi-select)
- Double-click opens folder or previews file
- Right-click opens context menu (Open, Download, Rename, Star/Unstar, Move to, Trash)
- Empty state: "Drop files here or use the New button" message

#### Multi-Select
- **Ctrl+click:** Toggle individual file selection
- **Shift+click:** Range select from last clicked to current
- **Click (no modifier):** Select only this file, deselect others
- When files are selected, show a **bulk action bar** at the top: "N selected — Move | Trash | Download"
- Bulk download: API generates a zip file (server-side, streamed) or downloads files individually if only a few selected

#### Breadcrumbs
- Shows the path from "My Drive" to the current folder
- Each segment is clickable for navigation
- Example: `My Drive > Documents > 2024`

#### Upload Panel
- Fixed to bottom-right corner, collapsible
- Shows upload queue with per-file progress bars
- States per file: uploading (percentage), completed (checkmark), failed (retry button)
- Header shows summary: "Uploading 3 files" or "3 uploads complete"
- Users can navigate folders while uploads continue in the background
- Upload triggered by: "Upload file" button in sidebar New menu, or drag-and-drop onto the file list area

#### File Preview
- Opens in a modal overlay when double-clicking an image or PDF
- Images: rendered in an `<img>` tag, sized to fit the viewport
- PDFs: rendered in an `<iframe>` or using PDF.js
- Non-previewable files: double-click triggers download
- Modal has: close button, download button, filename in header

#### Context Menu
- Custom right-click menu (suppress browser default on file rows)
- Items: Open, Download, Rename, Star/Unstar, Move to, Move to trash
- When in trash view: Restore, Delete forever

### Drag and Drop
- Drag files from desktop onto the file list area to upload
- Uses the HTML5 Drag and Drop API (`dragenter`, `dragover`, `drop` events)
- Visual feedback: overlay with "Drop files to upload" message
- No internal drag-to-move between folders (skip in-app drag reordering)

---

## Features

### 1. File Upload
- Click "New > Upload file" or drag-and-drop files onto the file list
- Client checks file size (≤ 100 MB) and quota before proceeding
- Client requests presigned URL from API
- Client uploads to S3 with progress tracking via `XMLHttpRequest.upload.onprogress`
- On completion, client calls confirm endpoint
- File appears in the list after confirmation
- Multiple files can be uploaded simultaneously (queued in the upload panel)

### 2. Folder Creation
- Click "New > New folder"
- Modal prompts for folder name
- Name validation: block characters `/ \ : * ? " < > |`
- Folder created in current directory (or root if at top level)

### 3. File/Folder Rename
- Right-click > Rename, or select + press F2
- Inline rename (replace name text with input field) or modal
- Same character validation as folder creation
- API call: `PATCH /api/files/:id { name: "new name" }`

### 4. Move
- Right-click > "Move to" opens a folder picker modal
- Modal shows folder tree starting from "My Drive"
- User navigates to target folder, clicks "Move here"
- Cannot move a folder into itself or its descendants (API validates)
- Cannot move into a trashed folder
- For bulk move: same modal, moves all selected items

### 5. Star/Unstar
- Right-click > Star (or Unstar if already starred)
- Toggle via `PATCH /api/files/:id { starred: true/false }`
- Starred view in sidebar shows all starred, non-trashed files regardless of folder location

### 6. Trash
- Right-click > "Move to trash" sets `trashedAt = now()`
- Trashing a folder also hides all its descendants (query filter: `WHERE trashedAt IS NULL`)
- Descendants don't get their own `trashedAt` — they're hidden because their ancestor is trashed
- Trash view shows only top-level trashed items
- **Restore:** sets `trashedAt = null`. If the original parent is itself trashed or deleted, restore to root instead.
- **Delete forever:** permanently removes the DB record and the S3 object. For folders, recursively deletes all descendants and their S3 objects. Decrements `storageUsed` for each deleted file.
- **Empty trash:** button in trash view to permanently delete all trashed items at once.

### 7. Search
- Search bar in the top header
- Navigates to `/drive/search?q=<term>`
- API performs `WHERE name ILIKE '%term%' AND trashedAt IS NULL`
- Results displayed in the same file list component
- Breadcrumbs replaced with "Search results for 'term'"

### 8. File Preview
- Double-click on an image file (JPEG, PNG, GIF, WebP, SVG) → opens preview modal with `<img>` tag
- Double-click on a PDF → opens preview modal with `<iframe>` loading the presigned URL
- Double-click on any other file type → triggers download
- Double-click on a folder → navigates into it

### 9. Storage Quota
- Sidebar displays: "X MB of 1 GB used" with a colored progress bar
  - Green: < 50%
  - Yellow: 50-80%
  - Red: > 80%
- Upload blocked with a user-facing error when quota would be exceeded
- Quota check happens server-side before presigned URL generation

### 10. Multi-Select & Bulk Actions
- Ctrl+click to toggle individual selection
- Shift+click for range selection
- Bulk action bar appears when ≥ 1 file is selected
- Available bulk actions: Move to, Move to trash, Download
- Bulk download: if 1 file, direct download; if multiple, generate a zip server-side and stream it (using `archiver` npm package)
- In trash view, bulk actions change to: Restore, Delete forever

---

## Deployment

### Render Configuration

**Web Service:**
- Build command: `npm run build` (compiles both Vue frontend and Express backend)
- Start command: `node dist/server.js`
- Environment: Node
- Plan: Free (with cold starts) or Starter ($7/mo for always-on)

**Managed PostgreSQL:**
- Plan: Free (90-day expiry) or Starter ($7/mo)
- Connection string provided as `DATABASE_URL` env var

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (provided by Render) |
| `JWT_SECRET` | Secret key for signing JWTs (generate with `openssl rand -hex 32`) |
| `AWS_ACCESS_KEY_ID` | AWS IAM access key with S3 permissions |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key |
| `AWS_REGION` | S3 bucket region (e.g., `us-east-1`) |
| `S3_BUCKET_NAME` | Name of the S3 bucket |
| `PORT` | Server port (Render provides this) |
| `CLIENT_URL` | Frontend URL for CORS (e.g., `https://drive.onrender.com`) |

### Build Pipeline
1. `npm install` — install all dependencies
2. `npx prisma generate` — generate Prisma client
3. `npx prisma migrate deploy` — run database migrations
4. `vite build` — build Vue frontend to `dist/client/`
5. `tsc` — compile Express backend to `dist/`
6. Express serves `dist/client/` as static files and handles `/api/*` routes

### S3 Bucket Setup
- Create bucket with "Block all public access" enabled
- CORS configuration allowing PUT from the frontend origin
- IAM user with policy: `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`, `s3:HeadObject` scoped to the bucket

---

## Constraints & Non-Goals

### Non-Goals (explicitly out of scope)
- Real-time collaboration or multi-user editing
- Sharing files with other users
- File versioning / version history
- Office document rendering (.docx, .xlsx, .pptx)
- Video/audio streaming or transcoding
- Offline support / service workers
- Mobile-responsive design (desktop web only)
- Dark mode
- In-app drag-to-move between folders (only drag-to-upload from desktop)
- Folder upload (only individual file upload)
- Google OAuth or social login
- Full-text content search (only filename search)
- Thumbnails / grid view
- Per-folder sort preferences
- Integration with the Google Search clone project

### Accepted Tradeoffs
- **Stateless JWT with no revocation:** Accepted for simplicity. Tokens expire in 1 hour. For a production app, we'd add refresh tokens with a DB allowlist.
- **No multipart upload:** 100 MB file size limit keeps us within S3's single PUT presigned URL capability. Larger files would require multipart upload orchestration.
- **Single table for files and folders:** Simpler queries but the `File` model has nullable fields (`s3Key`, `mimeType`) that only apply to files. Prisma doesn't support table inheritance, and a discriminated union in one table is the pragmatic choice.
- **No CDN:** Files are served directly from S3 via presigned URLs. For a production app, CloudFront would reduce latency and cost. Not worth the setup for a portfolio piece.
- **Render free tier cold starts:** The server spins down after 15 minutes of inactivity and takes ~30 seconds to restart. Acceptable for a portfolio demo.
