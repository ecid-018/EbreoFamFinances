import { useCallback, useRef, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useDerivedFinancials } from '../hooks/useDerivedFinancials.js';
import { formatPHP } from '../utils/currency.js';
import { groupByOrder } from '../utils/group.js';
import { EnvelopeSliderRow } from '../components/budget/EnvelopeSliderRow.jsx';
import { AddSubEnvelopeForm } from '../components/budget/AddSubEnvelopeForm.jsx';
import { BottomSheet } from './BottomSheet.jsx';

export function AllocateBudgetSheet() {
  const { state, dispatch, closeModal } = useApp();
  const { totalIncome } = useDerivedFinancials();
  const initialLiveValues = Object.fromEntries(state.envelopes.map((env) => [env.id, env.monthlyBudget]));
  const liveValuesRef = useRef(initialLiveValues);
  const [liveValues, setLiveValues] = useState(initialLiveValues);

  const handleChange = useCallback((id, value) => {
    liveValuesRef.current = { ...liveValuesRef.current, [id]: value };
    setLiveValues(liveValuesRef.current);
  }, []);

  const handleCommit = useCallback(
    (id) => {
      const envelope = state.envelopes.find((env) => env.id === id);
      if (!envelope) return;
      dispatch({
        type: 'envelope/update',
        payload: {
          id,
          name: envelope.name,
          monthlyBudget: liveValuesRef.current[id] ?? envelope.monthlyBudget,
          group: envelope.group,
        },
      });
    },
    [state.envelopes, dispatch]
  );

  const handleMove = useCallback(
    (id, newGroup) => {
      const envelope = state.envelopes.find((env) => env.id === id);
      if (!envelope) return;
      dispatch({
        type: 'envelope/update',
        payload: {
          id,
          name: envelope.name,
          monthlyBudget: liveValuesRef.current[id] ?? envelope.monthlyBudget,
          group: newGroup,
        },
      });
    },
    [state.envelopes, dispatch]
  );

  const handleRemove = useCallback(
    (id) => {
      dispatch({ type: 'envelope/remove', payload: { id } });
    },
    [dispatch]
  );

  function handleAddSubEnvelope(payload) {
    dispatch({ type: 'envelope/add', payload });
  }

  function handleSendExcess() {
    const savingsEnvelope = state.envelopes.find((env) => env.group === 'Savings');
    if (!savingsEnvelope) return;
    const newBudget = (liveValuesRef.current[savingsEnvelope.id] ?? savingsEnvelope.monthlyBudget) + diff;
    liveValuesRef.current = { ...liveValuesRef.current, [savingsEnvelope.id]: newBudget };
    setLiveValues(liveValuesRef.current);
    dispatch({
      type: 'envelope/update',
      payload: { id: savingsEnvelope.id, name: savingsEnvelope.name, monthlyBudget: newBudget, group: savingsEnvelope.group },
    });
  }

  const allocated = Object.values(liveValues).reduce((a, b) => a + b, 0);
  const diff = totalIncome - allocated;
  const groupNames = [...new Set(state.envelopes.map((env) => env.group))];
  const groups = groupByOrder(state.envelopes, (env) => env.group);

  return (
    <BottomSheet title="Allocate Monthly Budget" onClose={closeModal}>
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
          {diff < 0 && (
            <span className="allocate-status__text allocate-status__text--danger">
              Over budget by {formatPHP(-diff)}
            </span>
          )}
          {diff > 0 && (
            <>
              <span className="allocate-status__text">{formatPHP(diff)} left unallocated</span>
              <button type="button" className="btn-block" onClick={handleSendExcess}>
                Send Excess to Savings
              </button>
            </>
          )}
          {diff === 0 && (
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
              onChange={handleChange}
              onCommit={handleCommit}
              onMove={handleMove}
              onRemove={handleRemove}
            />
          ))}
        </div>
      ))}

      <AddSubEnvelopeForm groups={groupNames} onAdd={handleAddSubEnvelope} />
    </BottomSheet>
  );
}
