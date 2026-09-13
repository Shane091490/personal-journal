import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../auth.js";

const router = Router();
router.use(requireAuth);

router.get("/export", async (req, res) => {
  const { rows: entries } = await pool.query(
    "SELECT id, body, created_at, updated_at FROM entries WHERE user_id = $1 ORDER BY id ASC",
    [req.user.id]
  );

  res.setHeader("Content-Disposition", `attachment; filename="personal-journal-export.json"`);
  res.json({
    version: 2,
    exported_at: new Date().toISOString(),
    username: req.user.username,
    entries,
  });
});

router.post("/import", async (req, res) => {
  const { confirm, data } = req.body || {};
  if (!confirm) return res.status(400).json({ error: "Confirmation required" });
  if (!data || !Array.isArray(data.entries)) {
    return res.status(400).json({ error: "Invalid import file" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM entries WHERE user_id = $1", [req.user.id]);

    let imported = 0;
    for (const entry of data.entries) {
      if (!entry.body) continue;
      await client.query(
        "INSERT INTO entries (user_id, body, created_at, updated_at) VALUES ($1, $2, COALESCE($3, now()), COALESCE($4, now()))",
        [req.user.id, String(entry.body).trim(), entry.created_at || null, entry.updated_at || null]
      );
      imported += 1;
    }

    await client.query("COMMIT");
    res.json({ imported: { entries: imported } });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

export default router;
