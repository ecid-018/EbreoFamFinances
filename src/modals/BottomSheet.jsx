import { useEffect, useRef, useState } from 'react';

const DISMISS_THRESHOLD = 90;
// From this width up the sheet renders as a centred dialog (layout.css), and
// a dialog you can drag off the bottom of the screen makes no sense — so the
// drag gesture is disabled rather than just visually hidden.
const DIALOG_MIN_WIDTH = 768;

// `fullScreen` is for data entry — add expense, income, transfer, payday and
// the forms. Those fill the screen, cannot be dismissed by tapping outside or
// by dragging, and close only through Cancel or Escape. Losing a half-typed
// expense to a stray tap on the backdrop is the single most annoying thing a
// budgeting app can do, and it was happening.
export function BottomSheet({ title, onClose, children, fullScreen = false }) {
  const [open, setOpen] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragging = useRef(false);
  const startY = useRef(0);
  const isDialog = () =>
    typeof window !== 'undefined' && window.matchMedia(`(min-width: ${DIALOG_MIN_WIDTH}px)`).matches;

  useEffect(() => {
    const raf = requestAnimationFrame(() => setOpen(true));
    function handleKeyDown(e) {
      // Escape still closes a full-screen form: it is deliberate in a way that
      // tapping the edge of the screen is not.
      if (e.key === 'Escape') requestClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function requestClose() {
    setOpen(false);
    setTimeout(onClose, 220);
  }

  function handlePointerDown(e) {
    if (isDialog()) return;
    dragging.current = true;
    startY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e) {
    if (!dragging.current) return;
    const delta = Math.max(0, e.clientY - startY.current);
    setDragY(delta);
  }

  function handlePointerUp() {
    if (!dragging.current) return;
    dragging.current = false;
    if (dragY > DISMISS_THRESHOLD) {
      requestClose();
    } else {
      setDragY(0);
    }
  }

  return (
    <div
      className={`sheet-overlay${fullScreen ? ' sheet-overlay--full' : ''}`}
      onClick={fullScreen ? undefined : requestClose}
    >
      <div
        className={`sheet-panel ${open ? 'sheet-panel--open' : ''}${fullScreen ? ' sheet-panel--full' : ''}`.trim()}
        style={dragY > 0 ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {!fullScreen && (
          <div
            className="sheet-drag-affordance"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <div className="sheet-handle" />
          </div>
        )}
        <div className="sheet-header">
          <h2 className="sheet-title">{title}</h2>
          <button
            type="button"
            className={fullScreen ? 'sheet-cancel' : 'sheet-close'}
            aria-label={fullScreen ? 'Cancel' : 'Close'}
            onClick={requestClose}
          >
            {fullScreen ? 'Cancel' : '×'}
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
