function formatTimestamp(iso, showYear) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(showYear ? { year: "numeric" } : {}),
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function JournalEntryCard({ entry, onEdit, onDelete, onTogglePin, onTagClick, showYear }) {
  return (
    <div className={`entry-card${entry.pinned ? " pinned" : ""}`}>
      <div className="entry-card-top">
        <span className="entry-timestamp tnum">
          {entry.mood && <span className="entry-mood">{entry.mood}</span>}
          {formatTimestamp(entry.created_at, showYear)}
        </span>
        <div className="entry-menu">
          <button
            className={`icon-btn pin-btn${entry.pinned ? " icon-btn-active" : ""}`}
            title={entry.pinned ? "Unpin" : "Pin"}
            onClick={() => onTogglePin(entry)}
          >
            📌
          </button>
          <button className="icon-btn" title="Edit" onClick={() => onEdit(entry)}>
            ✎
          </button>
          <button className="icon-btn" title="Delete" onClick={() => onDelete(entry)}>
            ✕
          </button>
        </div>
      </div>
      <div className="entry-body" dangerouslySetInnerHTML={{ __html: entry.body }} />
      {entry.tags && entry.tags.length > 0 && (
        <div className="entry-tags">
          {entry.tags.map((tag) => (
            <button key={tag} type="button" className="tag-pill" onClick={() => onTagClick(tag)}>
              #{tag}
            </button>
          ))}
        </div>
      )}
      {entry.photos && entry.photos.length > 0 && (
        <div className="entry-photos">
          {entry.photos.map((photo) => (
            <a key={photo.id} className="entry-photo" href={photo.url} target="_blank" rel="noreferrer">
              <img src={photo.url} alt="" loading="lazy" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
