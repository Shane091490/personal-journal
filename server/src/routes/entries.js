import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../auth.js";
import { sanitizeEntryBody, isEntryBodyEmpty, sanitizeTags, sanitizeMood } from "../sanitize.js";
import { uploadPhotos, deletePhotoFile, MAX_PHOTOS_PER_ENTRY } from "../uploads.js";

const ENTRY_COLUMNS = "id, body, tags, mood, pinned, created_at, updated_at";

const router = Router();
router.use(requireAuth);

function handlePhotoUpload(req, res, next) {
  uploadPhotos.array("photos", MAX_PHOTOS_PER_ENTRY)(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}

async function attachPhotos(entries) {
  if (entries.length === 0) return entries;
  const ids = entries.map((e) => e.id);
  const { rows: photos } = await pool.query(
    "SELECT id, entry_id, filename FROM entry_photos WHERE entry_id = ANY($1) ORDER BY position ASC, id ASC",
    [ids]
  );
  const byEntry = new Map();
  for (const photo of photos) {
    if (!byEntry.has(photo.entry_id)) byEntry.set(photo.entry_id, []);
    byEntry.get(photo.entry_id).push({ id: photo.id, url: `/uploads/${photo.filename}` });
  }
  return entries.map((e) => ({ ...e, photos: byEntry.get(e.id) || [] }));
}

async function ownsEntry(userId, entryId) {
  const { rows } = await pool.query("SELECT id FROM entries WHERE id = $1 AND user_id = $2", [entryId, userId]);
  return !!rows[0];
}

router.get("/", async (req, res) => {
  const { date, limit, tag } = req.query;
  const params = [req.user.id];
  let where = "user_id = $1";
  if (date) {
    params.push(date);
    where += ` AND created_at::date = $${params.length}::date`;
  }
  if (tag) {
    params.push(tag);
    where += ` AND $${params.length} = ANY(tags)`;
  }
  params.push(Math.min(Number(limit) || 200, 500));
  const { rows } = await pool.query(
    `SELECT ${ENTRY_COLUMNS} FROM entries WHERE ${where} ORDER BY created_at DESC LIMIT $${params.length}`,
    params
  );
  res.json({ entries: await attachPhotos(rows) });
});

router.get("/pinned", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ${ENTRY_COLUMNS} FROM entries WHERE user_id = $1 AND pinned = true ORDER BY created_at DESC`,
    [req.user.id]
  );
  res.json({ entries: await attachPhotos(rows) });
});

router.get("/on-this-day", async (req, res) => {
  const { date } = req.query;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "date query param (YYYY-MM-DD) is required" });
  }
  const [year, month, day] = date.split("-").map(Number);
  const { rows } = await pool.query(
    `SELECT ${ENTRY_COLUMNS} FROM entries
     WHERE user_id = $1
       AND EXTRACT(MONTH FROM created_at) = $2
       AND EXTRACT(DAY FROM created_at) = $3
       AND EXTRACT(YEAR FROM created_at) != $4
     ORDER BY created_at DESC`,
    [req.user.id, month, day, year]
  );
  res.json({ entries: await attachPhotos(rows) });
});

router.get("/stats", async (req, res) => {
  const { rows: dayRows } = await pool.query(
    `SELECT DISTINCT (created_at AT TIME ZONE 'UTC')::date AS day FROM entries WHERE user_id = $1 ORDER BY day DESC`,
    [req.user.id]
  );
  const days = dayRows.map((r) => r.day.toISOString().slice(0, 10));
  const daySet = new Set(days);

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS total,
       COUNT(*) FILTER (
         WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM now())
           AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM now())
       )::int AS this_month
     FROM entries WHERE user_id = $1`,
    [req.user.id]
  );

  const toKey = (d) => d.toISOString().slice(0, 10);
  const cursor = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  if (!daySet.has(toKey(cursor))) {
    // No entry yet today; a streak written through yesterday still counts as active.
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  let currentStreak = 0;
  while (daySet.has(toKey(cursor))) {
    currentStreak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  let longestStreak = 0;
  let run = 0;
  let prevDate = null;
  for (const key of [...days].sort()) {
    const d = new Date(key + "T00:00:00Z");
    run = prevDate && Math.round((d - prevDate) / 86400000) === 1 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    prevDate = d;
  }

  res.json({
    totalEntries: countRows[0].total,
    entriesThisMonth: countRows[0].this_month,
    currentStreak,
    longestStreak,
  });
});

router.post("/", async (req, res) => {
  const { body, created_at, tags, mood } = req.body || {};
  if (isEntryBodyEmpty(body)) return res.status(400).json({ error: "Entry text is required" });
  const clean = sanitizeEntryBody(body);
  const cleanTags = sanitizeTags(tags);
  const cleanMood = sanitizeMood(mood);

  let timestamp = new Date();
  if (created_at) {
    timestamp = new Date(created_at);
    if (Number.isNaN(timestamp.getTime())) return res.status(400).json({ error: "Invalid date" });
  }

  const { rows } = await pool.query(
    `INSERT INTO entries (user_id, body, tags, mood, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $5) RETURNING ${ENTRY_COLUMNS}`,
    [req.user.id, clean, cleanTags, cleanMood, timestamp.toISOString()]
  );
  res.status(201).json({ entry: { ...rows[0], photos: [] } });
});

router.put("/:id", async (req, res) => {
  const { body, tags, mood } = req.body || {};
  if (isEntryBodyEmpty(body)) return res.status(400).json({ error: "Entry text is required" });
  const clean = sanitizeEntryBody(body);
  const cleanTags = sanitizeTags(tags);
  const cleanMood = sanitizeMood(mood);
  const { rows } = await pool.query(
    `UPDATE entries SET body = $1, tags = $2, mood = $3, updated_at = now() WHERE id = $4 AND user_id = $5 RETURNING ${ENTRY_COLUMNS}`,
    [clean, cleanTags, cleanMood, req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: "Entry not found" });
  const [withPhotos] = await attachPhotos(rows);
  res.json({ entry: withPhotos });
});

router.put("/:id/pin", async (req, res) => {
  const { pinned } = req.body || {};
  if (typeof pinned !== "boolean") return res.status(400).json({ error: "pinned must be true or false" });
  const { rows } = await pool.query("UPDATE entries SET pinned = $1 WHERE id = $2 AND user_id = $3 RETURNING id, pinned", [
    pinned,
    req.params.id,
    req.user.id,
  ]);
  if (!rows[0]) return res.status(404).json({ error: "Entry not found" });
  res.json({ entry: rows[0] });
});

router.delete("/", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT p.filename FROM entry_photos p JOIN entries e ON e.id = p.entry_id WHERE e.user_id = $1",
    [req.user.id]
  );
  const { rowCount } = await pool.query("DELETE FROM entries WHERE user_id = $1", [req.user.id]);
  rows.forEach((r) => deletePhotoFile(r.filename));
  res.json({ deleted: rowCount });
});

router.delete("/:id", async (req, res) => {
  const { rows } = await pool.query("SELECT filename FROM entry_photos WHERE entry_id = $1", [req.params.id]);
  const { rowCount } = await pool.query("DELETE FROM entries WHERE id = $1 AND user_id = $2", [
    req.params.id,
    req.user.id,
  ]);
  if (!rowCount) return res.status(404).json({ error: "Entry not found" });
  rows.forEach((r) => deletePhotoFile(r.filename));
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

router.post("/:id/photos", handlePhotoUpload, async (req, res) => {
  if (!(await ownsEntry(req.user.id, req.params.id))) {
    (req.files || []).forEach((f) => deletePhotoFile(f.filename));
    return res.status(404).json({ error: "Entry not found" });
  }
  const files = req.files || [];
  if (files.length === 0) return res.status(400).json({ error: "No photos uploaded" });

  const { rows: existing } = await pool.query(
    "SELECT COALESCE(MAX(position), -1) AS max_position, COUNT(*) AS count FROM entry_photos WHERE entry_id = $1",
    [req.params.id]
  );
  if (Number(existing[0].count) + files.length > MAX_PHOTOS_PER_ENTRY) {
    files.forEach((f) => deletePhotoFile(f.filename));
    return res.status(400).json({ error: `Entries can have at most ${MAX_PHOTOS_PER_ENTRY} photos` });
  }
  let position = existing[0].max_position + 1;

  const inserted = [];
  for (const file of files) {
    const { rows } = await pool.query(
      "INSERT INTO entry_photos (entry_id, filename, position) VALUES ($1, $2, $3) RETURNING id, filename",
      [req.params.id, file.filename, position++]
    );
    inserted.push({ id: rows[0].id, url: `/uploads/${rows[0].filename}` });
  }
  res.status(201).json({ photos: inserted });
});

router.put("/:id/photos/reorder", async (req, res) => {
  if (!(await ownsEntry(req.user.id, req.params.id))) return res.status(404).json({ error: "Entry not found" });
  const { order } = req.body || {};
  if (!Array.isArray(order) || order.length === 0) {
    return res.status(400).json({ error: "order must be a non-empty array of photo ids" });
  }
  const { rows: existing } = await pool.query("SELECT id FROM entry_photos WHERE entry_id = $1", [req.params.id]);
  const existingIds = new Set(existing.map((r) => r.id));
  if (order.length !== existingIds.size || !order.every((id) => existingIds.has(id))) {
    return res.status(400).json({ error: "order must contain exactly the entry's existing photo ids" });
  }
  await Promise.all(
    order.map((id, index) => pool.query("UPDATE entry_photos SET position = $1 WHERE id = $2", [index, id]))
  );
  res.status(204).end();
});

router.delete("/:id/photos/:photoId", async (req, res) => {
  if (!(await ownsEntry(req.user.id, req.params.id))) return res.status(404).json({ error: "Entry not found" });
  const { rows } = await pool.query(
    "DELETE FROM entry_photos WHERE id = $1 AND entry_id = $2 RETURNING filename",
    [req.params.photoId, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: "Photo not found" });
  deletePhotoFile(rows[0].filename);
  res.status(204).end();
});

export default router;
