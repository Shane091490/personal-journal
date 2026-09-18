export function displayName(user) {
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
  return name || user.email;
}

export function initial(user) {
  return (user.first_name || user.email || "?").slice(0, 1).toUpperCase();
}
