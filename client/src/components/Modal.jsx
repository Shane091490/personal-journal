export default function Modal({ title, children, wide }) {
  return (
    <div className="modal-overlay">
      <div className={`modal-panel${wide ? " modal-panel--wide" : ""}`}>
        <div className="sheet-grip" />
        {title && <h3>{title}</h3>}
        {children}
      </div>
    </div>
  );
}
