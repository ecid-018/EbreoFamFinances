import { formatByCurrency, formatPHP } from '../../utils/currency.js';
import { WarningIcon } from '../shared/Icon.jsx';

export function PlanAccountsSection({ roles, reconciliation }) {
  if (roles.length === 0 && reconciliation.length === 0) return null;

  return (
    <>
      {roles.length > 0 && (
        <div className="ios-group">
          <div className="ios-group__header">
            <span className="ios-group__title">Which account is which</span>
          </div>
          <div className="ios-card">
            {roles.map(({ account, roleLabel }) => (
              <div className="ios-row-wrap list-row" key={account.id}>
                <div className="list-row__main">
                  <span className="list-row__title">{roleLabel}</span>
                  <span className="list-row__meta">{account.name}</span>
                </div>
                <span className="list-row__value">{formatByCurrency(account.balance, account.currency)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {reconciliation.length > 0 && (
        <div className="ios-group">
          <div className="ios-group__header">
            <span className="ios-group__title">Goals vs balances</span>
          </div>
          <div className="ios-card">
            {reconciliation.map((row) => (
              <div className="ios-row-wrap alert-row" key={row.account.id}>
                {row.isShort && <WarningIcon size={20} className="alert-row__icon" />}
                <div className="list-row__main">
                  <span className="list-row__title">{row.account.name}</span>
                  <span className="list-row__meta">
                    {row.isShort
                      ? `Goals claim ${formatPHP(-row.gap)} more than this account holds`
                      : `${formatPHP(row.gap)} here is not claimed by any goal`}
                  </span>
                </div>
              </div>
            ))}
            {/* A gap is nearly always a real-world mismatch — money moved and
                the goal was not updated, or the other way round. Saying so
                beats silently "correcting" one number to match the other. */}
            <div className="ios-row-wrap list-row">
              <span className="list-row__meta">
                What goals say they hold and what the accounts hold are recorded separately, so these
                are for a human to reconcile.
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
