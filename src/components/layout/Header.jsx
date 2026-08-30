import { useApp } from '../../context/AppContext.jsx';
import { useDerivedFinancials } from '../../hooks/useDerivedFinancials.js';
import { getMonthName } from '../../utils/date.js';
import { Eyebrow } from '../shared/Eyebrow.jsx';

export function Header() {
  const { state, dispatch } = useApp();
  const { daysLeft, isPastMonth } = useDerivedFinancials();
  const monthName = getMonthName(state.month.year, state.month.monthIndex);

  const eyebrowText = isPastMonth
    ? 'HOUSEHOLD · MONTH CLOSED'
    : `HOUSEHOLD · ${daysLeft} DAY${daysLeft === 1 ? '' : 'S'} LEFT`;

  return (
    <header className="header">
      <Eyebrow>{eyebrowText}</Eyebrow>
      <div className="header__row">
        <button
          type="button"
          className="header__nav-btn"
          aria-label="Previous month"
          onClick={() => dispatch({ type: 'month/prev' })}
        >
          ‹
        </button>
        <h1 className="header__month">{monthName}</h1>
        <button
          type="button"
          className="header__nav-btn"
          aria-label="Next month"
          onClick={() => dispatch({ type: 'month/next' })}
        >
          ›
        </button>
      </div>
    </header>
  );
}
