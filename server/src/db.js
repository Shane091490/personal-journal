import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.PGHOST || "db",
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || "journal",
  password: process.env.PGPASSWORD || "journal",
  database: process.env.PGDATABASE || "journal",
});

export async function waitForDb(retries = 30, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

export async function migrate() {
  await pool.query("ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS oidc_sub TEXT UNIQUE");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS oidc_issuer TEXT");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS oidc_settings (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      enabled BOOLEAN NOT NULL DEFAULT FALSE,
      provider_name TEXT NOT NULL DEFAULT 'SSO',
      issuer_url TEXT,
      client_id TEXT,
      client_secret_enc TEXT,
      redirect_uri TEXT,
      scopes TEXT NOT NULL DEFAULT 'openid email profile',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT");

  const { rows: usernameCol } = await pool.query(
    "SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'username'"
  );
  if (usernameCol.length) {
    await pool.query("UPDATE users SET email = username WHERE email IS NULL");
    await pool.query("ALTER TABLE users DROP COLUMN username");
  }

  await pool.query("ALTER TABLE users ALTER COLUMN email SET NOT NULL");
  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users(email)");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      allow_registration BOOLEAN NOT NULL DEFAULT TRUE
    )
  `);
  await pool.query("INSERT INTO app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING");

  // Entry bodies used to be stored as plain text and rendered with white-space:pre-wrap.
  // They're now rendered as sanitized rich-text HTML, so existing plain-text bodies need to be
  // HTML-escaped once so characters like <, >, & don't get misread as markup.
  const { rows: bodyFormatCol } = await pool.query(
    "SELECT 1 FROM information_schema.columns WHERE table_name = 'entries' AND column_name = 'body_format'"
  );
  if (!bodyFormatCol.length) {
    await pool.query(
      "UPDATE entries SET body = replace(replace(replace(body, '&', '&amp;'), '<', '&lt;'), '>', '&gt;')"
    );
    await pool.query("ALTER TABLE entries ADD COLUMN body_format TEXT NOT NULL DEFAULT 'html'");
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS entry_photos (
      id SERIAL PRIMARY KEY,
      entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query("CREATE INDEX IF NOT EXISTS idx_entry_photos_entry ON entry_photos(entry_id)");
}

export async function getAppSettings() {
  const { rows } = await pool.query("SELECT allow_registration FROM app_settings WHERE id = 1");
  return rows[0] || { allow_registration: true };
}

export async function countUsers() {
  const { rows } = await pool.query("SELECT COUNT(*)::int AS count FROM users");
  return rows[0].count;
}
