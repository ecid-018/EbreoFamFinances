import { useState } from 'react';

const NEW_GROUP_VALUE = '__new__';

export function GroupSelect({ groups, value, onChange }) {
  const [isNew, setIsNew] = useState(value !== '' && !groups.includes(value));

  function handleSelectChange(e) {
    const next = e.target.value;
    if (next === NEW_GROUP_VALUE) {
      setIsNew(true);
      onChange('');
    } else {
      setIsNew(false);
      onChange(next);
    }
  }

  return (
    <div>
      <select
        className="form__input"
        value={isNew ? NEW_GROUP_VALUE : value}
        onChange={handleSelectChange}
      >
        <option value="" disabled>
          Choose a group…
        </option>
        {groups.map((group) => (
          <option key={group} value={group}>
            {group}
          </option>
        ))}
        <option value={NEW_GROUP_VALUE}>+ New group…</option>
      </select>
      {isNew && (
        <input
          type="text"
          className="form__input form__input--stacked"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="New group name"
        />
      )}
    </div>
  );
}
