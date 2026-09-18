import { useState } from "react";
import Modal from "./Modal.jsx";

export default function CreateUserModal({ onSave, onClose }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave({ email, password, first_name: firstName, last_name: lastName, is_admin: isAdmin });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Create user" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="field-row">
          <div className="field">
            <label htmlFor="new-user-first">First name</label>
            <input
              id="new-user-first"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="field">
            <label htmlFor="new-user-last">Last name</label>
            <input id="new-user-last" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </div>
        </div>

        <div className="field">
          <label htmlFor="new-user-email">Email</label>
          <input
            id="new-user-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="new-user-password">Password</label>
          <input
            id="new-user-password"
            type="password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label className="switch-field">
            <span className="switch">
              <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} />
              <span className="switch-track">
                <span className="switch-thumb" />
              </span>
            </span>
            <span className="switch-label-text">Admin</span>
          </label>
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Creating…" : "Create user"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
