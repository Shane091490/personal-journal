export default function Modal({ title, children, onClose, wide }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-panel${wide ? " modal-panel--wide" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        {title && <h3>{title}</h3>}
        {children}
      </div>
    </div>
  );
}
