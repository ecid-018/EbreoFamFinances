import { useDerivedFinancials } from '../../hooks/useDerivedFinancials.js';
import { NeedsCategoryRow } from './NeedsCategoryRow.jsx';

export function NeedsCategoryList() {
  const { uncategorizedTransactions } = useDerivedFinancials();

  if (uncategorizedTransactions.length === 0) return null;

  return (
    <div className="ios-group" id="section-needs-category">
      <div className="ios-group__header">
        <span className="ios-group__title">Needs a Category</span>
      </div>
      <div className="ios-card">
        {uncategorizedTransactions.map((transaction) => (
          <NeedsCategoryRow key={transaction.id} transaction={transaction} />
        ))}
      </div>
    </div>
  );
}
