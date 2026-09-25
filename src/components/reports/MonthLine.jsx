import { useState } from 'react';
import { useElementWidth } from '../../hooks/useElementWidth.js';
import { formatPHP } from '../../utils/currency.js';
import { formatMonthShort } from '../../utils/plan/reports.js';

// A single series over time: 2px line with round joins, a >=8px end marker
// carrying a 2px surface ring so it stays legible where it crosses the line,
// and the area beneath as a ~10% wash rather than a saturated block.
//
// The y-axis starts at the series minimum, not zero, and the caption says so.
// Net worth that moves 2% on a ₱1.3M base is a flat line from zero, and a flat
// line is not what happened.
const HEIGHT = 180;
const PAD_TOP = 24;
const PAD_BOTTOM = 22;
const PAD_X = 10;

export function MonthLine({ points = [], label, compact = false }) {
  const [ref, width] = useElementWidth();
  const [active, setActive] = useState(null);

  if (points.length === 0) return null;

  const height = compact ? 72 : HEIGHT;
  const padTop = compact ? 8 : PAD_TOP;
  const padBottom = compact ? 8 : PAD_BOTTOM;
  const plotHeight = height - padTop - padBottom;
  const values = points.map((p) => p.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  // A series that never changes has no span to scale against. Drawn the
  // ordinary way it pins to the baseline, which reads as "nearly zero" when
  // what actually happened is "steady" — so it sits mid-height instead.
  const flat = max === min;
  const span = max - min;

  const x = (i) => (points.length === 1 ? width / 2 : PAD_X + (i * (width - PAD_X * 2)) / (points.length - 1));
  const y = (v) => (flat ? padTop + plotHeight / 2 : padTop + plotHeight - ((v - min) / span) * plotHeight);

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)},${height - padBottom} L${x(0).toFixed(1)},${height - padBottom} Z`;
  const last = points.length - 1;
  const shown = active == null ? last : active;

  return (
    <div className="chart" ref={ref}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`${label}. ${points.length} months, from ${formatPHP(points[0].value)} to ${formatPHP(points[last].value)}.`}
        onPointerLeave={() => setActive(null)}
      >
        <path d={area} className="chart__area" />
        <path d={line} className="chart__line" fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {!compact && active != null && (
          <line x1={x(active)} x2={x(active)} y1={padTop} y2={height - padBottom} className="chart__crosshair" strokeWidth={1} />
        )}

        <circle cx={x(shown)} cy={y(points[shown].value)} r={5} className="chart__marker" strokeWidth={2} />

        {!compact && (
          <text
            x={Math.min(width - 4, Math.max(4, x(shown)))}
            y={Math.max(12, y(points[shown].value) - 10)}
            className="chart__value"
            textAnchor={shown === 0 ? 'start' : shown === last ? 'end' : 'middle'}
          >
            {formatPHP(points[shown].value)}
          </text>
        )}

        {!compact &&
          points.map((p, i) => (
            <g key={p.monthKey}>
              <text
                x={x(i)} y={height - 6}
                className={`chart__tick ${i === shown ? 'chart__tick--active' : ''}`.trim()}
                textAnchor="middle"
              >
                {formatMonthShort(p.monthKey)}
              </text>
              <rect
                x={x(i) - (width / points.length) / 2} y={0}
                width={width / points.length} height={height}
                fill="transparent"
                onPointerEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                tabIndex={0}
                role="button"
                aria-label={`${formatMonthShort(p.monthKey)}: ${formatPHP(p.value)}`}
              />
            </g>
          ))}
      </svg>
    </div>
  );
}
