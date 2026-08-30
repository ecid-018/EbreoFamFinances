import { useApp } from '../../context/AppContext.jsx';
import { useDerivedFinancials } from '../../hooks/useDerivedFinancials.js';
import { formatPHP } from '../../utils/currency.js';
import { IncomeRow } from './IncomeRow.jsx';

export function IncomeList() {
  const { openModal } = useApp();
  const { monthIncomeEntries, totalIncome } = useDerivedFinancials();

  return (
    <div className="ios-group" id="section-income">
      <div className="ios-group__header">
        <span className="ios-group__title">Income</span>
        <span className="ios-group__title">{formatPHP(totalIncome)}</span>
      </div>
      <div className="ios-card">
        {monthIncomeEntries.map((entry) => (
          <IncomeRow key={entry.id} entry={entry} />
        ))}
        <button
          type="button"
          className="ios-row-wrap list-row-plain"
          onClick={() => openModal('incomeForm', { mode: 'add' })}
        >
          + Add Income
        </button>
      </div>
    </div>
  );
}
