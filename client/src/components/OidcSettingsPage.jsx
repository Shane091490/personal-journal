import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function OidcSettingsPage() {
  const [form, setForm] = useState(null);
  const [hasClientSecret, setHasClientSecret] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    api
      .getOidcSettings()
      .then((res) => {
        const s = res.settings;
        setForm({
          enabled: s.enabled,
          providerName: s.providerName || "SSO",
          issuerUrl: s.issuerUrl || "",
          clientId: s.clientId || "",
          clientSecret: "",
          redirectUri: s.redirectUri || `${window.location.origin}/api/auth/oidc/callback`,
          scopes: s.scopes || "openid email profile",
        });
        setHasClientSecret(s.hasClientSecret);
      })
      .catch((err) => setError(err.message));
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await api.saveOidcSettings(form);
      setHasClientSecret(res.settings.hasClientSecret);
      setForm((f) => ({ ...f, clientSecret: "" }));
      setNotice(res.settings.enabled ? "SSO is enabled and connected." : "Settings saved. SSO is disabled.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      {!form ? (
        <p className="empty-state">Loading…</p>
      ) : (
        <form onSubmit={submit}>
          <div className="field">
            <label className="switch-field">
              <span className="switch">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => update("enabled", e.target.checked)}
                />
                <span className="switch-track">
                  <span className="switch-thumb" />
                </span>
              </span>
              <span className="switch-label-text">Enable single sign-on</span>
            </label>
          </div>

          <div className="field">
            <label htmlFor="oidc-provider-name">Button label</label>
            <input
              id="oidc-provider-name"
              value={form.providerName}
              onChange={(e) => update("providerName", e.target.value)}
              placeholder="SSO"
              disabled={!form.enabled}
            />
          </div>

          <div className="field">
            <label htmlFor="oidc-issuer">Issuer URL</label>
            <input
              id="oidc-issuer"
              value={form.issuerUrl}
              onChange={(e) => update("issuerUrl", e.target.value)}
              placeholder="https://accounts.example.com"
              disabled={!form.enabled}
            />
          </div>

          <div className="field">
            <label htmlFor="oidc-client-id">Client ID</label>
            <input
              id="oidc-client-id"
              value={form.clientId}
              onChange={(e) => update("clientId", e.target.value)}
              disabled={!form.enabled}
            />
          </div>

          <div className="field">
            <label htmlFor="oidc-client-secret">
              Client secret {hasClientSecret && <span className="user-mgmt-meta">(saved — leave blank to keep it)</span>}
            </label>
            <input
              id="oidc-client-secret"
              type="password"
              value={form.clientSecret}
              onChange={(e) => update("clientSecret", e.target.value)}
              placeholder={hasClientSecret ? "••••••••" : ""}
              disabled={!form.enabled}
            />
          </div>

          <div className="field">
            <label htmlFor="oidc-redirect-uri">Redirect URI</label>
            <input
              id="oidc-redirect-uri"
              value={form.redirectUri}
              onChange={(e) => update("redirectUri", e.target.value)}
              disabled={!form.enabled}
            />
            <p className="user-mgmt-meta">Register this exact URL with your identity provider.</p>
          </div>

          <div className="field">
            <label htmlFor="oidc-scopes">Scopes</label>
            <input
              id="oidc-scopes"
              value={form.scopes}
              onChange={(e) => update("scopes", e.target.value)}
              disabled={!form.enabled}
            />
          </div>

          {notice && <p className="user-mgmt-meta">{notice}</p>}
          {error && <p className="error-text">{error}</p>}

          <div className="settings-section-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
