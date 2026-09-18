import { useEffect, useState } from "react";
import { api, downloadExport } from "./api.js";
import AuthScreen from "./components/AuthScreen.jsx";
import UserMenu from "./components/UserMenu.jsx";
import ThemeToggle from "./components/ThemeToggle.jsx";
import MiniCalendar from "./components/MiniCalendar.jsx";
import SearchBox from "./components/SearchBox.jsx";
import JournalEntryCard from "./components/JournalEntryCard.jsx";
import EntryFormModal from "./components/EntryFormModal.jsx";
import ConfirmModal from "./components/ConfirmModal.jsx";
import SettingsPage from "./components/SettingsPage.jsx";
import UserManagementPage from "./components/UserManagementPage.jsx";
import OidcSettingsPage from "./components/OidcSettingsPage.jsx";

const PATH_VIEW = {
  "/settings": "settings",
  "/settings/users": "user-management",
  "/settings/sso": "sso-settings",
};

function viewForPath(pathname) {
  return PATH_VIEW[pathname] || "journal";
}

const PAGE_META = {
  settings: { title: "Settings", backLabel: "Back to journal" },
  "user-management": { title: "User management", backLabel: "Back to settings" },
  "sso-settings": { title: "SSO settings", backLabel: "Back to settings" },
};

function todayKey() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function formatDateLabel(dateKey) {
  return new Date(dateKey + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function timestampForDateKey(dateKey) {
  const now = new Date();
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds()).toISOString();
}

export default function App() {
  const [user, setUser] = useState(undefined);
  const [theme, setTheme] = useState(() => localStorage.getItem("journal-theme") || "light");

  const [entries, setEntries] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState("");

  const [showNewEntry, setShowNewEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [deletingEntry, setDeletingEntry] = useState(null);
  const [pendingImport, setPendingImport] = useState(null);

  const [view, setView] = useState(() => viewForPath(window.location.pathname));

  useEffect(() => {
    function onPopState() {
      setView(viewForPath(window.location.pathname));
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function navigate(path, viewName) {
    window.history.pushState({}, "", path);
    setView(viewName);
  }

  const navigateToJournal = () => navigate("/", "journal");
  const navigateToSettings = () => navigate("/settings", "settings");
  const navigateToUserManagement = () => navigate("/settings/users", "user-management");
  const navigateToOidcSettings = () => navigate("/settings/sso", "sso-settings");

  function navigateBack() {
    if (view === "settings") navigateToJournal();
    else navigateToSettings();
  }

  useEffect(() => {
    if ((view === "user-management" || view === "sso-settings") && user && !user.is_admin) {
      navigateToSettings();
    }
  }, [view, user]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("journal-theme", theme);
  }, [theme]);

  useEffect(() => {
    api
      .me()
      .then((res) => setUser(res.user))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (user) loadEntries();
  }, [user, selectedDate, refreshKey]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }

  function loadEntries() {
    api
      .listEntries(selectedDate)
      .then((res) => setEntries(res.entries))
      .catch(() => {});
  }

  function bumpRefresh() {
    setRefreshKey((k) => k + 1);
  }

  async function handleCreateEntry(body) {
    const backdated = selectedDate && selectedDate !== todayKey();
    const res = await api.createEntry(body, backdated ? timestampForDateKey(selectedDate) : undefined);
    loadEntries();
    bumpRefresh();
    showToast(backdated ? `Entry added for ${formatDateLabel(selectedDate)}` : "Entry saved");
    return res.entry;
  }

  async function handleEditEntry(entry, body) {
    const res = await api.updateEntry(entry.id, body);
    loadEntries();
    return res.entry;
  }

  async function handleUploadPhotos(entryId, files) {
    await api.uploadEntryPhotos(entryId, files);
  }

  async function handleDeletePhoto(entryId, photoId) {
    await api.deleteEntryPhoto(entryId, photoId);
  }

  async function handleDeleteEntry(entry) {
    await api.deleteEntry(entry.id);
    loadEntries();
    bumpRefresh();
  }

  async function handleLogout() {
    await api.logout();
    setUser(null);
    setEntries([]);
    setSelectedDate(null);
    setShowNewEntry(false);
    setEditingEntry(null);
    setDeletingEntry(null);
    setPendingImport(null);
    window.history.pushState({}, "", "/");
    setView("journal");
  }

  function handleImportFile(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        setPendingImport(data);
      } catch {
        showToast("That file isn't valid JSON");
      }
    };
    reader.readAsText(file);
  }

  async function confirmImport() {
    const res = await api.importData(pendingImport);
    loadEntries();
    bumpRefresh();
    const photoCount = res.imported.photos || 0;
    showToast(
      `Imported ${res.imported.entries} entries${photoCount ? ` and ${photoCount} photos` : ""}`
    );
  }

  if (user === undefined) return null;
  if (!user) return <AuthScreen onAuthed={setUser} />;

  const isToday = !selectedDate || selectedDate === todayKey();

  return (
    <div className="app-shell">
      <header className="app-header">
        {view === "journal" ? (
          <h1 className="app-title serif">Personal Journal</h1>
        ) : (
          <div className="header-nav">
            <button className="back-btn" onClick={navigateBack} aria-label={PAGE_META[view].backLabel} title={PAGE_META[view].backLabel}>
              ←
            </button>
            <h1 className="app-title serif header-page-title">{PAGE_META[view].title}</h1>
          </div>
        )}
        <div className="header-search">
          <SearchBox onSelectDate={setSelectedDate} />
        </div>
        <div className="header-right">
          <ThemeToggle theme={theme} onToggle={() => setTheme((t) => (t === "light" ? "dark" : "light"))} />
          <UserMenu user={user} onOpenSettings={navigateToSettings} onLogout={handleLogout} />
        </div>
      </header>

      {view !== "journal" ? (
        <main className="main-content main-content--page">
          {view === "settings" && (
            <SettingsPage
              user={user}
              onExport={downloadExport}
              onImportFile={handleImportFile}
              onNavigateUserManagement={navigateToUserManagement}
              onNavigateOidcSettings={navigateToOidcSettings}
            />
          )}
          {view === "user-management" && <UserManagementPage currentUserId={user.id} onToast={showToast} />}
          {view === "sso-settings" && <OidcSettingsPage />}
        </main>
      ) : (
        <>
          <aside className="sidebar">
            <MiniCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} refreshKey={refreshKey} />
          </aside>

          <main className="main-content">
            {selectedDate && (
              <div className="day-banner">
                <span>
                  Entries for <strong>{formatDateLabel(selectedDate)}</strong>
                </span>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedDate(null)}>
                  Clear
                </button>
              </div>
            )}

            {entries.length === 0 ? (
              <div className="empty-state">
                {selectedDate ? "Nothing written this day yet." : "No entries yet. Tap + to write one."}
              </div>
            ) : (
              <div className="entry-list">
                {entries.map((entry) => (
                  <JournalEntryCard key={entry.id} entry={entry} onEdit={setEditingEntry} onDelete={setDeletingEntry} />
                ))}
              </div>
            )}
          </main>
        </>
      )}

      {view === "journal" && (
        <button className="fab" onClick={() => setShowNewEntry(true)} aria-label="New entry" title="New entry">
          +
        </button>
      )}

      {showNewEntry && (
        <EntryFormModal
          title={isToday ? "New entry" : `Entry for ${formatDateLabel(selectedDate)}`}
          placeholder={isToday ? "What's on your mind?" : `Write an entry for ${formatDateLabel(selectedDate)}…`}
          saveLabel={isToday ? "Save entry" : "Add entry"}
          onSave={handleCreateEntry}
          onUploadPhotos={handleUploadPhotos}
          onDeletePhoto={handleDeletePhoto}
          onPhotosChanged={loadEntries}
          onClose={() => setShowNewEntry(false)}
        />
      )}

      {editingEntry && (
        <EntryFormModal
          title="Edit entry"
          entry={editingEntry}
          onSave={(body) => handleEditEntry(editingEntry, body)}
          onUploadPhotos={handleUploadPhotos}
          onDeletePhoto={handleDeletePhoto}
          onPhotosChanged={loadEntries}
          onClose={() => setEditingEntry(null)}
        />
      )}

      {deletingEntry && (
        <ConfirmModal
          title="Delete entry"
          message="Delete this journal entry? This can't be undone."
          confirmLabel="Delete"
          danger
          onConfirm={() => handleDeleteEntry(deletingEntry)}
          onClose={() => setDeletingEntry(null)}
        />
      )}

      {pendingImport && (
        <ConfirmModal
          title="Replace all data?"
          message="Importing will overwrite your current entries with the contents of this file."
          warning="This cannot be undone. Consider exporting your current data first."
          confirmLabel="Replace data"
          danger
          onConfirm={confirmImport}
          onClose={() => setPendingImport(null)}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
