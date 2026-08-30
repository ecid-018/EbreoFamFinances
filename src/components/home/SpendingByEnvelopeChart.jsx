import { useDerivedFinancials } from '../../hooks/useDerivedFinancials.js';
import { formatPHP } from '../../utils/currency.js';

export function SpendingByEnvelopeChart() {
  const { envelopeStatsByHighestSpend } = useDerivedFinancials();
  const maxSpent = Math.max(0, ...envelopeStatsByHighestSpend.map((env) => env.spent));

  return (
    <div className="ios-group">
      <div className="ios-group__header">
        <span className="ios-group__title">Spending by Envelope</span>
      </div>
      <div className="ios-card">
        {envelopeStatsByHighestSpend.map((env) => {
          const widthPct = maxSpent > 0 ? Math.max(3, (env.spent / maxSpent) * 100) : 3;
          return (
            <div key={env.id} className="ios-row-wrap chart-row">
              <div className="chart-row__top">
                <span className="chart-row__name">{env.name}</span>
                <span className={`chart-row__amount ${env.isOver ? 'chart-row__amount--over' : ''}`.trim()}>
                  {formatPHP(env.spent)}
                </span>
              </div>
              <div className="chart-row__track">
                <div
                  className={`chart-row__fill ${env.isOver ? 'chart-row__fill--over' : ''}`.trim()}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
