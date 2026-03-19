"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_session_1 = require("express-session");
const pg_1 = require("pg");
const bcryptjs_1 = require("bcryptjs");
const path_1 = require("path");
const app = (0, express_1.default)();
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://localhost:5432/chat",
});
function initDb() {
    return __awaiter(this, void 0, void 0, function* () {
        yield pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id        SERIAL PRIMARY KEY,
      email     VARCHAR(255) UNIQUE NOT NULL,
      password  TEXT NOT NULL
    )
  `);
    });
}
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: false }));
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "strict" },
}));
const root = path_1.default.join(__dirname, "..");
// API routes
app.post("/api/register", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
    }
    const hash = yield bcryptjs_1.default.hash(password, 10);
    try {
        const result = yield pool.query("INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id", [email, hash]);
        req.session.userId = result.rows[0].id;
        req.session.email = email;
        res.json({ ok: true });
    }
    catch (err) {
        if (err.code === "23505") {
            return res.status(409).json({ error: "Email already registered" });
        }
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
}));
app.post("/api/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    const result = yield pool.query("SELECT id, password FROM users WHERE email = $1", [email]);
    const user = result.rows[0];
    if (!user || !(yield bcryptjs_1.default.compare(password, user.password))) {
        return res.status(401).json({ error: "Invalid email or password" });
    }
    req.session.userId = user.id;
    req.session.email = email;
    res.json({ ok: true });
}));
app.post("/api/logout", (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
});
app.get("/api/me", (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
    }
    res.json({ userId: req.session.userId, email: req.session.email });
});
// HTML pages
app.get("/register", (_req, res) => {
    res.sendFile(path_1.default.join(root, "register.html"));
});
app.get("/dashboard", (_req, res) => {
    res.sendFile(path_1.default.join(root, "dashboard.html"));
});
// Static files
app.use(express_1.default.static(root));
initDb().then(() => {
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
});
