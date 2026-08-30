import { useDerivedFinancials } from '../../hooks/useDerivedFinancials.js';
import { formatPHP } from '../../utils/currency.js';
import { Eyebrow } from '../shared/Eyebrow.jsx';

export function StatsRow() {
  const { totalIncome, totalSpent, unassigned } = useDerivedFinancials();

  return (
    <section className="stats">
      <div className="stats__col">
        <Eyebrow>In</Eyebrow>
        <div className="stats__value">{formatPHP(totalIncome)}</div>
      </div>
      <div className="stats__col">
        <Eyebrow>Out</Eyebrow>
        <div className="stats__value">{formatPHP(totalSpent)}</div>
      </div>
      <div className="stats__col">
        <Eyebrow>Unassigned</Eyebrow>
        <div className={`stats__value ${unassigned < 0 ? 'stats__value--accent' : ''}`.trim()}>
          {formatPHP(unassigned)}
        </div>
      </div>
    </section>
  );
}
