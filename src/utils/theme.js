const THEME_COLOR_LIGHT = '#f2f2f7';
const THEME_COLOR_DARK = '#000000';

export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light' || theme === 'dark') {
    root.dataset.theme = theme;
  } else {
    delete root.dataset.theme;
  }
  updateThemeColorMeta();
}

export function updateThemeColorMeta() {
  const root = document.documentElement;
  const explicit = root.dataset.theme;
  const systemPrefersDark =
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = explicit === 'dark' || (!explicit && systemPrefersDark);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', isDark ? THEME_COLOR_DARK : THEME_COLOR_LIGHT);
}
