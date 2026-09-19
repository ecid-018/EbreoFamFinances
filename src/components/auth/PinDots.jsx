// `length` is how many dots to draw when nothing is typed yet. Variable-length
// PINs (8-12) have no fixed expectation, so the row grows to match whatever
// has been entered rather than capping at the minimum.
export function PinDots({ length = 6, filled, shake }) {
  const count = Math.max(length, filled);
  return (
    <div className={`pin-dots ${shake ? 'pin-dots--shake' : ''}`.trim()}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className={`pin-dot ${i < filled ? 'pin-dot--filled' : ''}`.trim()} />
      ))}
    </div>
  );
}
