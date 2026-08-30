import { useDerivedFinancials } from '../../hooks/useDerivedFinancials.js';
import { formatPHP } from '../../utils/currency.js';

export function StatsRow() {
  const { totalIncome, totalSpent, unassigned } = useDerivedFinancials();

  return (
    <div className="ios-group">
      <div className="ios-card stats-card">
        <div className="stats__col">
          <div className="stats__label">In</div>
          <div className="stats__value">{formatPHP(totalIncome)}</div>
        </div>
        <div className="stats__col">
          <div className="stats__label">Out</div>
          <div className="stats__value">{formatPHP(totalSpent)}</div>
        </div>
        <div className="stats__col">
          <div className="stats__label">Unassigned</div>
          <div className={`stats__value ${unassigned < 0 ? 'stats__value--accent' : ''}`.trim()}>
            {formatPHP(unassigned)}
          </div>
        </div>
      </div>
    </div>
  );
}
