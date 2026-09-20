import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useDerivedFinancials } from '../hooks/useDerivedFinancials.js';
import { formatPHP } from '../utils/currency.js';
import { groupByOrder } from '../utils/group.js';
import { getCurrentMonth, getMonthKey, getMonthName } from '../utils/date.js';
import { generateId } from '../utils/id.js';
import { BUDGET_SOURCE, isMonthEditable } from '../utils/plan/monthBudgets.js';
import { EnvelopeSliderRow } from '../components/budget/EnvelopeSliderRow.jsx';
import { AddSubEnvelopeForm } from '../components/budget/AddSubEnvelopeForm.jsx';
import { BottomSheet } from './BottomSheet.jsx';

// Budgets are month-scoped (see src/utils/plan/monthBudgets.js). Two rules run
// through this whole component:
//
//  1. A budget edit writes a row for the month being VIEWED
//     ('envelope/setMonthBudget'). It never touches envelopes.monthly_budget.
//  2. Anything that is not a budget — a rename, a group move — still writes the
//     envelope row, and must carry the envelope's BASE budget, not the figure
//     resolved for this month. Sending the resolved one would quietly stamp
//     this month's number onto every earlier month.
export function AllocateBudgetSheet() {
  const { state, dispatch, closeModal } = useApp();
  const { totalIncome, envelopeStats } = useDerivedFinancials();

  const monthKey = getMonthKey(state.month.year, state.month.monthIndex);
  const currentMonthKey = useMemo(() => {
    const now = getCurrentMonth();
    return getMonthKey(now.year, now.monthIndex);
  }, []);
  // A budget written for a past month would carry forward into every month
  // after it that has no row of its own — rewriting exactly the history this
  // table exists to keep. Closed months are therefore read-only.
  const editable = isMonthEditable(monthKey, currentMonthKey);

  const [liveValues, setLiveValues] = useState(() =>
    Object.fromEntries(envelopeStats.map((env) => [env.id, env.monthlyBudget]))
  );
  const liveValuesRef = useRef(liveValues);

  // Stepping the month behind the open sheet changes which figures these are.
  useEffect(() => {
    const next = Object.fromEntries(envelopeStats.map((env) => [env.id, env.monthlyBudget]));
    liveValuesRef.current = next;
    setLiveValues(next);
    // envelopeStats is rebuilt on every state change; the month key is what
    // actually means "these are different figures now".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey]);

  const handleChange = useCallback((id, value) => {
    liveValuesRef.current = { ...liveValuesRef.current, [id]: value };
    setLiveValues(liveValuesRef.current);
  }, []);

  const commitBudget = useCallback(
    (id, amount) => {
      dispatch({ type: 'envelope/setMonthBudget', payload: { envelopeId: id, monthKey, amount } });
    },
    [dispatch, monthKey]
  );

  const handleCommit = useCallback(
    (id) => {
      if (!editable) return;
      const envelope = envelopeStats.find((env) => env.id === id);
      if (!envelope) return;
      commitBudget(id, liveValuesRef.current[id] ?? envelope.monthlyBudget);
    },
    [envelopeStats, commitBudget, editable]
  );

  const handleMove = useCallback(
    (id, newGroup) => {
      // Rule 2: the base budget, read from state.envelopes rather than the
      // month-resolved list.
      const base = state.envelopes.find((env) => env.id === id);
      if (!base) return;
      dispatch({
        type: 'envelope/update',
        payload: { id, name: base.name, monthlyBudget: base.monthlyBudget, group: newGroup },
      });
    },
    [state.envelopes, dispatch]
  );

  const handleRemove = useCallback((id) => dispatch({ type: 'envelope/remove', payload: { id } }), [dispatch]);

  function handleAddSubEnvelope(payload) {
    // A new envelope's base is 0 and its amount lands as a row for this month.
    // Given as a base it would apply to every earlier month too, inflating
    // budgets for months in which this envelope did not exist.
    const id = generateId();
    dispatch({ type: 'envelope/add', payload: { ...payload, id, monthlyBudget: 0 } });
    if (payload.monthlyBudget) {
      dispatch({
        type: 'envelope/setMonthBudget',
        payload: { envelopeId: id, monthKey, amount: payload.monthlyBudget },
      });
    }
  }

  function handleSendExcess() {
    const savingsEnvelope = envelopeStats.find((env) => env.group === 'Savings');
    if (!savingsEnvelope) return;
    const newBudget = (liveValuesRef.current[savingsEnvelope.id] ?? savingsEnvelope.monthlyBudget) + diff;
    handleChange(savingsEnvelope.id, newBudget);
    commitBudget(savingsEnvelope.id, newBudget);
  }

  const allocated = Object.values(liveValues).reduce((a, b) => a + b, 0);
  const diff = totalIncome - allocated;
  const groupNames = [...new Set(envelopeStats.map((env) => env.group))];
  const groups = groupByOrder(envelopeStats, (env) => env.group);
  const monthLabel = `${getMonthName(state.month.year, state.month.monthIndex)} ${state.month.year}`;

  return (
    <BottomSheet title={`Allocate Budget — ${monthLabel}`} onClose={closeModal}>
      <div className="allocate-header">
        <div className="allocate-header__row">
          <span>Income</span>
          <span>{formatPHP(totalIncome)}</span>
        </div>
        <div className="allocate-header__row allocate-header__row--total">
          <span>Allocated</span>
          <span>{formatPHP(allocated)}</span>
        </div>
        <div className="allocate-status">
          {!editable && (
            <span className="allocate-status__text">
              {monthLabel} has closed. Its budgets are read-only so earlier months keep their own figures.
            </span>
          )}
          {editable && diff < 0 && (
            <span className="allocate-status__text allocate-status__text--danger">
              Over budget by {formatPHP(-diff)}
            </span>
          )}
          {editable && diff > 0 && (
            <>
              <span className="allocate-status__text">{formatPHP(diff)} left unallocated</span>
              <button type="button" className="btn-block" onClick={handleSendExcess}>
                Send Excess to Savings
              </button>
            </>
          )}
          {editable && diff === 0 && (
            <span className="allocate-status__text allocate-status__text--accent">Fully allocated ✓</span>
          )}
        </div>
      </div>

      {groups.map(({ group, items }) => (
        <div key={group}>
          <div className="allocate-group-title">{group}</div>
          {items.map((envelope) => (
            <EnvelopeSliderRow
              key={envelope.id}
              envelope={envelope}
              value={liveValues[envelope.id] ?? envelope.monthlyBudget}
              groups={groupNames}
              readOnly={!editable}
              inherited={envelope.budgetSource !== BUDGET_SOURCE.MONTH}
              onChange={handleChange}
              onCommit={handleCommit}
              onMove={handleMove}
              onRemove={handleRemove}
            />
          ))}
        </div>
      ))}

      {editable && <AddSubEnvelopeForm groups={groupNames} onAdd={handleAddSubEnvelope} />}
    </BottomSheet>
  );
}
