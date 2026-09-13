import { useState } from "react";
import Modal from "./Modal.jsx";

export default function ConfirmModal({ title, message, warning, confirmLabel = "Confirm", danger, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm() {
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
      {error && <p className="error-text">{error}</p>}
      <div className="modal-actions">
        <button className="btn" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button className={`btn ${danger ? "btn-danger" : "btn-primary"}`} onClick={handleConfirm} disabled={busy}>
          {busy ? "Working…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
