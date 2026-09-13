import { useEffect, useRef, useState } from "react";

export default function UserMenu({ user, onOpenSettings, onOpenUserManagement, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const initial = user.username.slice(0, 1).toUpperCase();

  return (
    <div className="user-menu" ref={ref}>
      <button className="user-chip" onClick={() => setOpen((o) => !o)}>
        <span className="user-avatar">{initial}</span>
        <span className="username">{user.username}</span>
      </button>
      {open && (
        <div className="user-dropdown">
          <div className="dropdown-header">
            <div className="name">{user.username}</div>
            <div className="role">{user.is_admin ? "Admin" : "Member"}</div>
          </div>
          <button
            className="dropdown-item"
            onClick={() => {
              setOpen(false);
              onOpenSettings();
            }}
          >
            Settings
          </button>
          {user.is_admin && (
            <button
              className="dropdown-item"
              onClick={() => {
                setOpen(false);
                onOpenUserManagement();
              }}
            >
              User management
            </button>
          )}
          <button className="dropdown-item" onClick={onLogout}>
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
