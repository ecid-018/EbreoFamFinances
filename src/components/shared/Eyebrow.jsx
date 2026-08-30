export function Eyebrow({ children, as: Tag = 'div', className = '' }) {
  return <Tag className={`eyebrow ${className}`.trim()}>{children}</Tag>;
}
