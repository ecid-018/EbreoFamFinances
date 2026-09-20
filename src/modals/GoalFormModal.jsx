import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getOwnAccounts, withCurrentAccount } from '../utils/accounts.js';
import { BottomSheet } from './BottomSheet.jsx';

export function GoalFormModal({ mode = 'add', goal }) {
  const { state, dispatch, closeModal } = useApp();
  const { session } = useAuth();
  const isEdit = mode === 'edit';
  const [name, setName] = useState(isEdit ? goal.name : '');
  const [target, setTarget] = useState(isEdit ? String(goal.target) : '');
  const [saved, setSaved] = useState('');
  const [priority, setPriority] = useState(isEdit ? (goal.priority ?? '') : '');
  const [targetDate, setTargetDate] = useState(isEdit ? goal.targetDate ?? '' : '');
  const [heldInAccountId, setHeldInAccountId] = useState(isEdit ? goal.heldInAccountId ?? '' : '');
  const [isSinkingFund, setIsSinkingFund] = useState(isEdit ? goal.isSinkingFund ?? false : false);
  const [goalGroup, setGoalGroup] = useState(isEdit ? goal.goalGroup ?? '' : '');
  const [error, setError] = useState('');

  // Any of your own accounts can hold a goal, including a co-op. An account
  // an existing goal already points at stays selectable even if archived.
  const accounts = withCurrentAccount(
    getOwnAccounts(state.accounts, session?.user?.id),
    state.accounts,
    isEdit ? goal.heldInAccountId : null
  );
  // Offer existing group labels so one fund split across accounts is easy to
  // reuse without retyping (and mistyping) the label.
  const existingGroups = [...new Set(state.goals.map((g) => g.goalGroup).filter(Boolean))];

  function handleSubmit(e) {
    e.preventDefault();
    const targetValue = Number(target);
    if (!name.trim()) {
      setError('Give this goal a name.');
      return;
    }
    if (!targetValue || targetValue <= 0) {
      setError('Enter a target amount greater than ₱0.');
      return;
    }

    const planFields = {
      priority: priority === '' ? null : Number(priority),
      targetDate: targetDate || null,
      heldInAccountId: heldInAccountId || null,
      isSinkingFund,
      goalGroup: goalGroup.trim() || null,
    };

    if (isEdit) {
      dispatch({ type: 'goal/update', payload: { id: goal.id, name: name.trim(), target: targetValue, ...planFields } });
    } else {
      const savedValue = saved === '' ? 0 : Number(saved);
      dispatch({ type: 'goal/add', payload: { name: name.trim(), target: targetValue, saved: savedValue, ...planFields } });
    }
    closeModal();
  }

  return (
    <BottomSheet title={isEdit ? 'Edit Savings Goal' : 'Add Savings Goal'} onClose={closeModal} fullScreen>
      <form className="form" onSubmit={handleSubmit}>
        <label className="form__field">
          <span className="form__label">Name</span>
          <input
            type="text"
            className="form__input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Emergency Fund"
            required
          />
        </label>
        <label className="form__field">
          <span className="form__label">Target amount (₱)</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            className="form__input"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="0"
            required
          />
        </label>
        {!isEdit && (
          <label className="form__field">
            <span className="form__label">Already saved (₱)</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              className="form__input"
              value={saved}
              onChange={(e) => setSaved(e.target.value)}
              placeholder="0"
            />
          </label>
        )}
        <label className="form__field">
          <span className="form__label">Priority (optional)</span>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            className="form__input"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            placeholder="1 = funded first"
          />
        </label>
        <label className="form__field">
          <span className="form__label">Target date (optional)</span>
          <input
            type="date"
            className="form__input"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </label>
        <label className="form__field">
          <span className="form__label">Held in (optional)</span>
          {accounts.length > 0 ? (
            <select className="form__input" value={heldInAccountId} onChange={(e) => setHeldInAccountId(e.target.value)}>
              <option value="">Not tracked to an account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="form__label">No accounts yet — add one in Accounts first.</p>
          )}
        </label>
        <label className="form__field">
          <span className="form__label">Group (optional)</span>
          <input
            type="text"
            className="form__input"
            list="goal-groups"
            value={goalGroup}
            onChange={(e) => setGoalGroup(e.target.value)}
            placeholder="e.g. Emergency Fund"
          />
          <datalist id="goal-groups">
            {existingGroups.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
          <span className="form__checkbox-hint">
            Give one fund split across several accounts the same group name to see it as a single total.
          </span>
        </label>
        <label className="form__field form__checkbox">
          <input type="checkbox" checked={isSinkingFund} onChange={(e) => setIsSinkingFund(e.target.checked)} />
          <span>
            This is a sinking fund
            <span className="form__checkbox-hint">
              Saves up for a recurring bill and is spent down again. Kept out of the headline goals progress.
            </span>
          </span>
        </label>
        {error && <p className="form__error">{error}</p>}
        <button type="submit" className="btn-block">
          {isEdit ? 'Save Changes' : 'Add Goal'}
        </button>
      </form>
    </BottomSheet>
  );
}
