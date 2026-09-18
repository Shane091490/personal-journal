import { useState } from "react";
import Modal from "./Modal.jsx";

export default function ConfirmModal({
  title,
  message,
  warning,
  confirmLabel = "Confirm",
  danger,
  requireTypedPhrase,
  onConfirm,
  onClose,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [typed, setTyped] = useState("");

  const canConfirm = !requireTypedPhrase || typed.trim().toUpperCase() === requireTypedPhrase.toUpperCase();

  async function handleConfirm() {
    if (!canConfirm) return;
    setBusy(true);
    setError("");
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <p>{message}</p>
      {warning && <div className="import-warning">{warning}</div>}
      {requireTypedPhrase && (
        <div className="field">
          <label htmlFor="confirm-phrase">
            Type <strong>{requireTypedPhrase}</strong> to confirm
          </label>
          <input id="confirm-phrase" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        </div>
      )}
      {error && <p className="error-text">{error}</p>}
      <div className="modal-actions">
        <button className="btn" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button
          className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
          onClick={handleConfirm}
          disabled={busy || !canConfirm}
        >
          {busy ? "Working…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
