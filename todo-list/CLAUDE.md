# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **Frontend**: React 18, Vite, TypeScript, CSS Modules, react-router-dom, @dnd-kit/sortable
- **Backend**: Node.js, Express, TypeScript, raw `pg` queries
- **Database**: PostgreSQL (managed on Render)
- **Auth**: JWT in httpOnly cookies (7-day expiry), bcrypt
- **Email**: Resend API (logs tokens to console when RESEND_API_KEY is unset)
- **Deployment**: Render (static site + web service + managed PostgreSQL)

## Project Structure

```
todo-list/
├── client/          # React + Vite frontend (port 5173)
│   └── src/
│       ├── api/         # fetch wrappers (client.ts, auth.ts, todos.ts)
│       ├── hooks/       # useAuth, useToast contexts
│       ├── components/  # TodoList, TodoItem, AddTodoForm, Toast, etc.
│       └── pages/       # LandingPage, LoginPage, AppPage, SettingsPage, etc.
├── server/          # Express backend (port 3001)
│   └── src/
│       ├── routes/      # auth.ts, todos.ts
│       ├── middleware/  # authenticate.ts, rateLimiter.ts
│       ├── db/          # pool.ts, migrate.ts, queries/, migrations/
│       └── email/       # resend.ts
└── render.yaml      # Render Blueprint for deployment
```

## Commands

### Server
```bash
cd server && npm install          # Install dependencies
cd server && npm run dev          # Start dev server (nodemon + ts-node)
cd server && npm run build        # Compile TypeScript to dist/
cd server && npm run migrate      # Run database migrations
```

### Client
```bash
cd client && npm install          # Install dependencies
cd client && npm run dev          # Start Vite dev server (proxies /api to :3001)
cd client && npm run build        # Production build (tsc + vite build)
```

## Environment Variables

- **Server** (`server/.env`): DATABASE_URL, JWT_SECRET, RESEND_API_KEY, RESEND_FROM_EMAIL, FRONTEND_URL, PORT
- **Client** (`client/.env`): VITE_API_URL (not needed in dev due to Vite proxy)
- See `server/.env.example` and `client/.env.example` for templates.

## Notes

- Vite proxy: In dev, the client proxies `/api` requests to `http://localhost:3001`, so no CORS issues locally.
- Route ordering in `server/src/routes/todos.ts`: `/reorder` and `/completed` must be registered before `/:id`.
- The client uses `verbatimModuleSyntax` — type imports must use `import type`.
- `.claude/settings.json` restricts reads and edits to files outside this directory.
