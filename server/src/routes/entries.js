import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const { date, limit } = req.query;
  const params = [req.user.id];
  let where = "user_id = $1";
  if (date) {
    params.push(date);
    where += ` AND created_at::date = $${params.length}::date`;
  }
  params.push(Math.min(Number(limit) || 200, 500));
  const { rows } = await pool.query(
    `SELECT id, body, created_at, updated_at FROM entries WHERE ${where} ORDER BY created_at DESC LIMIT $${params.length}`,
    params
  );
  res.json({ entries: rows });
});

router.post("/", async (req, res) => {
  const { body, created_at } = req.body || {};
  const clean = String(body || "").trim();
  if (!clean) return res.status(400).json({ error: "Entry text is required" });

  let timestamp = new Date();
  if (created_at) {
    timestamp = new Date(created_at);
    if (Number.isNaN(timestamp.getTime())) return res.status(400).json({ error: "Invalid date" });
  }

  const { rows } = await pool.query(
    "INSERT INTO entries (user_id, body, created_at, updated_at) VALUES ($1, $2, $3, $3) RETURNING id, body, created_at, updated_at",
    [req.user.id, clean, timestamp.toISOString()]
  );
  res.status(201).json({ entry: rows[0] });
});

router.put("/:id", async (req, res) => {
  const { body } = req.body || {};
  const clean = String(body || "").trim();
  if (!clean) return res.status(400).json({ error: "Entry text is required" });
  const { rows } = await pool.query(
    "UPDATE entries SET body = $1, updated_at = now() WHERE id = $2 AND user_id = $3 RETURNING id, body, created_at, updated_at",
    [clean, req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: "Entry not found" });
  res.json({ entry: rows[0] });
});

router.delete("/:id", async (req, res) => {
  const { rowCount } = await pool.query("DELETE FROM entries WHERE id = $1 AND user_id = $2", [
    req.params.id,
    req.user.id,
  ]);
  if (!rowCount) return res.status(404).json({ error: "Entry not found" });
  res.status(204).end();
});

router.get("/calendar", async (req, res) => {
  const year = Number(req.query.year);
  const month = Number(req.query.month);
  if (!year || !month) return res.status(400).json({ error: "year and month query params required" });
  const { rows } = await pool.query(
    `SELECT DISTINCT (created_at AT TIME ZONE 'UTC')::date AS day
     FROM entries
     WHERE user_id = $1
       AND EXTRACT(YEAR FROM created_at) = $2
       AND EXTRACT(MONTH FROM created_at) = $3`,
    [req.user.id, year, month]
  );
  res.json({ days: rows.map((r) => r.day.toISOString().slice(0, 10)) });
});

export default router;
