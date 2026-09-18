import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool, getAppSettings } from "../db.js";
import { requireAuth, requireAdmin } from "../auth.js";
import { getPublicSettings, saveSettings } from "../oidc.js";
import { validateNewUserFields } from "../validation.js";
import { deletePhotoFile } from "../uploads.js";

const router = Router();
router.use(requireAuth, requireAdmin);

router.get("/users", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.is_admin, u.created_at,
            (u.oidc_sub IS NOT NULL) AS is_sso, COUNT(e.id)::int AS entry_count
     FROM users u
     LEFT JOIN entries e ON e.user_id = u.id
     GROUP BY u.id
     ORDER BY u.created_at ASC`
  );
  res.json({ users: rows });
});

router.post("/users", async (req, res) => {
  const result = validateNewUserFields(req.body || {});
  if (result.error) return res.status(400).json({ error: result.error });
  const { email, firstName, lastName, password } = result;
  const isAdmin = !!(req.body || {}).is_admin;

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await pool.query(
      "INSERT INTO users (email, first_name, last_name, password_hash, is_admin) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name, last_name, is_admin, created_at",
      [email, firstName, lastName, passwordHash, isAdmin]
    );
    res.status(201).json({ user: rows[0] });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "An account with that email already exists" });
    }
    throw err;
  }
});

router.get("/app-settings", async (req, res) => {
  const settings = await getAppSettings();
  res.json({ allowRegistration: settings.allow_registration });
});

router.put("/app-settings", async (req, res) => {
  const { allowRegistration } = req.body || {};
  if (typeof allowRegistration !== "boolean") {
    return res.status(400).json({ error: "allowRegistration must be true or false" });
  }
  await pool.query(
    "INSERT INTO app_settings (id, allow_registration) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET allow_registration = EXCLUDED.allow_registration",
    [allowRegistration]
  );
  res.json({ allowRegistration });
});

router.get("/oidc", (req, res) => {
  res.json({ settings: getPublicSettings() });
});

router.put("/oidc", async (req, res) => {
  const { enabled, providerName, issuerUrl, clientId, clientSecret, redirectUri, scopes } = req.body || {};

  const current = getPublicSettings();
  if (enabled) {
    if (!issuerUrl || !clientId || !redirectUri) {
      return res.status(400).json({ error: "Issuer URL, Client ID, and Redirect URI are required to enable SSO" });
    }
    if (!clientSecret && !current.hasClientSecret) {
      return res.status(400).json({ error: "Client Secret is required to enable SSO" });
    }
  }

  const result = await saveSettings({ enabled: !!enabled, providerName, issuerUrl, clientId, clientSecret, redirectUri, scopes });
  if (enabled && !result.ok) {
    return res.status(400).json({ error: `Saved, but could not connect to the identity provider: ${result.error}` });
  }
  res.json({ settings: getPublicSettings() });
});

router.put("/users/:id", async (req, res) => {
  const targetId = Number(req.params.id);
  if (targetId === req.user.id) {
    return res.status(400).json({ error: "You cannot change your own admin status" });
  }
  const { is_admin } = req.body || {};
  if (typeof is_admin !== "boolean") return res.status(400).json({ error: "is_admin must be true or false" });

  const { rows } = await pool.query(
    "UPDATE users SET is_admin = $1 WHERE id = $2 RETURNING id, email, first_name, last_name, is_admin, created_at",
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

router.delete("/entries", async (req, res) => {
  const { rows } = await pool.query("SELECT filename FROM entry_photos");
  const { rowCount } = await pool.query("DELETE FROM entries");
  rows.forEach((r) => deletePhotoFile(r.filename));
  res.json({ deleted: rowCount });
});

export default router;
