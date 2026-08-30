import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { useDerivedFinancials } from '../../hooks/useDerivedFinancials.js';
import { useScrollCollapse } from '../../hooks/useScrollCollapse.js';
import { getMonthName } from '../../utils/date.js';
import { SegmentedControl } from '../shared/SegmentedControl.jsx';
import { ChevronLeftIcon, ChevronRightIcon } from '../shared/Icon.jsx';

export function NavBar() {
  const { state, dispatch } = useApp();
  const { daysLeft, isPastMonth } = useDerivedFinancials();
  const collapsed = useScrollCollapse();
  const [period, setPeriod] = useState('month');

  const monthName = getMonthName(state.month.year, state.month.monthIndex);
  const subtitle = isPastMonth ? 'Month closed' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;

  return (
    <header className={`navbar ${collapsed ? 'navbar--collapsed' : ''}`.trim()}>
      <div className="navbar__bar">
        <button
          type="button"
          className="navbar__icon-btn"
          aria-label="Previous month"
          onClick={() => dispatch({ type: 'month/prev' })}
        >
          <ChevronLeftIcon size={22} />
        </button>
        <span className="navbar__small-title">{monthName}</span>
        <button
          type="button"
          className="navbar__icon-btn"
          aria-label="Next month"
          onClick={() => dispatch({ type: 'month/next' })}
        >
          <ChevronRightIcon size={22} />
        </button>
      </div>
      <div className="navbar__large-wrap">
        <h1 className="navbar__large-title">{monthName}</h1>
        <SegmentedControl
          value={period}
          onChange={setPeriod}
          options={[
            { value: 'month', label: 'Month' },
            { value: 'day', label: 'Day' },
          ]}
        />
        <p className="navbar__subtitle">{subtitle}</p>
      </div>
    </header>
  );
}
