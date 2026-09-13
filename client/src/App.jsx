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
import SettingsModal from "./components/SettingsModal.jsx";
import UserManagementModal from "./components/UserManagementModal.jsx";

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
  const [showSettings, setShowSettings] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [pendingImport, setPendingImport] = useState(null);

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
    await api.createEntry(body, backdated ? timestampForDateKey(selectedDate) : undefined);
    loadEntries();
    bumpRefresh();
    showToast(backdated ? `Entry added for ${formatDateLabel(selectedDate)}` : "Entry saved");
  }

  async function handleEditEntry(entry, body) {
    await api.updateEntry(entry.id, body);
    loadEntries();
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
    setShowSettings(false);
    setShowUserManagement(false);
    setPendingImport(null);
  }

  function handleImportFile(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        setShowSettings(false);
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
    showToast(`Imported ${res.imported.entries} entries`);
  }

  if (user === undefined) return null;
  if (!user) return <AuthScreen onAuthed={setUser} />;

  const isToday = !selectedDate || selectedDate === todayKey();

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-title serif">Personal Journal</h1>
        <div className="header-search">
          <SearchBox onSelectDate={setSelectedDate} />
        </div>
        <div className="header-right">
          <ThemeToggle theme={theme} onToggle={() => setTheme((t) => (t === "light" ? "dark" : "light"))} />
          <UserMenu
            user={user}
            onOpenSettings={() => setShowSettings(true)}
            onOpenUserManagement={() => setShowUserManagement(true)}
            onLogout={handleLogout}
          />
        </div>
      </header>

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

      <button className="fab" onClick={() => setShowNewEntry(true)} aria-label="New entry" title="New entry">
        +
      </button>

      {showNewEntry && (
        <EntryFormModal
          title={isToday ? "New entry" : `Entry for ${formatDateLabel(selectedDate)}`}
          placeholder={isToday ? "What's on your mind?" : `Write an entry for ${formatDateLabel(selectedDate)}…`}
          saveLabel={isToday ? "Save entry" : "Add entry"}
          onSave={handleCreateEntry}
          onClose={() => setShowNewEntry(false)}
        />
      )}

      {editingEntry && (
        <EntryFormModal
          title="Edit entry"
          initialBody={editingEntry.body}
          onSave={(body) => handleEditEntry(editingEntry, body)}
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

      {showSettings && (
        <SettingsModal onExport={downloadExport} onImportFile={handleImportFile} onClose={() => setShowSettings(false)} />
      )}

      {showUserManagement && (
        <UserManagementModal
          currentUserId={user.id}
          onToast={showToast}
          onClose={() => setShowUserManagement(false)}
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
