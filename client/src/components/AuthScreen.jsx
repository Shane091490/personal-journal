import { useState } from "react";
import { api } from "../api.js";

export default function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = mode === "login" ? await api.login(username, password) : await api.register(username, password);
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
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
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
      </div>
    </div>
  );
}
