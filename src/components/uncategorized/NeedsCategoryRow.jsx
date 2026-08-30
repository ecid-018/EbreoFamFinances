import { useApp } from '../../context/AppContext.jsx';
import { formatPHP } from '../../utils/currency.js';

export function NeedsCategoryRow({ transaction }) {
  const { openModal } = useApp();

  return (
    <button
      type="button"
      className="needs-category-row"
      onClick={() => openModal('categoryPicker', { transactionId: transaction.id })}
    >
      <span className="needs-category-row__note">{transaction.note || 'Untitled transaction'}</span>
      <span className="needs-category-row__amount">{formatPHP(transaction.amount)}</span>
    </button>
  );
}
