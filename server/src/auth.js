import jwt from "jsonwebtoken";
import { pool } from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const COOKIE_NAME = "journal_token";

export function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, is_admin: user.is_admin },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}

export function setAuthCookie(res, user) {
  const token = signToken(user);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

export async function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  let claims;
  try {
    claims = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Invalid session" });
  }

  const { rows } = await pool.query("SELECT id, username, is_admin FROM users WHERE id = $1", [claims.id]);
  if (!rows[0]) {
    clearAuthCookie(res);
    return res.status(401).json({ error: "Your account no longer exists. Please log in again." });
  }
  req.user = rows[0];
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user?.is_admin) return res.status(403).json({ error: "Admin access required" });
  next();
}
