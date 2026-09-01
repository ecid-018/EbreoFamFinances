import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { formatByCurrency } from '../../utils/currency.js';
import { getMonthKeyFromDateStr, getMonthName, parseMonthKey } from '../../utils/date.js';
import { SwipeToDeleteRow } from '../shared/SwipeToDeleteRow.jsx';
import { ConfirmDialog } from '../shared/ConfirmDialog.jsx';
import { Avatar } from '../shared/Avatar.jsx';
import { ChevronRightIcon } from '../shared/Icon.jsx';

export function IncomeRow({ entry }) {
  const { state, dispatch, openModal } = useApp();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const date = new Date(`${entry.date}T00:00:00`).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
  });
  const account = state.accounts.find((a) => a.id === entry.accountId);
  const loggedBy = state.profiles.find((p) => p.id === entry.createdBy);
  const receivedMonthKey = getMonthKeyFromDateStr(entry.date);
  const countsElsewhere = entry.budgetMonthKey !== receivedMonthKey;

  const metaParts = [date];
  if (account) metaParts.push(account.name);
  if (countsElsewhere) {
    const { year, monthIndex } = parseMonthKey(entry.budgetMonthKey);
    metaParts.push(`counted toward ${getMonthName(year, monthIndex)}`);
  }

  return (
    <>
      <SwipeToDeleteRow
        className="ios-row-wrap"
        onDelete={() => setConfirmOpen(true)}
        onTap={() => openModal('incomeForm', { mode: 'edit', entry })}
      >
        <div className="list-row">
          <Avatar profile={loggedBy} size={28} />
          <div className="list-row__main">
            <span className="list-row__title">{entry.source}</span>
            <span className="list-row__meta">{metaParts.join(' · ')}</span>
          </div>
          <span className="list-row__value">{formatByCurrency(entry.amount, account?.currency)}</span>
          <ChevronRightIcon size={16} className="list-row__chevron" />
        </div>
      </SwipeToDeleteRow>
      {confirmOpen && (
        <ConfirmDialog
          title={`Delete "${entry.source}"?`}
          message={
            account ? `${formatByCurrency(entry.amount, account.currency)} will be reversed from ${account.name}.` : undefined
          }
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false);
            dispatch({ type: 'income/remove', payload: { id: entry.id } });
          }}
        />
      )}
    </>
  );
}
