import "dotenv/config";
import express from "express";
import rateLimit from "express-rate-limit";
import { customAlphabet } from "nanoid";
import { query } from "./db.js";
import { homePage, successPage, expiredPage, notFoundPage } from "./templates.js";

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const baseHost = new URL(BASE_URL).hostname;
const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 6);

// Middleware
app.disable("x-powered-by");
app.use(express.urlencoded({ extended: false }));
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// Rate limiter for POST /shorten
const shortenLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).send(homePage("Rate limit exceeded. Try again in a minute."));
  },
});

// GET / — Homepage
app.get("/", (_req, res) => {
  res.send(homePage());
});

// POST /shorten — Create short URL
app.post("/shorten", shortenLimiter, async (req, res) => {
  const input = req.body.url?.trim();

  if (!input) {
    res.status(400).send(homePage("Please enter a URL."));
    return;
  }

  // Validate URL
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    res.status(400).send(homePage("Invalid URL."));
    return;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    res.status(400).send(homePage("Only http and https URLs are supported."));
    return;
  }

  if (parsed.hostname === baseHost) {
    res.status(400).send(homePage("Cannot shorten URLs pointing to this service."));
    return;
  }

  // Insert with collision retry
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = nanoid();
    try {
      await query("INSERT INTO urls (code, original_url) VALUES ($1, $2)", [code, input]);
      res.send(successPage(`${BASE_URL}/${code}`));
      return;
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr.code === "23505") continue; // unique constraint violation — retry
      throw err;
    }
  }

  res.status(500).send(homePage("Failed to generate short URL. Please try again."));
});

// GET /:code — Redirect
app.get("/:code", async (req, res) => {
  const { code } = req.params;

  if (!/^[a-zA-Z0-9]{6}$/.test(code)) {
    res.status(404).send(notFoundPage());
    return;
  }

  const result = await query("SELECT original_url, expires_at FROM urls WHERE code = $1", [code]);

  if (result.rows.length === 0) {
    res.status(404).send(notFoundPage());
    return;
  }

  const row = result.rows[0];
  if (new Date(row.expires_at) < new Date()) {
    res.status(410).send(expiredPage());
    return;
  }

  res.redirect(302, row.original_url);
});

app.listen(PORT, () => {
  console.log(`Listening on ${BASE_URL}`);
});
