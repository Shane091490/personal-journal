import { useRef } from "react";

export default function SettingsPage({ user, onExport, onImportFile, onNavigateUserManagement, onNavigateOidcSettings }) {
  const fileInputRef = useRef(null);

  return (
    <div className="page">
      <section className="settings-section">
        <h3>Data</h3>
        <div className="sidebar-actions">
          <button className="btn" onClick={onExport}>
            Export JSON
          </button>
          <button className="btn" onClick={() => fileInputRef.current?.click()}>
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
      </section>

      {user.is_admin && (
        <section className="settings-section">
          <h3>Administration</h3>
          <div className="sidebar-actions">
            <button className="btn settings-link" onClick={onNavigateUserManagement}>
              User management
              <span className="settings-link-arrow">→</span>
            </button>
            <button className="btn settings-link" onClick={onNavigateOidcSettings}>
              SSO settings
              <span className="settings-link-arrow">→</span>
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
