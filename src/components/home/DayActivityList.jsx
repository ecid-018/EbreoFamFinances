import { useDayFinancials } from '../../hooks/useDayFinancials.js';
import { formatByCurrency } from '../../utils/currency.js';

export function DayActivityList() {
  const { activity } = useDayFinancials();

  return (
    <div className="ios-group">
      <div className="ios-group__header">
        <span className="ios-group__title">Today's Activity</span>
      </div>
      <div className="ios-card">
        {activity.length === 0 ? (
          <div className="ios-row-wrap list-row">
            <span className="list-row__meta">Nothing logged for this day yet.</span>
          </div>
        ) : (
          activity.map((entry) => {
            const metaParts = [entry.kind === 'expense' ? entry.envelope?.name : null, entry.account?.name].filter(
              Boolean
            );
            return (
              <div key={`${entry.kind}-${entry.id}`} className="ios-row-wrap list-row">
                <div className="list-row__main">
                  <span className="list-row__title">{entry.note || (entry.kind === 'income' ? 'Income' : 'Expense')}</span>
                  {metaParts.length > 0 && <span className="list-row__meta">{metaParts.join(' · ')}</span>}
                </div>
                <span
                  className={`list-row__value ${entry.kind === 'income' ? 'list-row__value--accent' : ''}`.trim()}
                >
                  {entry.kind === 'income' ? '+' : '−'}
                  {formatByCurrency(entry.amount, entry.account?.currency)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
