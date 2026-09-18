import { useEffect, useRef, useState } from "react";
import { displayName, initial as userInitial } from "../userDisplay.js";

export default function UserMenu({ user, onOpenSettings, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="user-menu" ref={ref}>
      <button className="user-chip" onClick={() => setOpen((o) => !o)}>
        <span className="user-avatar">{userInitial(user)}</span>
        <span className="username">{displayName(user)}</span>
      </button>
      {open && (
        <div className="user-dropdown">
          <div className="dropdown-header">
            <div className="name">{displayName(user)}</div>
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
          <button className="dropdown-item" onClick={onLogout}>
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
