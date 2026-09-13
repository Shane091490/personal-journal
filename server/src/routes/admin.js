import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db.js";
import { requireAuth, requireAdmin } from "../auth.js";

const router = Router();
router.use(requireAuth, requireAdmin);

router.get("/users", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.username, u.is_admin, u.created_at, COUNT(e.id)::int AS entry_count
     FROM users u
     LEFT JOIN entries e ON e.user_id = u.id
     GROUP BY u.id
     ORDER BY u.created_at ASC`
  );
  res.json({ users: rows });
});

router.put("/users/:id", async (req, res) => {
  const targetId = Number(req.params.id);
  if (targetId === req.user.id) {
    return res.status(400).json({ error: "You cannot change your own admin status" });
  }
  const { is_admin } = req.body || {};
  if (typeof is_admin !== "boolean") return res.status(400).json({ error: "is_admin must be true or false" });

  const { rows } = await pool.query(
    "UPDATE users SET is_admin = $1 WHERE id = $2 RETURNING id, username, is_admin, created_at",
    [is_admin, targetId]
  );
  if (!rows[0]) return res.status(404).json({ error: "User not found" });
  res.json({ user: rows[0] });
});

router.post("/users/:id/reset-password", async (req, res) => {
  const { password } = req.body || {};
  if (!password || password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id", [
    passwordHash,
    req.params.id,
  ]);
  if (!rows[0]) return res.status(404).json({ error: "User not found" });
  res.status(204).end();
});

router.delete("/users/:id", async (req, res) => {
  const targetId = Number(req.params.id);
  if (targetId === req.user.id) {
    return res.status(400).json({ error: "You cannot delete your own account" });
  }
  const { rowCount } = await pool.query("DELETE FROM users WHERE id = $1", [targetId]);
  if (!rowCount) return res.status(404).json({ error: "User not found" });
  res.status(204).end();
});

export default router;
