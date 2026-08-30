import { useApp } from '../../context/AppContext.jsx';
import { useDerivedFinancials } from '../../hooks/useDerivedFinancials.js';
import { formatPHP } from '../../utils/currency.js';
import { IncomeRow } from './IncomeRow.jsx';

export function IncomeList() {
  const { openModal } = useApp();
  const { monthIncomeEntries, totalIncome } = useDerivedFinancials();

  return (
    <section className="section" id="section-income">
      <div className="section__header">
        <h2 className="section__title">Income</h2>
      </div>
      <div className="list">
        {monthIncomeEntries.map((entry) => (
          <IncomeRow key={entry.id} entry={entry} />
        ))}
      </div>
      {monthIncomeEntries.length > 0 && (
        <div className="list__total">
          <span>Total</span>
          <span>{formatPHP(totalIncome)}</span>
        </div>
      )}
      <button
        type="button"
        className="btn btn-secondary section__add"
        onClick={() => openModal('addIncome')}
      >
        + Add income
      </button>
    </section>
  );
}
