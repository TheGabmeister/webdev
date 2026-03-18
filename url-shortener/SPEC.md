# URL Shortener — Specification

## Overview

A web application that takes long URLs and produces short, shareable links that redirect to the original URL. Links auto-expire after 30 days. No authentication required.

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Server**: Express.js with server-rendered HTML
- **Database**: PostgreSQL
- **CSS**: Classless CSS framework (pico.css or water.css)
- **Short code generation**: nanoid with custom alphanumeric alphabet

## Core Features

### 1. URL Shortening

- User submits a long URL via a form on the homepage
- Server validates the URL (syntax only — `new URL()` parse)
- Server rejects URLs pointing to the shortener's own domain (prevents redirect chains)
- Server generates a 6-character alphanumeric short code via nanoid (`a-z A-Z 0-9`, 62 chars)
- Every submission creates a new entry (no deduplication)
- On collision (unique constraint violation), retry with a new code (up to 3 attempts)
- Returns the short URL with a click-to-copy button

### 2. Redirect

- `GET /:code` looks up the short code in PostgreSQL
- If found and not expired: **302 Found** redirect to the original URL
- If found but expired: **410 Gone** with a styled "This link has expired" page
- If not found: **404 Not Found** with a styled error page

### 3. Auto-Expiration

- All links expire 30 days after creation
- `expires_at` column set to `created_at + INTERVAL '30 days'`
- Expired links checked on read (`WHERE code = $1 AND expires_at > NOW()`)
- Cleanup: PostgreSQL scheduled job (`pg_cron` or equivalent) runs `DELETE FROM urls WHERE expires_at < NOW()` periodically (e.g., daily)

## Database Schema

```sql
CREATE TABLE urls (
  id            SERIAL PRIMARY KEY,
  code          VARCHAR(6) UNIQUE NOT NULL,
  original_url  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days'
);

CREATE INDEX idx_urls_code ON urls (code);
CREATE INDEX idx_urls_expires_at ON urls (expires_at);
```

## API / Routes

| Method | Path        | Description                        |
|--------|-------------|------------------------------------|
| GET    | `/`         | Homepage with URL submission form  |
| POST   | `/shorten`  | Accept URL, return short link      |
| GET    | `/:code`    | Redirect or error (302/410/404)    |

## URL Validation Rules

1. Must parse as a valid URL via `new URL(input)`
2. Protocol must be `http:` or `https:`
3. Must not point to the shortener's own domain

## Rate Limiting

- In-memory IP-based rate limiting via `express-rate-limit`
- Limit: 10 URL creations per minute per IP on `POST /shorten`
- Resets on server restart (acceptable for small production)
- No rate limit on redirect reads

## UI/UX

### Homepage (`GET /`)

- Single input field for the URL
- Submit button ("Shorten")
- On success: display the short URL with a click-to-copy button (uses Clipboard API)
- On error: display validation error inline
- Classless CSS for styling (semantic HTML, no custom classes needed)

### Expired Link Page (410)

- "This link has expired" heading
- Brief explanation that links expire after 30 days
- Link back to homepage to create a new short URL

### Not Found Page (404)

- "Link not found" heading
- Link back to homepage

## Short Code Details

- Length: 6 characters
- Alphabet: `a-zA-Z0-9` (62 characters)
- Generator: `nanoid` with custom alphabet
- Total keyspace: 62^6 = ~56.8 billion
- Collision handling: retry up to 3 times on unique constraint violation

## Security Considerations

- Rate limiting on creation endpoint
- No user-enumerable data (random codes, no sequential IDs)
- Self-referencing URL blocking
- Input sanitization (URL parsing rejects malformed input)
- No sensitive data stored (URLs only, no user data)
- HTTP headers: disable `X-Powered-By`, set appropriate security headers

## Non-Goals (Explicitly Out of Scope)

- User authentication / accounts
- Custom aliases
- Click analytics / tracking
- API keys
- QR code generation
- Detailed analytics (referrer, device, location)
- URL preview / unfurling

## Dependencies

- `express` — HTTP server
- `pg` / `postgres` — PostgreSQL client
- `nanoid` — short code generation
- `express-rate-limit` — rate limiting
- `typescript` — already installed
- A classless CSS framework (loaded via CDN, no npm package)
