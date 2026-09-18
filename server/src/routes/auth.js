import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool, getAppSettings } from "../db.js";
import { setAuthCookie, clearAuthCookie, requireAuth } from "../auth.js";
import { validateNewUserFields } from "../validation.js";

const router = Router();

router.get("/registration-status", async (req, res) => {
  const settings = await getAppSettings();
  res.json({ allowRegistration: settings.allow_registration });
});

router.post("/register", async (req, res) => {
  const result = validateNewUserFields(req.body || {});
  if (result.error) return res.status(400).json({ error: result.error });
  const { email, firstName, lastName, password } = result;
  const passwordHash = await bcrypt.hash(password, 10);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Lock app_settings so a concurrent registration can't race the first-user/auto-disable logic below.
    const { rows: settingsRows } = await client.query(
      "SELECT allow_registration FROM app_settings WHERE id = 1 FOR UPDATE"
    );
    const allowRegistration = settingsRows[0] ? settingsRows[0].allow_registration : true;
    const { rows: countRows } = await client.query("SELECT COUNT(*)::int AS count FROM users");
    const isFirstUser = countRows[0].count === 0;

    if (!isFirstUser && !allowRegistration) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Registration is currently disabled. Contact an administrator." });
    }

    let rows;
    try {
      ({ rows } = await client.query(
        "INSERT INTO users (email, first_name, last_name, password_hash, is_admin) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name, last_name, is_admin",
        [email, firstName, lastName, passwordHash, isFirstUser]
      ));
    } catch (err) {
      await client.query("ROLLBACK");
      if (err.code === "23505") {
        return res.status(409).json({ error: "An account with that email already exists" });
      }
      throw err;
    }

    // The first account becomes the admin; registration is then closed until that admin reopens it.
    if (isFirstUser) {
      await client.query(
        "INSERT INTO app_settings (id, allow_registration) VALUES (1, false) ON CONFLICT (id) DO UPDATE SET allow_registration = false"
      );
    }

    await client.query("COMMIT");
    const user = rows[0];
    setAuthCookie(res, user);
    res.status(201).json({ user });
  } finally {
    client.release();
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

  const { rows } = await pool.query(
    "SELECT id, email, first_name, last_name, password_hash, is_admin FROM users WHERE email = $1",
    [String(email).trim().toLowerCase()]
  );
  const user = rows[0];
  if (!user) return res.status(401).json({ error: "Invalid email or password" });
  if (!user.password_hash) {
    return res.status(401).json({ error: "This account signs in with SSO. Use the sign-in-with-SSO option instead." });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: "Invalid email or password" });

  setAuthCookie(res, user);
  res.json({
    user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, is_admin: user.is_admin },
  });
});

router.post("/logout", (req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
