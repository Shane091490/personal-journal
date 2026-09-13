import { useState } from "react";
import Modal from "./Modal.jsx";

export default function EntryFormModal({
  initialBody = "",
  title = "Edit entry",
  placeholder = "",
  saveLabel = "Save",
  onSave,
  onClose,
}) {
  const [text, setText] = useState(initialBody);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError("");
    try {
      await onSave(text.trim());
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="field">
          <textarea
            className="textarea-note"
            style={{ minHeight: 140 }}
            placeholder={placeholder}
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
          />
        </div>
        {error && <p className="error-text">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Saving…" : saveLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
