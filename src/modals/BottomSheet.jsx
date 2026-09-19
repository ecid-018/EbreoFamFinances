import { useEffect, useRef, useState } from 'react';

const DISMISS_THRESHOLD = 90;
// From this width up the sheet renders as a centred dialog (layout.css), and
// a dialog you can drag off the bottom of the screen makes no sense — so the
// drag gesture is disabled rather than just visually hidden.
const DIALOG_MIN_WIDTH = 768;

export function BottomSheet({ title, onClose, children }) {
  const [open, setOpen] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragging = useRef(false);
  const startY = useRef(0);
  const isDialog = () =>
    typeof window !== 'undefined' && window.matchMedia(`(min-width: ${DIALOG_MIN_WIDTH}px)`).matches;

  useEffect(() => {
    const raf = requestAnimationFrame(() => setOpen(true));
    function handleKeyDown(e) {
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
    <div className="sheet-overlay" onClick={requestClose}>
      <div
        className={`sheet-panel ${open ? 'sheet-panel--open' : ''}`.trim()}
        style={dragY > 0 ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="sheet-drag-affordance"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className="sheet-handle" />
        </div>
        <div className="sheet-header">
          <h2 className="sheet-title">{title}</h2>
          <button type="button" className="sheet-close" aria-label="Close" onClick={requestClose}>
            ×
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
