import "dotenv/config";
import pool from "./db.js";

await pool.query(`
  CREATE TABLE IF NOT EXISTS urls (
    id            SERIAL PRIMARY KEY,
    code          VARCHAR(6) UNIQUE NOT NULL,
    original_url  TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at    TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days'
  );

  CREATE INDEX IF NOT EXISTS idx_urls_code ON urls (code);
  CREATE INDEX IF NOT EXISTS idx_urls_expires_at ON urls (expires_at);
`);

console.log("Database initialized.");
await pool.end();
