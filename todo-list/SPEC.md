# Todo List App — Specification

## Overview
A full-stack todo list web app with user authentication. Users can create an account, manage their personal todo list, and have their data persist across sessions. Built with React + Vite (frontend) and Node.js + Express + PostgreSQL (backend), deployed as separate services on Render.

---

## Tech Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Frontend     | React 18, Vite, TypeScript, CSS Modules |
| Backend      | Node.js, Express, TypeScript        |
| Database     | PostgreSQL (Render managed)         |
| ORM          | Drizzle ORM or raw `pg` queries     |
| Auth         | JWT in httpOnly cookie (7-day)      |
| Email        | Resend API                          |
| Drag & Drop  | `@dnd-kit/core` + `@dnd-kit/sortable` |
| Rate Limiting| `express-rate-limit`                |
| Deployment   | Render Static Site (FE) + Render Web Service (BE) |

---

## Authentication

### Sign Up
- Fields: email, password (min 8 characters)
- Password stored as bcrypt hash (cost factor 12)
- On successful signup: send email verification link via Resend; return 201 with a message to check email
- User is **fully blocked** from using the app until email is verified

### Email Verification
- Token: random 32-byte hex string, expires in **24 hours**, stored in `email_verification_tokens` table
- Verification link: `GET /api/auth/verify-email?token=<token>`
- On success: mark user as verified, redirect to login
- On expired/invalid token: show error; offer "Resend verification email" button
- Resend endpoint: `POST /api/auth/resend-verification`

### Login
- Fields: email, password
- If email not verified: return 403 with message and option to resend verification
- If credentials valid: issue JWT (7-day expiry), set as `httpOnly; Secure; SameSite=None` cookie
- No refresh token; after 7 days user must log in again

### Logout
- `POST /api/auth/logout` — clears the JWT cookie (server sets it as expired)

### Password Reset
- Request: `POST /api/auth/forgot-password` — sends reset link via Resend
- Token: random 32-byte hex string, expires in **1 hour**, stored in `password_reset_tokens` table
- Reset: `POST /api/auth/reset-password` with token + new password
- On success: invalidate token, hash and store new password
- Old tokens for the same user are invalidated when a new request is made

### Change Password
- `POST /api/auth/change-password` (authenticated)
- Requires: current password (verified), new password (min 8 chars)

### Delete Account
- `DELETE /api/auth/account` (authenticated)
- Requires: password confirmation
- Hard-deletes user row; PostgreSQL cascade deletes all todos and tokens
- Frontend: redirect to landing/login page after deletion

### Rate Limiting
Apply `express-rate-limit` to:
- `POST /api/auth/login` — 10 attempts per 15 minutes per IP
- `POST /api/auth/register` — 5 attempts per hour per IP
- `POST /api/auth/forgot-password` — 5 attempts per hour per IP

---

## Todo Features

### Data Model
Each todo has: title (string, required), completed (boolean, default false), position (integer).

### List Behavior
- One flat list per user
- Ordered by `position` ASC
- New todos added to the **bottom** of the list (position = max(position) + 1)

### Operations
| Action            | Description                                                      |
|-------------------|------------------------------------------------------------------|
| Add todo          | Input at top of page; Enter or button submits                    |
| Toggle complete   | Checkbox on each todo; updates `completed` in DB                 |
| Delete todo       | Trash/× button on each todo; hard-deletes the row                |
| Drag to reorder   | Drag handle on each todo; on drop, writes new integer positions  |
| Clear completed   | Button below the list; bulk-deletes all `completed=true` todos   |

### Drag & Drop Ordering
- Use `@dnd-kit/sortable` for drag-and-drop
- On drop: compute new integer positions for all todos (1, 2, 3, … n), send full array to `PUT /api/todos/reorder`
- Conflict: last write wins (no locking)
- Completed todos are freely reorderable alongside incomplete ones

---

## API Endpoints

### Auth
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/verify-email?token=
POST   /api/auth/resend-verification
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
POST   /api/auth/change-password
DELETE /api/auth/account
GET    /api/auth/me           ← returns current user (used to hydrate frontend on load)
```

### Todos (all require authentication)
```
GET    /api/todos             ← returns todos ordered by position ASC
POST   /api/todos             ← create todo { title }
PATCH  /api/todos/:id         ← update { title?, completed? }
DELETE /api/todos/:id         ← delete one todo
PUT    /api/todos/reorder     ← body: { ids: number[] } in new order
DELETE /api/todos/completed   ← bulk-delete all completed todos
```

---

## Database Schema

```sql
CREATE TABLE users (
  id              SERIAL PRIMARY KEY,
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  email_verified  BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE email_verification_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE password_reset_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE todos (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  completed  BOOLEAN NOT NULL DEFAULT false,
  position   INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_todos_user_id_position ON todos(user_id, position);
```

---

## Frontend Pages & Components

### Pages
| Route               | Access      | Description                                  |
|---------------------|-------------|----------------------------------------------|
| `/`                 | Public      | Landing page with login/register links       |
| `/register`         | Public      | Registration form                            |
| `/login`            | Public      | Login form                                   |
| `/verify-email`     | Public      | "Check your email" notice + resend button    |
| `/app`              | Auth only   | Main todo list                               |
| `/settings`         | Auth only   | Change password, delete account              |
| `/reset-password`   | Public      | Reset password form (token from URL)         |

### Key Components
- `TodoList` — renders sorted todo items
- `TodoItem` — drag handle, checkbox, title, delete button
- `AddTodoForm` — input + submit button at top of `/app`
- `ClearCompletedButton` — only visible when ≥1 completed todo exists
- `Toast` — global toast container for error/success messages
- `ProtectedRoute` — wraps auth-only routes; redirects to `/login` if no session

### UX Details
- Errors (network, API, validation) displayed as toasts (bottom-right, auto-dismiss 4s)
- Optimistic UI for toggle/delete (update state immediately, revert on failure)
- Drag preview shows dragged item with slight opacity/shadow
- Empty state: friendly message when todo list is empty

---

## Security

| Concern               | Mitigation                                                   |
|-----------------------|--------------------------------------------------------------|
| Password storage      | bcrypt, cost factor 12                                       |
| XSS                   | JWT in httpOnly cookie (not accessible to JS)                |
| CSRF                  | `SameSite=None; Secure` + CORS restricted to frontend origin |
| Brute force           | express-rate-limit on auth endpoints                         |
| SQL injection         | Parameterized queries only                                   |
| Token expiry          | Email verify: 24h; password reset: 1h; session: 7d          |

---

## Environment Variables

### Backend
```
DATABASE_URL=          # Render Postgres connection string
JWT_SECRET=            # Random 64-byte hex string
RESEND_API_KEY=        # From Resend dashboard
RESEND_FROM_EMAIL=     # e.g. noreply@yourdomain.com
FRONTEND_URL=          # e.g. https://myapp.onrender.com (for CORS + email links)
PORT=                  # 10000 (Render default)
```

### Frontend
```
VITE_API_URL=          # e.g. https://myapp-api.onrender.com
```

---

## Deployment (Render)

### Backend — Render Web Service
- Root: `server/`
- Build command: `npm install && npx tsc`
- Start command: `node dist/index.js`
- Add DATABASE_URL, JWT_SECRET, RESEND_API_KEY, RESEND_FROM_EMAIL, FRONTEND_URL env vars

### Frontend — Render Static Site
- Root: `client/`
- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Add VITE_API_URL env var
- Add redirect rule: `/* → /index.html` (200) for React Router

### Database
- Render managed PostgreSQL (free tier: 256 MB, 90-day limit; paid for production)
- Run migrations manually on first deploy

---

## Project Structure

```
todo-list/
├── client/               # React + Vite frontend
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── api/          # fetch wrappers for each endpoint
│   │   ├── hooks/
│   │   └── main.tsx
│   ├── vite.config.ts
│   └── package.json
├── server/               # Express backend
│   ├── src/
│   │   ├── routes/       # auth.ts, todos.ts
│   │   ├── middleware/   # authenticate.ts, rateLimiter.ts
│   │   ├── db/           # schema, migrations, query helpers
│   │   ├── email/        # resend.ts (sendVerification, sendReset)
│   │   └── index.ts
│   ├── tsconfig.json
│   └── package.json
└── SPEC.md
```

---

## Out of Scope
- Multiple todo lists per user
- Todo descriptions, due dates, priority, tags
- Real-time sync across tabs (last write wins)
- Mobile app
- Social login (OAuth)
- Admin dashboard
