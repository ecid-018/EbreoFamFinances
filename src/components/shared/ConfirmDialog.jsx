export function ConfirmDialog({ title, message, confirmLabel = 'Delete', cancelLabel = 'Cancel', onConfirm, onCancel }) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-card" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true">
        <div className="confirm-body">
          <div className="confirm-title">{title}</div>
          {message && <p className="confirm-message">{message}</p>}
        </div>
        <div className="confirm-actions">
          <button type="button" className="confirm-btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="confirm-btn confirm-btn--destructive" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
