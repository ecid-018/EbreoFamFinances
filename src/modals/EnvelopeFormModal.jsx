import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useDerivedFinancials } from '../hooks/useDerivedFinancials.js';
import { GroupSelect } from '../components/shared/GroupSelect.jsx';
import { getMonthKey, getMonthName } from '../utils/date.js';
import { generateId } from '../utils/id.js';
import { BottomSheet } from './BottomSheet.jsx';

// The budget field edits the month being VIEWED, not a single global figure —
// see src/utils/plan/monthBudgets.js. Name and group are not month-scoped and
// still write the envelope row, which is why the submit below splits into two
// dispatches rather than one.
export function EnvelopeFormModal({ mode, envelope }) {
  const { state, dispatch, closeModal } = useApp();
  const { envelopeStats } = useDerivedFinancials();
  const isEdit = mode === 'edit';

  const monthKey = getMonthKey(state.month.year, state.month.monthIndex);
  const monthLabel = `${getMonthName(state.month.year, state.month.monthIndex)} ${state.month.year}`;
  // The figure for this month, which is not necessarily the prop's own — the
  // caller may have handed us a base envelope row.
  const resolved = isEdit ? envelopeStats.find((env) => env.id === envelope.id) : null;

  const [name, setName] = useState(isEdit ? envelope.name : '');
  const [monthlyBudget, setMonthlyBudget] = useState(
    isEdit ? String(resolved?.monthlyBudget ?? envelope.monthlyBudget) : ''
  );
  const [group, setGroup] = useState(isEdit ? envelope.group : '');
  // undefined means 0016 has not been applied here yet, so the control is
  // hidden rather than offering a tick that cannot be saved.
  const tradingFlagAvailable = state.envelopes.every((env) => env.isTradingCost !== undefined);
  const [isTradingCost, setIsTradingCost] = useState(isEdit ? envelope.isTradingCost ?? false : false);
  const [error, setError] = useState('');

  const existingGroups = [...new Set(state.envelopes.map((env) => env.group))];

  function handleSubmit(e) {
    e.preventDefault();
    const budgetValue = Number(monthlyBudget);
    if (!name.trim()) {
      setError('Give this envelope a name.');
      return;
    }
    if (!budgetValue || budgetValue <= 0) {
      setError('Enter a monthly budget greater than ₱0.');
      return;
    }
    if (!group.trim()) {
      setError('Choose or create a group.');
      return;
    }
    if (isEdit) {
      // The base budget is carried through untouched; only name and group can
      // change here. Sending budgetValue would stamp this month's figure onto
      // every earlier month that has no row of its own.
      const base = state.envelopes.find((env) => env.id === envelope.id);
      dispatch({
        type: 'envelope/update',
        payload: {
          id: envelope.id,
          name: name.trim(),
          monthlyBudget: base?.monthlyBudget ?? budgetValue,
          group: group.trim(),
          ...(tradingFlagAvailable ? { isTradingCost } : {}),
        },
      });
      if (budgetValue !== resolved?.monthlyBudget) {
        dispatch({
          type: 'envelope/setMonthBudget',
          payload: { envelopeId: envelope.id, monthKey, amount: budgetValue },
        });
      }
    } else {
      // Base 0 plus a row for this month: a new envelope must not add budget
      // to months in which it did not exist.
      const id = generateId();
      dispatch({
        type: 'envelope/add',
        payload: {
          id,
          name: name.trim(),
          monthlyBudget: 0,
          group: group.trim(),
          ...(tradingFlagAvailable ? { isTradingCost } : {}),
        },
      });
      dispatch({ type: 'envelope/setMonthBudget', payload: { envelopeId: id, monthKey, amount: budgetValue } });
    }
    closeModal();
  }

  return (
    <BottomSheet title={isEdit ? 'Edit Envelope' : 'Add Envelope'} onClose={closeModal} fullScreen>
      <form className="form" onSubmit={handleSubmit}>
        <label className="form__field">
          <span className="form__label">Name</span>
          <input
            type="text"
            className="form__input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Groceries"
            required
          />
        </label>
        <label className="form__field">
          <span className="form__label">Budget for {monthLabel} (₱)</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            className="form__input"
            value={monthlyBudget}
            onChange={(e) => setMonthlyBudget(e.target.value)}
            placeholder="0"
            required
          />
        </label>
        <div className="form__field">
          <span className="form__label">Group</span>
          <GroupSelect groups={existingGroups} value={group} onChange={setGroup} />
        </div>
        {tradingFlagAvailable && (
          <label className="form__field form__checkbox">
            <input
              type="checkbox"
              checked={isTradingCost}
              onChange={(e) => setIsTradingCost(e.target.checked)}
            />
            <span>
              This is a cost of trading
              <span className="form__checkbox-hint">
                Data feeds, platform fees, subscriptions. It stays in this group and this budget —
                the tick only lets the Plan view total them against what trading paid out.
              </span>
            </span>
          </label>
        )}

        {error && <p className="form__error">{error}</p>}
        <button type="submit" className="btn-block">
          {isEdit ? 'Save Changes' : 'Add Envelope'}
        </button>
      </form>
    </BottomSheet>
  );
}
