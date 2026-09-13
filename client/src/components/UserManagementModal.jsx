import { useEffect, useState } from "react";
import { api } from "../api.js";
import Modal from "./Modal.jsx";
import ResetPasswordModal from "./ResetPasswordModal.jsx";
import ConfirmModal from "./ConfirmModal.jsx";

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function UserManagementModal({ currentUserId, onToast, onClose }) {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState("");
  const [resettingUser, setResettingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [busyId, setBusyId] = useState(null);

  function load() {
    api
      .listUsers()
      .then((res) => setUsers(res.users))
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function handleToggleAdmin(user) {
    setBusyId(user.id);
    try {
      await api.setUserAdmin(user.id, !user.is_admin);
      load();
      onToast(`${user.username} is ${user.is_admin ? "no longer an admin" : "now an admin"}`);
    } catch (err) {
      onToast(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleResetPassword(password) {
    await api.resetUserPassword(resettingUser.id, password);
    onToast(`Password reset for ${resettingUser.username}`);
  }

  async function handleDelete() {
    await api.deleteUser(deletingUser.id);
    load();
    onToast(`${deletingUser.username} was deleted`);
  }

  return (
    <>
      <Modal title="User management" onClose={onClose} wide>
        {error && <p className="error-text">{error}</p>}
        {!users ? (
          <p className="empty-state">Loading…</p>
        ) : (
          <div className="user-mgmt-list">
            {users.map((user) => {
              const isSelf = user.id === currentUserId;
              return (
                <div className="user-mgmt-row" key={user.id}>
                  <div className="user-mgmt-info">
                    <span className="user-avatar">{user.username.slice(0, 1).toUpperCase()}</span>
                    <div>
                      <div>
                        {user.username} {isSelf && <span className="user-mgmt-meta">(you)</span>}
                        {user.is_admin && <span className="admin-badge">Admin</span>}
                      </div>
                      <div className="user-mgmt-meta tnum">
                        {user.entry_count} {user.entry_count === 1 ? "entry" : "entries"} · joined {formatDate(user.created_at)}
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
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </Modal>

      {resettingUser && (
        <ResetPasswordModal
          username={resettingUser.username}
          onSave={handleResetPassword}
          onClose={() => setResettingUser(null)}
        />
      )}

      {deletingUser && (
        <ConfirmModal
          title="Delete user"
          message={`Delete ${deletingUser.username}'s account and all of their entries? This can't be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onClose={() => setDeletingUser(null)}
        />
      )}
    </>
  );
}
