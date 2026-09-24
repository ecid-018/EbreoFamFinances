import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { getActiveAccounts } from '../utils/accounts.js';
import { BILL_PERIODS, getNextOccurrence, SCHEDULE_KINDS, SCHEDULE_KIND_META, getKindMeta } from '../utils/plan/bills.js';
import { splitGoals } from '../utils/plan/goals.js';
import { BottomSheet } from './BottomSheet.jsx';

export function BillFormModal({ mode = 'add', bill, defaultKind = SCHEDULE_KINDS.BILL }) {
  const { state, dispatch, closeModal } = useApp();
  const isEdit = mode === 'edit';
  const accounts = getActiveAccounts(state.accounts);
  // Only sinking funds can pay a bill: a savings goal is money being built up
  // for something, not a float that a recurring cost draws down.
  const { sinkingFunds } = splitGoals(state.goals);

  const [kind, setKind] = useState(isEdit ? bill.kind ?? SCHEDULE_KINDS.BILL : defaultKind);
  // Declared after the state it reads, not before: `const` is not hoisted, and
  // reading it above threw "Cannot access 'kind' before initialization" at
  // render time. Neither the build nor the linter catches that.
  const isBill = kind === SCHEDULE_KINDS.BILL;
  // A job has no amount. "Open the new MP2 account each January" costs
  // nothing, and demanding a figure would force a fake one into the data.
  const needsAmount = kind !== SCHEDULE_KINDS.TASK;
  const [name, setName] = useState(isEdit ? bill.name : '');
  const [amount, setAmount] = useState(isEdit ? String(bill.amount) : '');
  const [period, setPeriod] = useState(isEdit ? bill.period : 'monthly');
  const [dueDay, setDueDay] = useState(isEdit ? String(bill.dueDay ?? '') : '');
  const [nextDue, setNextDue] = useState(isEdit ? bill.nextDue ?? '' : '');
  const [accountId, setAccountId] = useState(isEdit ? bill.accountId ?? '' : '');
  const [envelopeId, setEnvelopeId] = useState(isEdit ? bill.envelopeId ?? '' : '');
  const [goalId, setGoalId] = useState(isEdit ? bill.goalId ?? '' : '');
  const [isActive, setIsActive] = useState(isEdit ? bill.isActive : true);
  const [notes, setNotes] = useState(isEdit ? bill.notes ?? '' : '');
  const [error, setError] = useState('');

  // Picking a day fills in the next date it falls on, so the common case needs
  // no date picking at all. It stays editable for a bill whose first payment
  // is not the next occurrence.
  function handleDueDay(value) {
    setDueDay(value);
    const day = Number(value);
    if (day >= 1 && day <= 31) setNextDue(getNextOccurrence(day) ?? '');
  }

  function handleSubmit(e) {
    e.preventDefault();
    const amountValue = Number(amount);
    if (!name.trim()) {
      setError('Give it a name.');
      return;
    }
    if (needsAmount && (!amountValue || amountValue <= 0)) {
      setError('Enter an amount greater than ₱0.');
      return;
    }
    if (!nextDue) {
      setError('Set the day of the month, or pick the next due date.');
      return;
    }

    const payload = {
      kind,
      notes: notes.trim(),
      name: name.trim(),
      // The column is NOT NULL, so a task stores zero rather than nothing.
      amount: needsAmount ? amountValue : amountValue || 0,
      period,
      dueDay: dueDay === '' ? null : Number(dueDay),
      nextDue,
      accountId: accountId || null,
      envelopeId: envelopeId || null,
      goalId: goalId || null,
      isActive,
    };

    dispatch(
      isEdit
        ? { type: 'bill/update', payload: { id: bill.id, ...payload } }
        : { type: 'bill/add', payload }
    );
    closeModal();
  }

  return (
    <BottomSheet
      title={`${isEdit ? 'Edit' : 'Add'} ${getKindMeta(kind).label}`}
      onClose={closeModal}
      fullScreen
    >
      <form className="form" onSubmit={handleSubmit}>
        <div className="form__field">
          <span className="form__label">What is this?</span>
          <select className="form__input" value={kind} onChange={(e) => setKind(e.target.value)}>
            {SCHEDULE_KIND_META.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label} — {k.hint}
              </option>
            ))}
          </select>
        </div>
        <label className="form__field">
          <span className="form__label">Name</span>
          <input
            type="text"
            className="form__input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="What is this for?"
            required
          />
        </label>
        <label className="form__field">
          <span className="form__label">Amount (₱){needsAmount ? '' : ' — optional'}</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            className="form__input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={needsAmount ? '0' : 'Leave blank — a task has no amount'}
            required={needsAmount}
          />
        </label>
        <label className="form__field">
          <span className="form__label">How often</span>
          <select className="form__input" value={period} onChange={(e) => setPeriod(e.target.value)}>
            {BILL_PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="form__field">
          <span className="form__label">Day of the month</span>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            max="31"
            step="1"
            className="form__input"
            value={dueDay}
            onChange={(e) => handleDueDay(e.target.value)}
            placeholder="e.g. 15"
          />
        </label>
        <label className="form__field">
          <span className="form__label">Next due</span>
          <input
            type="date"
            className="form__input"
            value={nextDue}
            onChange={(e) => setNextDue(e.target.value)}
            required
          />
        </label>
        {isBill && (
        <label className="form__field">
          <span className="form__label">Paid from</span>
          <select className="form__input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">Ask each time</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        )}
        {isBill && (
        <label className="form__field">
          <span className="form__label">Envelope</span>
          <select className="form__input" value={envelopeId} onChange={(e) => setEnvelopeId(e.target.value)}>
            <option value="">Ask each time</option>
            {state.envelopes.map((env) => (
              <option key={env.id} value={env.id}>
                {env.name}
              </option>
            ))}
          </select>
        </label>
        )}
        {isBill && sinkingFunds.length > 0 && (
          <label className="form__field">
            <span className="form__label">Funded by</span>
            <select className="form__input" value={goalId} onChange={(e) => setGoalId(e.target.value)}>
              <option value="">Nothing — paid from income</option>
              {sinkingFunds.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <span className="form__checkbox-hint">
              Paying this bill takes the same amount out of that fund, so a fund built up to meet it
              actually goes down when it does.
            </span>
          </label>
        )}
        <label className="form__field">
          <span className="form__label">Notes</span>
          <input
            type="text"
            className="form__input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything worth remembering"
          />
        </label>

        {isEdit && (
          <label className="form__field form__checkbox">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <span>
              Still active
              <span className="form__checkbox-hint">
                Turn this off for a bill that has ended. It stops being reminded about and keeps its
                history.
              </span>
            </span>
          </label>
        )}
        {error && <p className="form__error">{error}</p>}
        <button type="submit" className="btn-block">
          {isEdit ? 'Save Changes' : `Add ${getKindMeta(kind).label}`}
        </button>
      </form>
    </BottomSheet>
  );
}
