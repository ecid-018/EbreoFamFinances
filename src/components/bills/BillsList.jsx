import { useApp } from '../../context/AppContext.jsx';
import { formatPHP } from '../../utils/currency.js';
import { splitBills, getFixedCostsPerMonth } from '../../utils/plan/bills.js';
import { BillRow } from './BillRow.jsx';

export function BillsList() {
  const { state, openModal } = useApp();
  const { active, inactive } = splitBills(state.bills);
  const perMonth = getFixedCostsPerMonth(state.bills);

  return (
    <div id="section-bills">
      <div className="ios-group">
        <div className="ios-group__header">
          <span className="ios-group__title">Bills and subscriptions</span>
        </div>
        <div className="ios-card">
          {active.length === 0 ? (
            <div className="ios-row-wrap list-row">
              <span className="list-row__meta">
                No bills yet. Add the ones that come round on their own — premiums, amortizations,
                subscriptions — and they will be reminded about before they fall due.
              </span>
            </div>
          ) : (
            active.map((bill) => <BillRow key={bill.id} bill={bill} />)
          )}
          <button type="button" className="ios-row-wrap list-row-plain" onClick={() => openModal('billForm')}>
            + Add Bill
          </button>
        </div>
      </div>

      {active.length > 0 && (
        <div className="ios-group">
          <div className="ios-card">
            <div className="ios-row-wrap list-row">
              <div className="list-row__main">
                <span className="list-row__title">{formatPHP(perMonth)} a month in fixed costs</span>
                <span className="list-row__meta">
                  Every active bill spread over the months it covers, so a yearly premium counts as a
                  twelfth each month.
                </span>
              </div>
            </div>
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
              <BillRow key={bill.id} bill={bill} showPay={false} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
