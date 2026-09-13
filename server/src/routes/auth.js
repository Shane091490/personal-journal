import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db.js";
import { setAuthCookie, clearAuthCookie, requireAuth } from "../auth.js";

const router = Router();

router.post("/register", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password || password.length < 6) {
    return res.status(400).json({ error: "Username and a password of at least 6 characters are required" });
  }
  const cleanUsername = String(username).trim();
  if (!cleanUsername) return res.status(400).json({ error: "Username is required" });

  const { rows: countRows } = await pool.query("SELECT COUNT(*)::int AS count FROM users");
  const isFirstUser = countRows[0].count === 0;

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await pool.query(
      "INSERT INTO users (username, password_hash, is_admin) VALUES ($1, $2, $3) RETURNING id, username, is_admin",
      [cleanUsername, passwordHash, isFirstUser]
    );
    const user = rows[0];
    setAuthCookie(res, user);
    res.status(201).json({ user });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "That username is already taken" });
    }
    throw err;
  }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "Username and password are required" });

  const { rows } = await pool.query(
    "SELECT id, username, password_hash, is_admin FROM users WHERE username = $1",
    [String(username).trim()]
  );
  const user = rows[0];
  if (!user) return res.status(401).json({ error: "Invalid username or password" });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: "Invalid username or password" });

  setAuthCookie(res, user);
  res.json({ user: { id: user.id, username: user.username, is_admin: user.is_admin } });
});

router.post("/logout", (req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
