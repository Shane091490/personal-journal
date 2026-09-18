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
import StatsWidget from "./components/StatsWidget.jsx";

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
  const [pinnedEntries, setPinnedEntries] = useState([]);
  const [onThisDayEntries, setOnThisDayEntries] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [tagFilter, setTagFilter] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState("");

  const [showNewEntry, setShowNewEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [deletingEntry, setDeletingEntry] = useState(null);
  const [pendingImport, setPendingImport] = useState(null);
  const [confirmDeleteMine, setConfirmDeleteMine] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

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
    if (!user) return;
    loadEntries();
    loadPinned();
  }, [user, selectedDate, tagFilter, refreshKey]);

  useEffect(() => {
    if (!user) return;
    loadOnThisDay();
  }, [user, selectedDate, refreshKey]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }

  function loadEntries() {
    api
      .listEntries(selectedDate, tagFilter)
      .then((res) => setEntries(res.entries))
      .catch(() => {});
  }

  function loadPinned() {
    if (selectedDate || tagFilter) {
      setPinnedEntries([]);
      return;
    }
    api
      .pinnedEntries()
      .then((res) => setPinnedEntries(res.entries))
      .catch(() => {});
  }

  function loadOnThisDay() {
    api
      .onThisDay(selectedDate || todayKey())
      .then((res) => setOnThisDayEntries(res.entries))
      .catch(() => {});
  }

  function refreshEntryLists() {
    loadEntries();
    loadPinned();
    loadOnThisDay();
  }

  function bumpRefresh() {
    setRefreshKey((k) => k + 1);
  }

  async function handleCreateEntry(payload) {
    const backdated = selectedDate && selectedDate !== todayKey();
    const res = await api.createEntry(payload, backdated ? timestampForDateKey(selectedDate) : undefined);
    refreshEntryLists();
    bumpRefresh();
    showToast(backdated ? `Entry added for ${formatDateLabel(selectedDate)}` : "Entry saved");
    return res.entry;
  }

  async function handleEditEntry(entry, payload) {
    const res = await api.updateEntry(entry.id, payload);
    refreshEntryLists();
    return res.entry;
  }

  async function handleUploadPhotos(entryId, files) {
    await api.uploadEntryPhotos(entryId, files);
  }

  async function handleDeletePhoto(entryId, photoId) {
    await api.deleteEntryPhoto(entryId, photoId);
  }

  async function handleReorderPhotos(entryId, order) {
    await api.reorderEntryPhotos(entryId, order);
  }

  async function handleTogglePin(entry) {
    await api.pinEntry(entry.id, !entry.pinned);
    refreshEntryLists();
  }

  function handleTagClick(tag) {
    setSelectedDate(null);
    setTagFilter(tag);
  }

  async function handleDeleteEntry(entry) {
    await api.deleteEntry(entry.id);
    refreshEntryLists();
    bumpRefresh();
  }

  async function handleDeleteAllMyEntries() {
    const res = await api.deleteAllMyEntries();
    refreshEntryLists();
    bumpRefresh();
    showToast(`Deleted ${res.deleted} ${res.deleted === 1 ? "entry" : "entries"}`);
  }

  async function handleDeleteAllEntriesEverywhere() {
    const res = await api.deleteAllEntriesEverywhere();
    refreshEntryLists();
    bumpRefresh();
    showToast(`Deleted ${res.deleted} ${res.deleted === 1 ? "entry" : "entries"} across all accounts`);
  }

  async function handleLogout() {
    await api.logout();
    setUser(null);
    setEntries([]);
    setPinnedEntries([]);
    setOnThisDayEntries([]);
    setSelectedDate(null);
    setTagFilter(null);
    setShowNewEntry(false);
    setEditingEntry(null);
    setDeletingEntry(null);
    setPendingImport(null);
    setConfirmDeleteMine(false);
    setConfirmDeleteAll(false);
    window.history.pushState({}, "", "/");
    setView("journal");
  }

  async function handleExport() {
    try {
      await downloadExport();
    } catch (err) {
      showToast(err.message || "Export failed");
    }
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
    refreshEntryLists();
    bumpRefresh();
    const photoCount = res.imported.photos || 0;
    showToast(
      `Imported ${res.imported.entries} entries${photoCount ? ` and ${photoCount} photos` : ""}`
    );
  }

  if (user === undefined) return null;
  if (!user) return <AuthScreen onAuthed={setUser} />;

  const isToday = !selectedDate || selectedDate === todayKey();
  const showPinnedSection = !selectedDate && !tagFilter && pinnedEntries.length > 0;
  const showOnThisDay = !tagFilter && onThisDayEntries.length > 0;
  const mainEntries = !selectedDate && !tagFilter ? entries.filter((e) => !e.pinned) : entries;
  const showEmptyState = mainEntries.length === 0 && !showPinnedSection && !showOnThisDay;

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
              onExport={handleExport}
              onImportFile={handleImportFile}
              onNavigateUserManagement={navigateToUserManagement}
              onNavigateOidcSettings={navigateToOidcSettings}
              onDeleteMyEntries={() => setConfirmDeleteMine(true)}
              onDeleteAllEntries={() => setConfirmDeleteAll(true)}
            />
          )}
          {view === "user-management" && <UserManagementPage currentUserId={user.id} onToast={showToast} />}
          {view === "sso-settings" && <OidcSettingsPage />}
        </main>
      ) : (
        <>
          <aside className="sidebar">
            <StatsWidget refreshKey={refreshKey} />
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

            {tagFilter && (
              <div className="day-banner">
                <span>
                  Tagged <strong>#{tagFilter}</strong>
                </span>
                <button className="btn btn-ghost btn-sm" onClick={() => setTagFilter(null)}>
                  Clear
                </button>
              </div>
            )}

            {showOnThisDay && (
              <section className="entry-section">
                <h2 className="section-heading">On this day</h2>
                <div className="entry-list">
                  {onThisDayEntries.map((entry) => (
                    <JournalEntryCard
                      key={`otd-${entry.id}`}
                      entry={entry}
                      showYear
                      onEdit={setEditingEntry}
                      onDelete={setDeletingEntry}
                      onTogglePin={handleTogglePin}
                      onTagClick={handleTagClick}
                    />
                  ))}
                </div>
              </section>
            )}

            {showPinnedSection && (
              <section className="entry-section">
                <h2 className="section-heading">📌 Pinned</h2>
                <div className="entry-list">
                  {pinnedEntries.map((entry) => (
                    <JournalEntryCard
                      key={`pin-${entry.id}`}
                      entry={entry}
                      onEdit={setEditingEntry}
                      onDelete={setDeletingEntry}
                      onTogglePin={handleTogglePin}
                      onTagClick={handleTagClick}
                    />
                  ))}
                </div>
              </section>
            )}

            {showEmptyState ? (
              <div className="empty-state">
                {selectedDate || tagFilter ? "Nothing here yet." : "No entries yet. Tap + to write one."}
              </div>
            ) : (
              mainEntries.length > 0 && (
                <div className="entry-list">
                  {mainEntries.map((entry) => (
                    <JournalEntryCard
                      key={entry.id}
                      entry={entry}
                      onEdit={setEditingEntry}
                      onDelete={setDeletingEntry}
                      onTogglePin={handleTogglePin}
                      onTagClick={handleTagClick}
                    />
                  ))}
                </div>
              )
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
          onReorderPhotos={handleReorderPhotos}
          onPhotosChanged={refreshEntryLists}
          onClose={() => setShowNewEntry(false)}
        />
      )}

      {editingEntry && (
        <EntryFormModal
          title="Edit entry"
          entry={editingEntry}
          onSave={(payload) => handleEditEntry(editingEntry, payload)}
          onUploadPhotos={handleUploadPhotos}
          onDeletePhoto={handleDeletePhoto}
          onReorderPhotos={handleReorderPhotos}
          onPhotosChanged={refreshEntryLists}
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

      {confirmDeleteMine && (
        <ConfirmModal
          title="Delete all my entries"
          message="Permanently delete every journal entry (and any attached photos) in your account."
          warning="This cannot be undone. It does not affect other users' entries."
          confirmLabel="Delete all my entries"
          danger
          onConfirm={handleDeleteAllMyEntries}
          onClose={() => setConfirmDeleteMine(false)}
        />
      )}

      {confirmDeleteAll && (
        <ConfirmModal
          title="Delete all entries (all users)"
          message="Permanently delete every journal entry and photo for every user in this application."
          warning="This cannot be undone and affects every account, not just yours."
          confirmLabel="Delete everything"
          danger
          requireTypedPhrase="DELETE ALL"
          onConfirm={handleDeleteAllEntriesEverywhere}
          onClose={() => setConfirmDeleteAll(false)}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
