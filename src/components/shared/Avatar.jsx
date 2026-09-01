export function Avatar({ profile, size = 24, className }) {
  const style = { width: size, height: size, fontSize: size * 0.4 };

  if (profile?.avatarUrl) {
    return (
      <img
        src={profile.avatarUrl}
        alt={profile.displayName ?? ''}
        className={`avatar avatar--photo ${className ?? ''}`.trim()}
        style={style}
      />
    );
  }

  return (
    <span className={`avatar avatar--initial ${className ?? ''}`.trim()} style={style}>
      {profile?.displayName?.charAt(0) ?? '?'}
    </span>
  );
}
