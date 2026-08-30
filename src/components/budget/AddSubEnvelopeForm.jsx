import { useState } from 'react';
import { GroupSelect } from '../shared/GroupSelect.jsx';

export function AddSubEnvelopeForm({ groups, onAdd }) {
  const [name, setName] = useState('');
  const [budget, setBudget] = useState('');
  const [group, setGroup] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const budgetValue = Number(budget);
    if (!name.trim()) {
      setError('Give this envelope a name.');
      return;
    }
    if (!budgetValue || budgetValue <= 0) {
      setError('Enter a budget greater than ₱0.');
      return;
    }
    if (!group.trim()) {
      setError('Choose or create a group.');
      return;
    }
    onAdd({ name: name.trim(), monthlyBudget: budgetValue, group: group.trim() });
    setName('');
    setBudget('');
    setGroup('');
    setError('');
  }

  return (
    <form className="form allocate-add-form" onSubmit={handleSubmit}>
      <div className="ios-group__title">Add Sub-Envelope</div>
      <label className="form__field">
        <span className="form__label">Name</span>
        <input
          type="text"
          className="form__input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Streaming"
        />
      </label>
      <label className="form__field">
        <span className="form__label">Budget (₱)</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="1"
          className="form__input"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          placeholder="0"
        />
      </label>
      <div className="form__field">
        <span className="form__label">Group</span>
        <GroupSelect groups={groups} value={group} onChange={setGroup} />
      </div>
      {error && <p className="form__error">{error}</p>}
      <button type="submit" className="btn-block">
        + Add Envelope
      </button>
    </form>
  );
}
