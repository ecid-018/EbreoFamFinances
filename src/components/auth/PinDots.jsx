export function PinDots({ length = 6, filled, shake }) {
  return (
    <div className={`pin-dots ${shake ? 'pin-dots--shake' : ''}`.trim()}>
      {Array.from({ length }).map((_, i) => (
        <span key={i} className={`pin-dot ${i < filled ? 'pin-dot--filled' : ''}`.trim()} />
      ))}
    </div>
  );
}
