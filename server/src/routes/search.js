import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.json({ entries: [] });
  const like = `%${q}%`;

  const { rows: entries } = await pool.query(
    "SELECT id, body, created_at FROM entries WHERE user_id = $1 AND body ILIKE $2 ORDER BY created_at DESC LIMIT 100",
    [req.user.id, like]
  );

  res.json({ entries });
});

export default router;
