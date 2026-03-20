# Chat App Specification

## Overview

A 1-on-1 direct messaging chat application built on the existing Express + TypeScript + PostgreSQL authentication system. Real-time messaging via Socket.IO, persistent message history, and a classic sidebar + main panel layout.

## Tech Stack

- **Backend:** Express.js, TypeScript, PostgreSQL, Socket.IO
- **Frontend:** Vanilla TypeScript (compiled via tsc), plain HTML/CSS
- **Auth:** Existing session-based auth (express-session + bcryptjs)
- **Database:** PostgreSQL (existing `users` table + new tables)
- **WebSocket Auth:** Reuse express-session cookie during Socket.IO handshake

## Features

### Core

- **1-on-1 direct messaging** between any two registered users
- **Real-time delivery** via Socket.IO WebSockets
- **Persistent message history** stored in PostgreSQL
- **Message history pagination:** Load last 50 messages initially, infinite scroll to load older batches (cursor-based by message ID)
- **Conversation list:** Left sidebar showing all conversations, ordered by most recent message (static ordering on page load, not live-reordering)
- **User search:** Search bar in sidebar to find any registered user by email and start a new conversation
- **Online/offline status:** Green/gray dot indicator per user, updates immediately on WebSocket connect/disconnect
- **Auto-reconnect:** Socket.IO handles reconnection automatically; on reconnect, fetch missed messages using last-known message ID cursor

### Message Rules

- **Plain text only** — no markdown, no rich text, no file attachments
- **Max length:** 2000 characters per message
- **Immutable:** No editing or deleting sent messages
- **No read receipts**, no unread counts, no typing indicators

### User Identity

- Users are identified and searched by **email address** (no display names or usernames)
- Any registered user can message any other registered user (no contact list or friend requests)

## Database Schema

### Existing Table

```sql
-- Already exists
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password TEXT NOT NULL
);
```

### New Tables

```sql
CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  user1_id INTEGER NOT NULL REFERENCES users(id),
  user2_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id < user2_id)  -- canonical ordering to prevent duplicates
);

CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id),
  sender_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL CHECK (char_length(content) <= 2000),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(conversation_id, id DESC);
```

## API Endpoints

### Existing (unchanged)

- `POST /api/register` — Create account
- `POST /api/login` — Log in
- `POST /api/logout` — Log out
- `GET /api/me` — Get current user

### New REST Endpoints

- `GET /api/conversations` — List current user's conversations (with last message preview and other user's email), ordered by most recent message
- `GET /api/conversations/:id/messages?before=<messageId>&limit=50` — Paginated message history (cursor-based, returns messages with id < `before`)
- `POST /api/conversations` — Create or get existing conversation with another user. Body: `{ email: string }`. Returns conversation ID
- `GET /api/users/search?q=<email>` — Search users by email (partial match, exclude self). Returns `[{ id, email }]`

## Socket.IO Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `send_message` | `{ conversationId: number, content: string }` | Send a message |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `new_message` | `{ id, conversationId, senderId, senderEmail, content, createdAt }` | New message received |
| `user_online` | `{ userId: number }` | A user came online |
| `user_offline` | `{ userId: number }` | A user went offline |
| `error` | `{ message: string }` | Error (e.g., validation failure) |

### Connection

- Socket.IO authenticates using the express-session cookie during the handshake
- On connect: server registers user as online, broadcasts `user_online` to relevant users
- On disconnect: server immediately marks user as offline, broadcasts `user_offline`
- Socket.IO's built-in reconnection handles auto-reconnect
- On reconnect: client sends last known message ID, server returns missed messages

## UI Layout

### Chat Page (`/dashboard` or `/chat`)

```
┌─────────────────────────────────────────────────┐
│  Header (app name, logged-in user, logout)      │
├──────────────┬──────────────────────────────────┤
│  Search bar  │                                  │
│  [🔍 email] │     Conversation Area            │
│──────────────│                                  │
│  Conv 1  🟢  │  ┌─────────────────────────┐    │
│  Conv 2  ⚫  │  │ Message from them        │    │
│  Conv 3  🟢  │  │         Message from me  │    │
│  ...         │  │ Message from them        │    │
│              │  │         Message from me  │    │
│              │  └─────────────────────────┘    │
│              │  ┌─────────────────────────┐    │
│              │  │ Type a message... [Send] │    │
│              │  └─────────────────────────┘    │
└──────────────┴──────────────────────────────────┘
```

- **Sidebar:** Search bar at top, conversation list below. Each item shows other user's email, last message preview (truncated), and online status dot
- **Main panel:** Message history (scrollable, loads older messages on scroll-up), input bar at bottom
- **Empty state:** "Select a conversation or search for a user to start chatting"
- **Messages:** Left-aligned for received, right-aligned for sent. Show timestamp on hover or below message

### Error Handling

- **Send failure:** Show toast/alert that the message failed to send. Message is discarded — user must retype
- **Connection lost:** Show a banner "Reconnecting..." at the top of the chat area. Socket.IO auto-reconnects
- **Search no results:** Show "No users found" in search dropdown

## Multi-Tab Behavior

Each browser tab maintains its own independent Socket.IO connection. All tabs receive messages in real-time.

## Security Considerations

- **XSS:** All message content must be escaped before rendering in the DOM (use `textContent`, never `innerHTML`)
- **Auth:** Every Socket.IO event handler must verify the session is valid
- **Input validation:** Enforce 2000-char limit on both client and server
- **SQL injection:** Use parameterized queries (already the pattern in the existing codebase)
- **Rate limiting:** Not in scope for v1, but worth adding later

## Out of Scope (v1)

- File/image attachments
- Emoji picker or reactions
- Message editing or deletion
- Read receipts / unread counts
- Typing indicators
- Group chats
- Push notifications
- User blocking
- Message search
- Rate limiting
