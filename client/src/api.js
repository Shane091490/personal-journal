const BASE = "/api";

async function request(path, { method = "GET", body, headers } = {}) {
  const res = await fetch(BASE + path, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data.error) message = data.error;
    } catch {
      /* ignore non-JSON error bodies */
    }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  register: (username, password) => request("/auth/register", { method: "POST", body: { username, password } }),
  login: (username, password) => request("/auth/login", { method: "POST", body: { username, password } }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request("/auth/me"),

  listEntries: (date) => request(`/entries${date ? `?date=${date}` : ""}`),
  createEntry: (body, createdAt) => request("/entries", { method: "POST", body: { body, created_at: createdAt } }),
  updateEntry: (id, body) => request(`/entries/${id}`, { method: "PUT", body: { body } }),
  deleteEntry: (id) => request(`/entries/${id}`, { method: "DELETE" }),

  calendarDays: (year, month) => request(`/entries/calendar?year=${year}&month=${month}`),

  search: (q) => request(`/search?q=${encodeURIComponent(q)}`),

  importData: (data) => request("/data/import", { method: "POST", body: { confirm: true, data } }),

  listUsers: () => request("/admin/users"),
  setUserAdmin: (id, isAdmin) => request(`/admin/users/${id}`, { method: "PUT", body: { is_admin: isAdmin } }),
  resetUserPassword: (id, password) => request(`/admin/users/${id}/reset-password`, { method: "POST", body: { password } }),
  deleteUser: (id) => request(`/admin/users/${id}`, { method: "DELETE" }),
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
