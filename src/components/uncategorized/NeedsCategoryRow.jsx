import { useApp } from '../../context/AppContext.jsx';
import { formatPHP } from '../../utils/currency.js';
import { SwipeToDeleteRow } from '../shared/SwipeToDeleteRow.jsx';
import { ChevronRightIcon } from '../shared/Icon.jsx';

export function NeedsCategoryRow({ transaction }) {
  const { dispatch, openModal } = useApp();

  return (
    <SwipeToDeleteRow
      className="ios-row-wrap"
      onDelete={() => dispatch({ type: 'transaction/remove', payload: { id: transaction.id } })}
      onTap={() => openModal('categoryPicker', { transactionId: transaction.id })}
    >
      <div className="list-row">
        <span className="status-dot" />
        <div className="list-row__main">
          <span className="list-row__title">{transaction.note || 'Untitled transaction'}</span>
        </div>
        <span className="list-row__value">{formatPHP(transaction.amount)}</span>
        <ChevronRightIcon size={16} className="list-row__chevron" />
      </div>
    </SwipeToDeleteRow>
  );
}
