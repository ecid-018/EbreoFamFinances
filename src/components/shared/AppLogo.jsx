export function AppLogo({ size = 32, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      className={className}
      style={{ borderRadius: size * 0.22, display: 'block' }}
      aria-hidden="true"
    >
      <rect x="0" y="0" width="1024" height="1024" fill="#0A0A0A" />
      <rect x="192" y="312" width="640" height="448" rx="40" fill="#F2701E" />
      <path d="M192 312 L832 312 L512 568 Z" fill="#0A0A0A" />
      <rect x="452" y="642" width="120" height="22" rx="11" fill="#0A0A0A" />
    </svg>
  );
}
