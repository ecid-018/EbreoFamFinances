import { useRef, useState } from 'react';

const REVEAL_WIDTH = 84;
const DRAG_THRESHOLD = 6;

export function SwipeToDeleteRow({ onDelete, onTap, deleteLabel = 'Delete', children, className = '' }) {
  const [translateX, setTranslateX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startTranslate = useRef(0);
  const movedFar = useRef(false);

  function handlePointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    startX.current = e.clientX;
    startTranslate.current = translateX;
    movedFar.current = false;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e) {
    if (!dragging) return;
    const delta = e.clientX - startX.current;
    if (Math.abs(delta) > DRAG_THRESHOLD) movedFar.current = true;
    const next = Math.min(0, Math.max(-REVEAL_WIDTH, startTranslate.current + delta));
    setTranslateX(next);
  }

  function handlePointerUp() {
    if (!dragging) return;
    setDragging(false);
    setTranslateX(translateX < -REVEAL_WIDTH / 2 ? -REVEAL_WIDTH : 0);
  }

  function handleContentClick() {
    if (movedFar.current) return;
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
