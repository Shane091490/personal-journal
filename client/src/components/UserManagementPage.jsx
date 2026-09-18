import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import ResetPasswordModal from "./ResetPasswordModal.jsx";
import ConfirmModal from "./ConfirmModal.jsx";
import CreateUserModal from "./CreateUserModal.jsx";
import { displayName, initial } from "../userDisplay.js";

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function UserManagementPage({ currentUserId, onToast }) {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [resettingUser, setResettingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const [allowRegistration, setAllowRegistration] = useState(null);
  const [registrationBusy, setRegistrationBusy] = useState(false);

  function load() {
    api
      .listUsers()
      .then((res) => setUsers(res.users))
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  useEffect(() => {
    api
      .getAppSettings()
      .then((res) => setAllowRegistration(res.allowRegistration))
      .catch(() => {});
  }, []);

  const filteredUsers = useMemo(() => {
    if (!users) return null;
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => displayName(u).toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, query]);

  async function handleToggleRegistration(e) {
    const next = e.target.checked;
    setRegistrationBusy(true);
    try {
      const res = await api.saveAppSettings({ allowRegistration: next });
      setAllowRegistration(res.allowRegistration);
      onToast(res.allowRegistration ? "User registration is now allowed" : "User registration is now disabled");
    } catch (err) {
      onToast(err.message);
    } finally {
      setRegistrationBusy(false);
    }
  }

  async function handleToggleAdmin(user) {
    setBusyId(user.id);
    try {
      await api.setUserAdmin(user.id, !user.is_admin);
      load();
      onToast(`${displayName(user)} is ${user.is_admin ? "no longer an admin" : "now an admin"}`);
    } catch (err) {
      onToast(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleResetPassword(password) {
    await api.resetUserPassword(resettingUser.id, password);
    onToast(`Password reset for ${displayName(resettingUser)}`);
  }

  async function handleDelete() {
    await api.deleteUser(deletingUser.id);
    load();
    onToast(`${displayName(deletingUser)} was deleted`);
  }

  async function handleCreateUser(data) {
    const res = await api.createUser(data);
    load();
    onToast(`${displayName(res.user)} was created`);
  }

  return (
    <div className="page">
      <section className="settings-section">
        <h3>User registration</h3>
        <label className="switch-field">
          <span className="switch">
            <input
              type="checkbox"
              checked={!!allowRegistration}
              disabled={allowRegistration === null || registrationBusy}
              onChange={handleToggleRegistration}
            />
            <span className="switch-track">
              <span className="switch-thumb" />
            </span>
          </span>
          <span className="switch-label-text">Allow user registration</span>
        </label>
      </section>

      <section className="settings-section">
        <h3>User management</h3>

        <div className="search-row">
          <div className="search-box page-search">
            <span className="icon">⚲</span>
            <input placeholder="Search by name or email…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreateUser(true)}>
            + Create user
          </button>
        </div>

        {error && <p className="error-text">{error}</p>}
        {!users ? (
          <p className="empty-state">Loading…</p>
        ) : filteredUsers.length === 0 ? (
          <p className="empty-state">No users match “{query}”.</p>
        ) : (
          <div className="user-mgmt-list">
            {filteredUsers.map((user) => {
              const isSelf = user.id === currentUserId;
              return (
                <div className="user-mgmt-row" key={user.id}>
                  <div className="user-mgmt-info">
                    <span className="user-avatar">{initial(user)}</span>
                    <div className="user-mgmt-identity">
                      <div className="user-mgmt-name-line">
                        <span className="user-mgmt-username">{displayName(user)}</span>
                        {isSelf && <span className="user-mgmt-meta">(you)</span>}
                        {user.is_admin && <span className="admin-badge">Admin</span>}
                        {user.is_sso && <span className="admin-badge sso-badge">SSO</span>}
                      </div>
                      <div className="user-mgmt-meta tnum">
                        {user.email} · {user.entry_count} {user.entry_count === 1 ? "entry" : "entries"} · joined{" "}
                        {formatDate(user.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="user-mgmt-actions">
                    <button className="btn btn-sm" onClick={() => setResettingUser(user)}>
                      Reset password
                    </button>
                    {!isSelf && (
                      <>
                        <button className="btn btn-sm" disabled={busyId === user.id} onClick={() => handleToggleAdmin(user)}>
                          {user.is_admin ? "Remove admin" : "Make admin"}
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => setDeletingUser(user)}>
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {resettingUser && (
        <ResetPasswordModal
          label={displayName(resettingUser)}
          onSave={handleResetPassword}
          onClose={() => setResettingUser(null)}
        />
      )}

      {deletingUser && (
        <ConfirmModal
          title="Delete user"
          message={`Delete ${displayName(deletingUser)}'s account and all of their entries? This can't be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onClose={() => setDeletingUser(null)}
        />
      )}

      {showCreateUser && <CreateUserModal onSave={handleCreateUser} onClose={() => setShowCreateUser(false)} />}
    </div>
  );
}
