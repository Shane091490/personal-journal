import { useState } from "react";
import Modal from "./Modal.jsx";

export default function ResetPasswordModal({ username, onSave, onClose }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave(password);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Reset password for ${username}`} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="reset-password">New password</label>
          <input
            id="reset-password"
            type="password"
            autoFocus
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="error-text">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Reset password"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
