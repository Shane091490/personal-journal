import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../auth.js";
import { sanitizeEntryBody, isEntryBodyEmpty } from "../sanitize.js";
import { uploadPhotos, deletePhotoFile, MAX_PHOTOS_PER_ENTRY } from "../uploads.js";

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
  res.json({ entries: await attachPhotos(rows) });
});

router.post("/", async (req, res) => {
  const { body, created_at } = req.body || {};
  if (isEntryBodyEmpty(body)) return res.status(400).json({ error: "Entry text is required" });
  const clean = sanitizeEntryBody(body);

  let timestamp = new Date();
  if (created_at) {
    timestamp = new Date(created_at);
    if (Number.isNaN(timestamp.getTime())) return res.status(400).json({ error: "Invalid date" });
  }

  const { rows } = await pool.query(
    "INSERT INTO entries (user_id, body, created_at, updated_at) VALUES ($1, $2, $3, $3) RETURNING id, body, created_at, updated_at",
    [req.user.id, clean, timestamp.toISOString()]
  );
  res.status(201).json({ entry: { ...rows[0], photos: [] } });
});

router.put("/:id", async (req, res) => {
  const { body } = req.body || {};
  if (isEntryBodyEmpty(body)) return res.status(400).json({ error: "Entry text is required" });
  const clean = sanitizeEntryBody(body);
  const { rows } = await pool.query(
    "UPDATE entries SET body = $1, updated_at = now() WHERE id = $2 AND user_id = $3 RETURNING id, body, created_at, updated_at",
    [clean, req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: "Entry not found" });
  const [withPhotos] = await attachPhotos(rows);
  res.json({ entry: withPhotos });
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
