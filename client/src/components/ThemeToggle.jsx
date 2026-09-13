export default function ThemeToggle({ theme, onToggle }) {
  return (
    <button className="theme-toggle" onClick={onToggle} title="Toggle theme" aria-label="Toggle theme">
      {theme === "dark" ? "☾" : "☀"}
    </button>
  );
}
