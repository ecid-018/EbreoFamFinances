import { useApp } from '../../context/AppContext.jsx';
import { filterByMonth } from '../../utils/date.js';
import { TransactionRow } from './TransactionRow.jsx';

export function TransactionList() {
  const { state, openModal } = useApp();
  const { transactions, month } = state;

  const monthTransactions = filterByMonth(transactions, month.year, month.monthIndex)
    .filter((t) => t.categoryId != null)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  return (
    <div className="ios-group" id="section-transactions">
      <div className="ios-group__header">
        <span className="ios-group__title">All Expenses</span>
      </div>
      <div className="ios-card">
        {monthTransactions.length === 0 ? (
          <div className="ios-row-wrap list-row">
            <span className="list-row__meta">No expenses logged this month yet.</span>
          </div>
        ) : (
          monthTransactions.map((transaction) => (
            <TransactionRow key={transaction.id} transaction={transaction} />
          ))
        )}
        <button
          type="button"
          className="ios-row-wrap list-row-plain"
          onClick={() => openModal('addExpense', { mode: 'add' })}
        >
          + Add Expense
        </button>
      </div>
    </div>
  );
}
