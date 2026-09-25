import { useEffect, useRef, useState } from 'react';

// The charts draw in real pixels rather than scaling a viewBox, so that "2px
// line" and "24px column" mean what they say at every screen size. That needs
// the measured width.
export function useElementWidth(fallback = 320) {
  const ref = useRef(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.round(entry.contentRect.width);
      if (next > 0) setWidth(next);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}
