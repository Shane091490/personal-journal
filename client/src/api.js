const BASE = "/api";

async function readError(res) {
  let message = `Request failed (${res.status})`;
  try {
    const data = await res.json();
    if (data.error) message = data.error;
  } catch {
    /* ignore non-JSON error bodies */
  }
  return message;
}

async function request(path, { method = "GET", body, headers } = {}) {
  const res = await fetch(BASE + path, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) throw new Error(await readError(res));
  if (res.status === 204) return null;
  return res.json();
}

async function uploadPhotos(entryId, files) {
  const formData = new FormData();
  files.forEach((file) => formData.append("photos", file));
  const res = await fetch(`${BASE}/entries/${entryId}/photos`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export const api = {
  register: (email, password, firstName, lastName) =>
    request("/auth/register", { method: "POST", body: { email, password, first_name: firstName, last_name: lastName } }),
  login: (email, password) => request("/auth/login", { method: "POST", body: { email, password } }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request("/auth/me"),
  oidcConfig: () => request("/auth/oidc/config"),
  registrationStatus: () => request("/auth/registration-status"),

  listEntries: (date, tag) => {
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (tag) params.set("tag", tag);
    const qs = params.toString();
    return request(`/entries${qs ? `?${qs}` : ""}`);
  },
  createEntry: ({ body, tags, mood }, createdAt) =>
    request("/entries", { method: "POST", body: { body, tags, mood, created_at: createdAt } }),
  updateEntry: (id, { body, tags, mood }) => request(`/entries/${id}`, { method: "PUT", body: { body, tags, mood } }),
  deleteEntry: (id) => request(`/entries/${id}`, { method: "DELETE" }),
  pinEntry: (id, pinned) => request(`/entries/${id}/pin`, { method: "PUT", body: { pinned } }),
  pinnedEntries: () => request("/entries/pinned"),
  onThisDay: (date) => request(`/entries/on-this-day?date=${date}`),
  entryStats: () => request("/entries/stats"),

  calendarDays: (year, month) => request(`/entries/calendar?year=${year}&month=${month}`),
  uploadEntryPhotos: (entryId, files) => uploadPhotos(entryId, files),
  deleteEntryPhoto: (entryId, photoId) => request(`/entries/${entryId}/photos/${photoId}`, { method: "DELETE" }),
  reorderEntryPhotos: (entryId, order) =>
    request(`/entries/${entryId}/photos/reorder`, { method: "PUT", body: { order } }),

  search: (q) => request(`/search?q=${encodeURIComponent(q)}`),

  importData: (data) => request("/data/import", { method: "POST", body: { confirm: true, data } }),

  listUsers: () => request("/admin/users"),
  createUser: (data) => request("/admin/users", { method: "POST", body: data }),
  setUserAdmin: (id, isAdmin) => request(`/admin/users/${id}`, { method: "PUT", body: { is_admin: isAdmin } }),
  resetUserPassword: (id, password) => request(`/admin/users/${id}/reset-password`, { method: "POST", body: { password } }),
  deleteUser: (id) => request(`/admin/users/${id}`, { method: "DELETE" }),

  getAppSettings: () => request("/admin/app-settings"),
  saveAppSettings: (settings) => request("/admin/app-settings", { method: "PUT", body: settings }),

  getOidcSettings: () => request("/admin/oidc"),
  saveOidcSettings: (settings) => request("/admin/oidc", { method: "PUT", body: settings }),
};

export async function downloadExport() {
  const res = await fetch(BASE + "/data/export", { credentials: "include" });
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "personal-journal-export.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
