import { useState } from "react";

const MAX_TAGS = 8;

export default function TagInput({ tags, onChange }) {
  const [draft, setDraft] = useState("");

  function commitDraft() {
    const value = draft.trim().toLowerCase();
    setDraft("");
    if (!value || tags.includes(value) || tags.length >= MAX_TAGS) return;
    onChange([...tags, value]);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitDraft();
    } else if (e.key === "Backspace" && !draft && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  function removeTag(tag) {
    onChange(tags.filter((t) => t !== tag));
  }

  return (
    <div className="tag-input">
      {tags.map((tag) => (
        <span className="tag-chip" key={tag}>
          #{tag}
          <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove tag ${tag}`}>
            ✕
          </button>
        </span>
      ))}
      {tags.length < MAX_TAGS && (
        <input
          className="tag-input-field"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitDraft}
          placeholder={tags.length === 0 ? "Add tags…" : ""}
        />
      )}
    </div>
  );
}
