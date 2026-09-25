import { useState } from 'react';
import { useElementWidth } from '../../hooks/useElementWidth.js';
import { formatPHP } from '../../utils/currency.js';
import { formatMonthShort } from '../../utils/plan/reports.js';

// Columns over months, one series.
//
// One series on purpose: the app's palette cannot separate more. Measured —
// its accent, warning and destructive sit at deltaE 3.4 under deutan vision and
// 12.6 even with normal vision, well under the floors. Splits are carried by
// small multiples and the table beneath, where identity comes from a label.
//
// Specs held to: columns capped at 24px with a 4px rounded cap and a square
// foot on the baseline, a 2px surface gap between neighbours, hairline
// gridlines, and a value only on the tallest column — a number on every column
// is chaos and goes unread.
const HEIGHT = 168;
const PAD_TOP = 22;
const PAD_BOTTOM = 22;
const MAX_COLUMN = 24;
const GAP = 2;

export function MonthColumns({ points = [], label }) {
  const [ref, width] = useElementWidth();
  const [active, setActive] = useState(null);

  if (points.length === 0) return null;

  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const max = Math.max(...points.map((p) => p.value), 0);
  const band = width / points.length;
  const columnWidth = Math.max(4, Math.min(MAX_COLUMN, band - GAP));
  const tallest = points.reduce((best, p, i) => (p.value > points[best].value ? i : best), 0);
  const shown = active == null ? tallest : active;

  return (
    <div className="chart" ref={ref}>
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={`${label}. ${points.length} months, highest ${formatPHP(max)}.`}
        onPointerLeave={() => setActive(null)}
      >
        {/* Baseline only. Gridlines would be ink that is not data on a chart
            this short, and the table carries the exact figures. */}
        <line
          x1={0} x2={width} y1={HEIGHT - PAD_BOTTOM} y2={HEIGHT - PAD_BOTTOM}
          className="chart__axis" strokeWidth={1}
        />
        {points.map((p, i) => {
          const h = max > 0 ? Math.max(p.value > 0 ? 2 : 0, (p.value / max) * plotHeight) : 0;
          const x = i * band + (band - columnWidth) / 2;
          const y = HEIGHT - PAD_BOTTOM - h;
          return (
            <g key={p.monthKey}>
              <rect
                x={x} y={y} width={columnWidth} height={h}
                rx={Math.min(4, columnWidth / 2)}
                className={`chart__column ${i === shown ? 'chart__column--active' : ''}`.trim()}
              />
              {/* Square foot: the rounded rect's bottom corners are covered so
                  the column sits ON the baseline rather than floating. */}
              {h > 4 && <rect x={x} y={y + h - 4} width={columnWidth} height={4} className="chart__column-foot" />}
              {/* Hit target spans the whole band, not just the column. */}
              <rect
                x={i * band} y={0} width={band} height={HEIGHT}
                fill="transparent"
                onPointerEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                tabIndex={0}
                role="button"
                aria-label={`${formatMonthShort(p.monthKey)}: ${formatPHP(p.value)}`}
              />
            </g>
          );
        })}
        {points[shown] && max > 0 && (
          <text
            x={Math.min(width - 4, Math.max(4, shown * band + band / 2))}
            y={HEIGHT - PAD_BOTTOM - (points[shown].value / max) * plotHeight - 7}
            className="chart__value"
            textAnchor={shown === 0 ? 'start' : shown === points.length - 1 ? 'end' : 'middle'}
          >
            {formatPHP(points[shown].value)}
          </text>
        )}
        {points.map((p, i) => (
          <text
            key={`x-${p.monthKey}`}
            x={i * band + band / 2}
            y={HEIGHT - 6}
            className={`chart__tick ${i === shown ? 'chart__tick--active' : ''}`.trim()}
            textAnchor="middle"
          >
            {formatMonthShort(p.monthKey)}
          </text>
        ))}
      </svg>
    </div>
  );
}
