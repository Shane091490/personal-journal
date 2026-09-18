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

  listEntries: (date) => request(`/entries${date ? `?date=${date}` : ""}`),
  createEntry: (body, createdAt) => request("/entries", { method: "POST", body: { body, created_at: createdAt } }),
  updateEntry: (id, body) => request(`/entries/${id}`, { method: "PUT", body: { body } }),
  deleteEntry: (id) => request(`/entries/${id}`, { method: "DELETE" }),

  calendarDays: (year, month) => request(`/entries/calendar?year=${year}&month=${month}`),
  uploadEntryPhotos: (entryId, files) => uploadPhotos(entryId, files),
  deleteEntryPhoto: (entryId, photoId) => request(`/entries/${entryId}/photos/${photoId}`, { method: "DELETE" }),

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
