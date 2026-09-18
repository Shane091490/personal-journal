import crypto from "crypto";
import { Issuer, generators } from "openid-client";
import { pool } from "./db.js";

export { generators };

const ENC_ALGO = "aes-256-gcm";

function getEncryptionKey() {
  const secret = process.env.JWT_SECRET || "dev-secret-change-me";
  return crypto.scryptSync(secret, "personal-journal-oidc-secret", 32);
}

function encryptSecret(plain) {
  if (!plain) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ENC_ALGO, getEncryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

function decryptSecret(blob) {
  if (!blob) return null;
  const buf = Buffer.from(blob, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ENC_ALGO, getEncryptionKey(), iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}

let cachedSettings = null;
let cachedClient = null;

export function getClient() {
  return cachedClient;
}

export function isOidcEnabled() {
  return !!cachedClient;
}

export function getProviderName() {
  return cachedSettings?.provider_name || "SSO";
}

export function getScopes() {
  return cachedSettings?.scopes || "openid email profile";
}

export function getPublicSettings() {
  const s = cachedSettings;
  return {
    enabled: !!s?.enabled,
    providerName: s?.provider_name || "SSO",
    issuerUrl: s?.issuer_url || "",
    clientId: s?.client_id || "",
    redirectUri: s?.redirect_uri || "",
    scopes: s?.scopes || "openid email profile",
    hasClientSecret: !!s?.client_secret_enc,
    connected: isOidcEnabled(),
  };
}

export async function loadSettings() {
  const { rows } = await pool.query("SELECT * FROM oidc_settings WHERE id = 1");
  cachedSettings = rows[0] || null;
  return cachedSettings;
}

export async function reinitClient() {
  cachedClient = null;
  const s = cachedSettings;
  if (!s || !s.enabled) return { ok: true };
  if (!s.issuer_url || !s.client_id || !s.redirect_uri || !s.client_secret_enc) {
    return { ok: false, error: "Issuer URL, Client ID, Client Secret, and Redirect URI are all required" };
  }
  try {
    const secret = decryptSecret(s.client_secret_enc);
    const issuer = await Issuer.discover(s.issuer_url);
    cachedClient = new issuer.Client({
      client_id: s.client_id,
      client_secret: secret,
      redirect_uris: [s.redirect_uri],
      response_types: ["code"],
    });
    return { ok: true };
  } catch (err) {
    cachedClient = null;
    return { ok: false, error: err.message };
  }
}

export async function saveSettings({ enabled, providerName, issuerUrl, clientId, clientSecret, redirectUri, scopes }) {
  const existing = cachedSettings || (await loadSettings());
  const secretEnc = clientSecret ? encryptSecret(clientSecret) : existing?.client_secret_enc || null;

  const { rows } = await pool.query(
    `INSERT INTO oidc_settings (id, enabled, provider_name, issuer_url, client_id, client_secret_enc, redirect_uri, scopes, updated_at)
     VALUES (1, $1, $2, $3, $4, $5, $6, $7, now())
     ON CONFLICT (id) DO UPDATE SET
       enabled = EXCLUDED.enabled,
       provider_name = EXCLUDED.provider_name,
       issuer_url = EXCLUDED.issuer_url,
       client_id = EXCLUDED.client_id,
       client_secret_enc = EXCLUDED.client_secret_enc,
       redirect_uri = EXCLUDED.redirect_uri,
       scopes = EXCLUDED.scopes,
       updated_at = now()
     RETURNING *`,
    [
      !!enabled,
      (providerName || "SSO").trim(),
      (issuerUrl || "").trim() || null,
      (clientId || "").trim() || null,
      secretEnc,
      (redirectUri || "").trim() || null,
      (scopes || "openid email profile").trim(),
    ]
  );
  cachedSettings = rows[0];
  return reinitClient();
}

export async function initOidc() {
  await loadSettings();
  if (cachedSettings?.enabled) {
    const result = await reinitClient();
    if (result.ok) console.log(`OIDC SSO enabled (issuer: ${cachedSettings.issuer_url})`);
    else console.error("OIDC SSO is enabled but failed to initialize:", result.error);
  }
}
