import { useApp } from '../../context/AppContext.jsx';
import { filterByMonth } from '../../utils/date.js';
import { TransferRow } from './TransferRow.jsx';

export function TransferList() {
  const { state, openModal } = useApp();
  const { transfers, month } = state;

  const monthTransfers = filterByMonth(transfers, month.year, month.monthIndex).sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : 0
  );

  return (
    <div className="ios-group" id="section-transfers">
      <div className="ios-group__header">
        <span className="ios-group__title">Transfers</span>
      </div>
      <div className="ios-card">
        {monthTransfers.length === 0 ? (
          <div className="ios-row-wrap list-row">
            <span className="list-row__meta">No transfers logged this month yet.</span>
          </div>
        ) : (
          monthTransfers.map((transfer) => <TransferRow key={transfer.id} transfer={transfer} />)
        )}
        <button
          type="button"
          className="ios-row-wrap list-row-plain"
          onClick={() => openModal('transferMoney', { mode: 'add' })}
        >
          + Add Transfer
        </button>
      </div>
    </div>
  );
}
