function formatTimestamp(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function JournalEntryCard({ entry, onEdit, onDelete }) {
  return (
    <div className="entry-card">
      <div className="entry-card-top">
        <span className="entry-timestamp tnum">{formatTimestamp(entry.created_at)}</span>
        <div className="entry-menu">
          <button className="icon-btn" title="Edit" onClick={() => onEdit(entry)}>
            ✎
          </button>
          <button className="icon-btn" title="Delete" onClick={() => onDelete(entry)}>
            ✕
          </button>
        </div>
      </div>
      <div className="entry-body" dangerouslySetInnerHTML={{ __html: entry.body }} />
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
