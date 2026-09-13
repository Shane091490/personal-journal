import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";

function snippet(text, len = 80) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > len ? clean.slice(0, len) + "…" : clean;
}

export default function SearchBox({ onSelectDate }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(null);
      return;
    }
    const handle = setTimeout(() => {
      api.search(q).then(setResults).catch(() => setResults({ entries: [] }));
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div className="search-box" ref={ref}>
      <span className="icon">⚲</span>
      <input
        placeholder="Search your entries…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && results && results.entries.length > 0 && (
        <div className="search-results">
          {results.entries.map((e) => (
            <div
              key={e.id}
              className="search-result-item"
              onClick={() => {
                onSelectDate(e.created_at.slice(0, 10));
                setOpen(false);
              }}
            >
              <div className="meta">{new Date(e.created_at).toLocaleString()}</div>
              {snippet(e.body)}
            </div>
          ))}
        </div>
      )}
      {open && results && results.entries.length === 0 && query.trim() && (
        <div className="search-results">
          <div className="search-result-item">No matches</div>
        </div>
      )}
    </div>
  );
}
