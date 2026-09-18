CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  password_hash TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  oidc_sub TEXT UNIQUE,
  oidc_issuer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE entries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  body_format TEXT NOT NULL DEFAULT 'html',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_entries_user_created ON entries(user_id, created_at);

CREATE TABLE entry_photos (
  id SERIAL PRIMARY KEY,
  entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_entry_photos_entry ON entry_photos(entry_id);

CREATE TABLE oidc_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  provider_name TEXT NOT NULL DEFAULT 'SSO',
  issuer_url TEXT,
  client_id TEXT,
  client_secret_enc TEXT,
  redirect_uri TEXT,
  scopes TEXT NOT NULL DEFAULT 'openid email profile',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  allow_registration BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO app_settings (id) VALUES (1);
