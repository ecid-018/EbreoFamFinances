import { useRef, useState } from 'react';

const REVEAL_WIDTH = 84;
const SWIPE_THRESHOLD = 6;

export function SwipeToDeleteRow({ onDelete, onTap, deleteLabel = 'Delete', children, className = '' }) {
  const [translateX, setTranslateX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const startTranslate = useRef(0);
  const activePointerId = useRef(null);
  const committed = useRef(false);

  function handlePointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    startTranslate.current = translateX;
    activePointerId.current = e.pointerId;
    committed.current = false;
    // Deliberately no setPointerCapture and no dragging state here — a plain
    // tap must pass through untouched until real horizontal movement proves
    // this is a swipe, not a press on the row's own content.
  }

  function handlePointerMove(e) {
    if (activePointerId.current !== e.pointerId) return;
    const deltaX = e.clientX - startX.current;
    const deltaY = e.clientY - startY.current;

    if (!committed.current) {
      if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        // Vertical intent (page scroll) — bail out, never claim the gesture.
        activePointerId.current = null;
        return;
      }
      committed.current = true;
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }

    const next = Math.min(0, Math.max(-REVEAL_WIDTH, startTranslate.current + deltaX));
    setTranslateX(next);
  }

  function handlePointerUp(e) {
    if (activePointerId.current !== e.pointerId) return;
    activePointerId.current = null;
    if (!committed.current) {
      // Never crossed the swipe threshold — this was a tap. Do nothing here;
      // the row's own onClick fires natively since we never captured the pointer.
      return;
    }
    setDragging(false);
    setTranslateX(translateX < -REVEAL_WIDTH / 2 ? -REVEAL_WIDTH : 0);
  }

  function handleContentClick() {
    if (committed.current) {
      // This click is the synthetic tail end of a real swipe (fires after
      // pointerup) — swallow it entirely. pointerup already set the correct
      // open/closed state; touching translateX here would undo it.
      return;
    }
    if (translateX !== 0) {
      setTranslateX(0);
      return;
    }
    onTap?.();
  }

  return (
    <div className={`swipe-row ${className}`.trim()}>
      <div className="swipe-row__actions" style={{ width: REVEAL_WIDTH }}>
        <button
          type="button"
          className="swipe-row__delete"
          onClick={() => {
            setTranslateX(0);
            onDelete();
          }}
        >
          {deleteLabel}
        </button>
      </div>
      <div
        className="swipe-row__content"
        style={{
          transform: `translateX(${translateX}px)`,
          transition: dragging ? 'none' : 'transform 0.22s cubic-bezier(0.2, 0, 0.2, 1)',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleContentClick}
      >
        {children}
      </div>
    </div>
  );
}
