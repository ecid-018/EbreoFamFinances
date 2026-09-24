import { useApp } from '../../context/AppContext.jsx';
import { formatPHP } from '../../utils/currency.js';
import { groupByKind, getFixedCostsPerMonth, splitBills } from '../../utils/plan/bills.js';
import { BillRow } from './BillRow.jsx';

export function BillsList() {
  const { state, openModal } = useApp();
  const groups = groupByKind(state.bills);
  const { inactive } = splitBills(state.bills);
  const perMonth = getFixedCostsPerMonth(state.bills);

  return (
    <div id="section-bills">
      {groups.length === 0 ? (
        <div className="ios-group">
          <div className="ios-group__header">
            <span className="ios-group__title">Schedule</span>
          </div>
          <div className="ios-card">
            <div className="ios-row-wrap list-row">
              <span className="list-row__meta">
                Nothing scheduled yet. Add what comes round on its own — bills to pay, money you
                expect, jobs with a date — and it will be flagged before it falls due.
              </span>
            </div>
            <button type="button" className="ios-row-wrap list-row-plain" onClick={() => openModal('billForm')}>
              + Add to schedule
            </button>
          </div>
        </div>
      ) : (
        groups.map((group) => (
          <div className="ios-group" key={group.value}>
            <div className="ios-group__header">
              <span className="ios-group__title">{group.hint}</span>
            </div>
            <div className="ios-card">
              {group.items.map((bill) => (
                <BillRow key={bill.id} bill={bill} />
              ))}
            </div>
          </div>
        ))
      )}

      {groups.length > 0 && (
        <div className="ios-group">
          <div className="ios-card">
            <button type="button" className="ios-row-wrap list-row-plain" onClick={() => openModal('billForm')}>
              + Add to schedule
            </button>
            {perMonth > 0 && (
              <div className="ios-row-wrap list-row">
                <div className="list-row__main">
                  <span className="list-row__title">{formatPHP(perMonth)} a month in fixed costs</span>
                  <span className="list-row__meta">
                    Bills only, each spread over the months it covers — money you expect and jobs to
                    do are not outgoings.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {inactive.length > 0 && (
        <div className="ios-group">
          <div className="ios-group__header">
            <span className="ios-group__title">Ended</span>
          </div>
          <div className="ios-card">
            {inactive.map((bill) => (
              <BillRow key={bill.id} bill={bill} showAction={false} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
