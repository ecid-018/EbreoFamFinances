import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { useChecklists } from '../../hooks/useChecklists.js';
import { formatPHP } from '../../utils/currency.js';
import { generateId } from '../../utils/id.js';
import {
  INCOME_KIND_META,
  buildChecklist,
  getIncomeKindMeta,
  isChecklistFinished,
} from '../../utils/plan/checklist.js';

// What the plan says to do with money that has arrived.
//
// Every figure comes from src/utils/plan/checklist.js. Nothing here moves
// money: "Do it" opens the ordinary transfer form, and the household confirms
// it there through the same RPC everything else uses.
function ChecklistItemRow({ item, accountName, goalName }) {
  const { dispatch, openModal } = useApp();
  const [skipping, setSkipping] = useState(false);
  const [reason, setReason] = useState('');

  const destination = item.goalId ? goalName(item.goalId) : accountName(item.toAccountId);

  if (item.status !== 'todo') {
    return (
      <div className="ios-row-wrap list-row">
        <div className="list-row__main">
          <span className="list-row__title checklist__done">{item.reason}</span>
          <span className="list-row__meta">
            {item.status === 'done' ? 'Done' : `Skipped — ${item.skipReason || 'no reason given'}`}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="ios-row-wrap checklist__item">
      <div className="list-row__main">
        <span className="list-row__title">{item.reason}</span>
        <span className="list-row__meta">
          {accountName(item.fromAccountId)} → {destination ?? 'nowhere set'}
        </span>
      </div>
      {skipping ? (
        <div className="checklist__skip">
          <input
            type="text"
            className="form__input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why skip it?"
          />
          <button
            type="button"
            className="bill-row__pay"
            onClick={() => {
              dispatch({
                type: 'checklist/updateItem',
                payload: { id: item.id, status: 'skipped', skipReason: reason.trim() || 'No reason given' },
              });
              setSkipping(false);
            }}
          >
            Skip it
          </button>
        </div>
      ) : (
        <div className="checklist__actions">
          <button
            type="button"
            className="bill-row__pay"
            onClick={() => {
              // The transfer form does the moving. Marking the item done here
              // records the decision; if the transfer is abandoned the item
              // can be un-skipped by logging it again.
              openModal('transferMoney', {
                prefill: {
                  fromAccountId: item.fromAccountId,
                  toAccountId: item.toAccountId,
                  amount: item.amount,
                  note: item.reason,
                },
              });
              dispatch({ type: 'checklist/updateItem', payload: { id: item.id, status: 'done' } });
            }}
          >
            Do it
          </button>
          <button type="button" className="checklist__skip-btn" onClick={() => setSkipping(true)}>
            Skip
          </button>
        </div>
      )}
    </div>
  );
}

export function ChecklistCard() {
  const { state, dispatch } = useApp();
  const { open, unclassified } = useChecklists();

  const accountName = (id) => state.accounts.find((a) => a.id === id)?.name ?? 'somewhere';
  const goalName = (id) => state.goals.find((g) => g.id === id)?.name ?? null;

  function answer(entry, kind) {
    const built = buildChecklist({ entry, kind, settings: state.planSettings, goals: state.goals });
    dispatch({
      type: 'checklist/create',
      payload: { id: generateId(), incomeId: entry.id, incomeKind: kind, items: built.items },
    });
  }

  if (open.length === 0 && unclassified.length === 0) return null;

  return (
    <>
      {unclassified.slice(0, 2).map((entry) => (
        <div className="ios-group" key={entry.id}>
          <div className="ios-group__header">
            <span className="ios-group__title">What is this money?</span>
          </div>
          <div className="ios-card">
            <div className="ios-row-wrap list-row">
              <div className="list-row__main">
                <span className="list-row__title">
                  {formatPHP(entry.amount)} — {entry.source}
                </span>
                <span className="list-row__meta">
                  Logged {entry.date}. Tell the app what it is and it will say where the plan sends it.
                </span>
              </div>
            </div>
            <div className="checklist__kinds">
              {INCOME_KIND_META.map((k) => (
                <button key={k.value} type="button" className="bill-row__pay" onClick={() => answer(entry, k.value)}>
                  {k.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}

      {open.map((list) => {
        const meta = getIncomeKindMeta(list.incomeKind);
        const entry = state.income.find((i) => i.id === list.incomeId);
        const left = list.items.filter((i) => i.status === 'todo').length;
        return (
          <div className="ios-group" key={list.id}>
            <div className="ios-group__header">
              <span className="ios-group__title">
                {meta.label} — {left} left to do
              </span>
              <button
                type="button"
                className="ios-group__sort-btn"
                onClick={() => dispatch({ type: 'checklist/close', payload: { id: list.id } })}
              >
                Dismiss
              </button>
            </div>
            <div className="ios-card">
              {entry && (
                <div className="ios-row-wrap list-row">
                  <span className="list-row__meta">
                    {formatPHP(entry.amount)} from {entry.source}. Each line is a transfer the plan asks for —
                    nothing moves until you confirm it.
                  </span>
                </div>
              )}
              {list.items.map((item) => (
                <ChecklistItemRow key={item.id} item={item} accountName={accountName} goalName={goalName} />
              ))}
              {isChecklistFinished(list.items) && (
                <div className="ios-row-wrap list-row">
                  <span className="list-row__meta">All done.</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
