import { formatPHP } from '../../utils/currency.js';
import { matchGoals, OVERLAP_CHOICE } from '../../utils/plan/prefill.js';

// The confirm step — except there is deliberately nothing to confirm yet.
// Apply is not wired in this change: these previews are for review first, and
// the write path lands once they have been checked against real data.
export function SummaryStep({
  plan,
  envelopes,
  proposed,
  overlapChoices,
  goals,
  goalTargets,
  targetMonthKey,
  targetMonthLabel,
}) {
  const budgetChanges = envelopes.filter(
    (env) => proposed[env.id] !== undefined && proposed[env.id] !== env.monthlyBudget
  );
  const zeroed = envelopes.filter((env) => overlapChoices[env.id] === OVERLAP_CHOICE.ZERO);

  const matches = matchGoals(plan.goals, goals);
  const creates = matches.filter((m) => m.action === 'create');
  const targetChanges = matches.filter(
    (m) => m.action === 'update' && (goalTargets[m.fileGoal.name] ?? m.proposedTarget) !== m.currentTarget
  );

  return (
    <div className="prefill-step">
      <h3 className="prefill-heading">What would be applied</h3>

      <ul className="prefill-summary">
        <li>
          <strong>{budgetChanges.length}</strong> envelope {budgetChanges.length === 1 ? 'budget' : 'budgets'} changed
          for {targetMonthLabel}
          <span className="prefill-table__muted"> ({targetMonthKey})</span>
        </li>
        {zeroed.length > 0 && (
          <li>
            <strong>{zeroed.length}</strong> overlapping {zeroed.length === 1 ? 'envelope' : 'envelopes'} set to zero
          </li>
        )}
        <li>
          <strong>{creates.length}</strong> {creates.length === 1 ? 'goal' : 'goals'} created
        </li>
        <li>
          <strong>{targetChanges.length}</strong> goal {targetChanges.length === 1 ? 'target' : 'targets'} changed
        </li>
      </ul>

      <p className="prefill-note">
        Earlier months are not affected: budgets are written as rows for {targetMonthLabel} only, and every month
        before it keeps the figures it already has. Nothing changes a goal&apos;s saved amount, and no envelope is
        ever deleted — deleting one would strip the category from its past transactions.
      </p>

      {budgetChanges.length > 0 && (
        <table className="prefill-table">
          <thead>
            <tr>
              <th>Envelope</th>
              <th className="prefill-table__num">Current</th>
              <th className="prefill-table__num">{targetMonthLabel}</th>
            </tr>
          </thead>
          <tbody>
            {budgetChanges.map((env) => (
              <tr key={env.id}>
                <td>{env.name}</td>
                <td className="prefill-table__num">{formatPHP(env.monthlyBudget)}</td>
                <td className="prefill-table__num">{formatPHP(proposed[env.id])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="prefill-blocked">
        <p className="prefill-blocked__title">Nothing is applied yet</p>
        <p className="prefill-note">
          The apply step is deliberately not wired in this change. Review these previews against your real data
          first; writing comes next, and will run one action at a time, stop at the first failure and report exactly
          what did and did not get through.
        </p>
      </div>
    </div>
  );
}
