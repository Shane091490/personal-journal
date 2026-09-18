import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../auth.js";
import { sanitizeEntryBody, isEntryBodyEmpty } from "../sanitize.js";
import {
  deletePhotoFile,
  photoMimeFromFilename,
  readPhotoBase64,
  writePhotoFromBase64,
  MAX_PHOTOS_PER_ENTRY,
} from "../uploads.js";

const router = Router();
router.use(requireAuth);

router.get("/export", async (req, res) => {
  const { rows: entries } = await pool.query(
    "SELECT id, body, created_at, updated_at FROM entries WHERE user_id = $1 ORDER BY id ASC",
    [req.user.id]
  );

  const ids = entries.map((e) => e.id);
  const { rows: photoRows } = ids.length
    ? await pool.query(
        "SELECT entry_id, filename, position FROM entry_photos WHERE entry_id = ANY($1) ORDER BY entry_id ASC, position ASC",
        [ids]
      )
    : { rows: [] };

  const photosByEntry = new Map();
  for (const p of photoRows) {
    if (!photosByEntry.has(p.entry_id)) photosByEntry.set(p.entry_id, []);
    photosByEntry.get(p.entry_id).push({
      mime: photoMimeFromFilename(p.filename),
      data: readPhotoBase64(p.filename),
    });
  }

  const entriesOut = entries.map((e) => ({ ...e, photos: photosByEntry.get(e.id) || [] }));

  res.setHeader("Content-Disposition", `attachment; filename="personal-journal-export.json"`);
  res.json({
    version: 3,
    exported_at: new Date().toISOString(),
    email: req.user.email,
    entries: entriesOut,
  });
});

router.post("/import", async (req, res) => {
  const { confirm, data } = req.body || {};
  if (!confirm) return res.status(400).json({ error: "Confirmation required" });
  if (!data || !Array.isArray(data.entries)) {
    return res.status(400).json({ error: "Invalid import file" });
  }

  const client = await pool.connect();
  const writtenFiles = [];
  try {
    await client.query("BEGIN");

    const { rows: existingPhotos } = await client.query(
      "SELECT p.filename FROM entry_photos p JOIN entries e ON e.id = p.entry_id WHERE e.user_id = $1",
      [req.user.id]
    );
    await client.query("DELETE FROM entries WHERE user_id = $1", [req.user.id]);

    let imported = 0;
    let importedPhotos = 0;
    for (const entry of data.entries) {
      if (!entry.body || isEntryBodyEmpty(entry.body)) continue;
      const { rows } = await client.query(
        "INSERT INTO entries (user_id, body, created_at, updated_at) VALUES ($1, $2, COALESCE($3, now()), COALESCE($4, now())) RETURNING id",
        [req.user.id, sanitizeEntryBody(entry.body), entry.created_at || null, entry.updated_at || null]
      );
      const entryId = rows[0].id;
      imported += 1;

      const photos = Array.isArray(entry.photos) ? entry.photos.slice(0, MAX_PHOTOS_PER_ENTRY) : [];
      for (let position = 0; position < photos.length; position++) {
        const photo = photos[position];
        if (!photo) continue;
        const filename = writePhotoFromBase64(photo.mime, photo.data);
        if (!filename) continue;
        writtenFiles.push(filename);
        await client.query("INSERT INTO entry_photos (entry_id, filename, position) VALUES ($1, $2, $3)", [
          entryId,
          filename,
          position,
        ]);
        importedPhotos += 1;
      }
    }

    await client.query("COMMIT");
    existingPhotos.forEach((p) => deletePhotoFile(p.filename));
    res.json({ imported: { entries: imported, photos: importedPhotos } });
  } catch (err) {
    writtenFiles.forEach((f) => deletePhotoFile(f));
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

export default router;
