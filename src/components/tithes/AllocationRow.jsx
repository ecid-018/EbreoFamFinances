import { useApp } from '../../context/AppContext.jsx';
import { formatPHP } from '../../utils/currency.js';
import { SwipeToDeleteRow } from '../shared/SwipeToDeleteRow.jsx';

export function AllocationRow({ allocation }) {
  const { dispatch } = useApp();

  return (
    <SwipeToDeleteRow
      className="ios-row-wrap"
      onDelete={() => dispatch({ type: 'tithes/removeAllocation', payload: { id: allocation.id } })}
    >
      <div className="list-row">
        <div className="list-row__main">
          <span className="list-row__title">{allocation.name}</span>
        </div>
        <span className="list-row__value">{formatPHP(allocation.amount)}</span>
      </div>
    </SwipeToDeleteRow>
  );
}
