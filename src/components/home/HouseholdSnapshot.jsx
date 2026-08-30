import { useDerivedFinancials } from '../../hooks/useDerivedFinancials.js';
import { formatPHP } from '../../utils/currency.js';

export function HouseholdSnapshot() {
  const { totalAccountBalance, goalsProgressPct, savingsFundedThisMonth } = useDerivedFinancials();

  return (
    <div className="ios-group">
      <div className="ios-group__header">
        <span className="ios-group__title">Household Snapshot</span>
      </div>
      <div className="ios-card stats-card">
        <div className="stats__col">
          <div className="stats__label">Total Balance</div>
          <div className="stats__value">{formatPHP(totalAccountBalance)}</div>
        </div>
        <div className="stats__col">
          <div className="stats__label">Goals Progress</div>
          <div className="stats__value">{Math.round(goalsProgressPct)}%</div>
        </div>
        <div className="stats__col">
          <div className="stats__label">Funded to Savings</div>
          <div className="stats__value">{formatPHP(savingsFundedThisMonth)}</div>
        </div>
      </div>
    </div>
  );
}
