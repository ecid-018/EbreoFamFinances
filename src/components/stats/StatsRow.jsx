import { useApp } from '../../context/AppContext.jsx';
import { useDerivedFinancials } from '../../hooks/useDerivedFinancials.js';
import { useDayFinancials } from '../../hooks/useDayFinancials.js';
import { formatPHP, formatUSD } from '../../utils/currency.js';

export function StatsRow() {
  const { viewMode } = useApp();
  const { totalIncome, totalSpent, unassigned, monthUsdIncome } = useDerivedFinancials();
  const { dayIncome, daySpent, dayNet, dayUsdIncome } = useDayFinancials();
  const isDayMode = viewMode === 'day';

  const thirdLabel = isDayMode ? 'Net' : 'Unassigned';
  const thirdValue = isDayMode ? dayNet : unassigned;
  const excludedUsdIncome = isDayMode ? dayUsdIncome : monthUsdIncome;

  return (
    <div className="ios-group">
      <div className="ios-card stats-card">
        <div className="stats__col">
          <div className="stats__label">In</div>
          <div className="stats__value">{formatPHP(isDayMode ? dayIncome : totalIncome)}</div>
          {excludedUsdIncome > 0 && (
            <div className="stats__caption">+ {formatUSD(excludedUsdIncome)} not counted</div>
          )}
        </div>
        <div className="stats__col">
          <div className="stats__label">Out</div>
          <div className="stats__value">{formatPHP(isDayMode ? daySpent : totalSpent)}</div>
        </div>
        <div className="stats__col">
          <div className="stats__label">{thirdLabel}</div>
          <div className={`stats__value ${thirdValue < 0 ? 'stats__value--accent' : ''}`.trim()}>
            {formatPHP(thirdValue)}
          </div>
        </div>
      </div>
    </div>
  );
}
