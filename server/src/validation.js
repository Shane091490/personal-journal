const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateNewUserFields({ email, password, first_name, last_name }) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanFirst = String(first_name || "").trim();
  const cleanLast = String(last_name || "").trim();

  if (!cleanEmail || !EMAIL_RE.test(cleanEmail)) {
    return { error: "A valid email address is required" };
  }
  if (!cleanFirst || !cleanLast) {
    return { error: "First and last name are required" };
  }
  if (!password || password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  return { email: cleanEmail, firstName: cleanFirst, lastName: cleanLast, password };
}
