import { memo } from 'react';
import { formatPHP } from '../../utils/currency.js';

export const EnvelopeSliderRow = memo(function EnvelopeSliderRow({
  envelope,
  value,
  groups,
  onChange,
  onCommit,
  onMove,
  onRemove,
}) {
  const sliderMax = Math.max(20000, Math.ceil((envelope.monthlyBudget * 1.5) / 500) * 500);

  return (
    <div className="slider-row">
      <div className="slider-row__top">
        <span className="slider-row__name">{envelope.name}</span>
        <span className="slider-row__value">{formatPHP(value)}</span>
      </div>
      <input
        type="range"
        className="ios-slider"
        min={0}
        max={sliderMax}
        step={50}
        value={value}
        onChange={(e) => onChange(envelope.id, Number(e.target.value))}
        onMouseUp={() => onCommit(envelope.id)}
        onTouchEnd={() => onCommit(envelope.id)}
        aria-label={`${envelope.name} budget`}
      />
      <div className="slider-row__controls">
        <select
          className="slider-row__move-select"
          value={envelope.group}
          onChange={(e) => onMove(envelope.id, e.target.value)}
        >
          {groups.map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </select>
        <button type="button" className="slider-row__remove" onClick={() => onRemove(envelope.id)}>
          Remove
        </button>
      </div>
    </div>
  );
});
