import { formatPHP } from '../../utils/currency.js';
import { matchGoals } from '../../utils/plan/prefill.js';

// Goals are matched by exact name, case- and space-insensitive. Deliberately
// not fuzzy: a duplicate goal is easy to delete, a silently retargeted one is
// easy to miss. A goal you already have that is absent from the file is left
// completely alone.
//
// A goal's saved amount is real money and is never shown as changing here,
// because nothing in this tool will ever write it.
export function GoalsStep({ plan, goals, goalTargets, onTargetChange }) {
  const matches = matchGoals(plan.goals, goals);
  const creates = matches.filter((m) => m.action === 'create');
  const updates = matches.filter((m) => m.action === 'update');
  const untouched = goals.filter(
    (goal) => !matches.some((m) => m.existing?.id === goal.id)
  );

  return (
    <div className="prefill-step">
      <h3 className="prefill-heading">Goals in the file</h3>
      <p className="prefill-note">
        {creates.length} would be created, {updates.length} would have their target changed. Saved amounts are never
        touched.
      </p>

      <table className="prefill-table">
        <thead>
          <tr>
            <th>Goal</th>
            <th className="prefill-table__num">Current target</th>
            <th className="prefill-table__num">Proposed target</th>
            <th>Also applies</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((match) => {
            const { fileGoal, action, currentTarget } = match;
            const extras = [
              fileGoal.priority !== undefined ? `priority ${fileGoal.priority}` : null,
              fileGoal.group ? `group “${fileGoal.group}”` : null,
              fileGoal.target_date ? `by ${fileGoal.target_date}` : null,
              fileGoal.sinking ? 'sinking fund' : null,
            ].filter(Boolean);

            return (
              <tr key={fileGoal.name}>
                <td>
                  {fileGoal.name}
                  <span className="prefill-table__muted"> · {action === 'create' ? 'new' : 'exists'}</span>
                </td>
                <td className="prefill-table__num">
                  {currentTarget === null ? '—' : formatPHP(currentTarget)}
                </td>
                <td className="prefill-table__num">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    className="form__input prefill-table__input"
                    value={goalTargets[fileGoal.name] ?? fileGoal.target}
                    onChange={(e) => onTargetChange(fileGoal.name, Number(e.target.value))}
                    aria-label={`Proposed target for ${fileGoal.name}`}
                  />
                </td>
                <td className="prefill-table__muted">{extras.length ? extras.join(', ') : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {untouched.length > 0 && (
        <>
          <h3 className="prefill-heading">Left exactly as they are</h3>
          <p className="prefill-note">
            These goals are not in the file, so nothing about them changes.
          </p>
          <ul className="prefill-list">
            {untouched.map((goal) => (
              <li key={goal.id}>
                {goal.name} <span className="prefill-table__muted">· target {formatPHP(goal.target)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
