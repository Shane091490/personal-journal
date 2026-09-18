import { useEffect, useState } from "react";
import { api } from "../api.js";

function readOidcError() {
  const params = new URLSearchParams(window.location.search);
  const err = params.get("oidc_error");
  if (err) {
    params.delete("oidc_error");
    const rest = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (rest ? `?${rest}` : ""));
  }
  return err;
}

export default function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(() => readOidcError() || "");
  const [busy, setBusy] = useState(false);
  const [oidc, setOidc] = useState(null);
  const [allowRegistration, setAllowRegistration] = useState(true);

  useEffect(() => {
    api
      .oidcConfig()
      .then((res) => setOidc(res.enabled ? res : null))
      .catch(() => setOidc(null));
    api
      .registrationStatus()
      .then((res) => setAllowRegistration(res.allowRegistration))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!allowRegistration && mode === "register") setMode("login");
  }, [allowRegistration, mode]);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res =
        mode === "login" ? await api.login(email, password) : await api.register(email, password, firstName, lastName);
      onAuthed(res.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>Personal Journal</h1>
        <p className="sub">{mode === "login" ? "Welcome back." : "Create the first account for this journal."}</p>

        {oidc && (
          <>
            <a className="btn btn-block" href="/api/auth/oidc/login">
              Continue with {oidc.providerName}
            </a>
            <div className="auth-divider">
              <span>or</span>
            </div>
          </>
        )}

        <form onSubmit={submit}>
          {mode === "register" && (
            <div className="field-row">
              <div className="field">
                <label htmlFor="first-name">First name</label>
                <input
                  id="first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="last-name">Last name</label>
                <input
                  id="last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  required
                />
              </div>
            </div>
          )}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type={mode === "register" ? "email" : "text"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={mode === "register" ? 6 : undefined}
              required
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "login" ? "Log in" : "Register"}
          </button>
        </form>
        {(allowRegistration || mode === "register") && (
          <div className="auth-toggle">
            {mode === "login" ? (
              <>
                No account yet?{" "}
                <button type="button" onClick={() => setMode("register")}>
                  Register
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button type="button" onClick={() => setMode("login")}>
                  Log in
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
