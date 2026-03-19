import "dotenv/config";
import express, { Request, Response } from "express";
import session from "express-session";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import path from "path";

declare module "express-session" {
  interface SessionData {
    userId: number;
    email: string;
  }
}

const isProd = process.env.NODE_ENV === "production";

const app = express();
if (isProd) app.set("trust proxy", 1);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://localhost:5432/chat",
  ssl: isProd ? { rejectUnauthorized: false } : false,
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id        SERIAL PRIMARY KEY,
      email     VARCHAR(255) UNIQUE NOT NULL,
      password  TEXT NOT NULL
    )
  `);
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax", secure: isProd },
  })
);

const root = path.join(__dirname, "..");

// API routes
app.post("/api/register", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }
  const hash = await bcrypt.hash(password, 10);
  try {
    const result = await pool.query(
      "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id",
      [email, hash]
    );
    req.session.userId = result.rows[0].id;
    req.session.email = email;
    res.json({ ok: true });
  } catch (err: any) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Email already registered" });
    }
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await pool.query("SELECT id, password FROM users WHERE email = $1", [email]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  req.session.userId = user.id;
  req.session.email = email;
  res.json({ ok: true });
});

app.post("/api/logout", (req: Request, res: Response) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/me", (req: Request, res: Response) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  res.json({ userId: req.session.userId, email: req.session.email });
});

// HTML pages
app.get("/register", (_req, res) => {
  res.sendFile(path.join(root, "register.html"));
});

app.get("/dashboard", (_req, res) => {
  res.sendFile(path.join(root, "dashboard.html"));
});

// Static files
app.use(express.static(root));

initDb().then(() => {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
});
