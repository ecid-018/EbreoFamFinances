import { useDerivedFinancials } from '../../hooks/useDerivedFinancials.js';
import { NeedsCategoryRow } from './NeedsCategoryRow.jsx';

export function NeedsCategoryList() {
  const { uncategorizedTransactions } = useDerivedFinancials();

  if (uncategorizedTransactions.length === 0) return null;

  return (
    <section className="section" id="section-needs-category">
      <div className="section__header">
        <h2 className="section__title">Needs a category</h2>
      </div>
      <div className="needs-category">
        <div className="needs-category-list">
          {uncategorizedTransactions.map((transaction) => (
            <NeedsCategoryRow key={transaction.id} transaction={transaction} />
          ))}
        </div>
      </div>
    </section>
  );
}
