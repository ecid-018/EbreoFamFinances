import { useDerivedFinancials } from '../../hooks/useDerivedFinancials.js';
import { useUsdToPhpRate } from '../../hooks/useUsdToPhpRate.js';
import { formatPHP, formatUSD } from '../../utils/currency.js';

export function HouseholdSnapshot() {
  const { totalPhpAccountBalance, totalUsdAccountBalance, goalsProgressPct, savingsFundedThisMonth } =
    useDerivedFinancials();
  const { rate } = useUsdToPhpRate(totalUsdAccountBalance > 0);

  const hasUsd = totalUsdAccountBalance > 0;
  const totalBalance = hasUsd && rate ? totalPhpAccountBalance + totalUsdAccountBalance * rate : totalPhpAccountBalance;

  return (
    <div className="ios-group">
      <div className="ios-group__header">
        <span className="ios-group__title">Household Snapshot</span>
      </div>
      <div className="ios-card stats-card">
        <div className="stats__col">
          <div className="stats__label">Total Balance</div>
          <div className="stats__value">{formatPHP(totalBalance)}</div>
          {hasUsd && (
            <div className="stats__caption">
              {rate
                ? `incl. ${formatUSD(totalUsdAccountBalance)} @ ₱${rate.toFixed(2)}`
                : `${formatUSD(totalUsdAccountBalance)} not included — rate unavailable`}
            </div>
          )}
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
