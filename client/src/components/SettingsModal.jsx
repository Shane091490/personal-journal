import { useRef } from "react";
import Modal from "./Modal.jsx";

export default function SettingsModal({ onExport, onImportFile, onClose }) {
  const fileInputRef = useRef(null);

  return (
    <Modal title="Settings" onClose={onClose}>
      <div className="field">
        <label>Data</label>
        <div className="sidebar-actions">
          <button className="btn btn-block" onClick={onExport}>
            Export JSON
          </button>
          <button className="btn btn-block" onClick={() => fileInputRef.current?.click()}>
            Import JSON…
          </button>
          <input
            type="file"
            accept="application/json"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={onImportFile}
          />
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}
