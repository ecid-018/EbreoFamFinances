import { useMemo, useState } from 'react';
import { formatPHP } from '../../utils/currency.js';
import { buildApplySteps, summariseSteps } from '../../utils/plan/prefill.js';
import { ConfirmDialog } from '../shared/ConfirmDialog.jsx';

// The confirm-and-apply step. Everything is applied through the app's own
// actions, so each change is validated and logged in the ledger exactly as a
// manual edit would be — nothing here talks to the database directly.
export function SummaryStep({
  plan,
  envelopes,
  proposed,
  overlapChoices,
  goals,
  goalTargets,
  targetMonthKey,
  targetMonthLabel,
  applying,
  progress,
  result,
  onApply,
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const steps = useMemo(
    () =>
      buildApplySteps({
        plan,
        envelopes,
        proposed,
        overlapChoices,
        goals,
        goalTargets,
        monthKey: targetMonthKey,
      }),
    [plan, envelopes, proposed, overlapChoices, goals, goalTargets, targetMonthKey]
  );
  const counts = summariseSteps(steps);

  const budgetSteps = steps.filter((step) => step.kind === 'budget' || step.kind === 'zero');
  const byId = new Map(envelopes.map((envelope) => [envelope.id, envelope]));

  return (
    <div className="prefill-step">
      <h3 className="prefill-heading">{result ? 'What was applied' : 'What would be applied'}</h3>

      <ul className="prefill-summary">
        <li>
          <strong>{counts.budgets}</strong> envelope {counts.budgets === 1 ? 'budget' : 'budgets'} changed for{' '}
          {targetMonthLabel}
          <span className="prefill-table__muted"> ({targetMonthKey})</span>
        </li>
        {counts.zeroed > 0 && (
          <li>
            <strong>{counts.zeroed}</strong> overlapping {counts.zeroed === 1 ? 'envelope' : 'envelopes'} set to zero
          </li>
        )}
        <li>
          <strong>{counts.goalsCreated}</strong> {counts.goalsCreated === 1 ? 'goal' : 'goals'} created
        </li>
        <li>
          <strong>{counts.goalsUpdated}</strong> goal {counts.goalsUpdated === 1 ? 'target' : 'targets'} changed
        </li>
      </ul>

      <p className="prefill-note">
        Earlier months are not affected: budgets are written as rows for {targetMonthLabel} only, and every month
        before it keeps the figures it already has. Nothing changes a goal&apos;s saved amount, and no envelope is
        ever deleted — deleting one would strip the category from its past transactions.
      </p>

      {!result && budgetSteps.length > 0 && (
        <table className="prefill-table">
          <thead>
            <tr>
              <th>Envelope</th>
              <th className="prefill-table__num">Current</th>
              <th className="prefill-table__num">{targetMonthLabel}</th>
            </tr>
          </thead>
          <tbody>
            {budgetSteps.map((step) => {
              const envelope = byId.get(step.action.payload.envelopeId);
              return (
                <tr key={step.action.payload.envelopeId}>
                  <td>{envelope.name}</td>
                  <td className="prefill-table__num">{formatPHP(envelope.monthlyBudget)}</td>
                  <td className="prefill-table__num">{formatPHP(step.action.payload.amount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {applying && (
        <div className="prefill-blocked">
          <p className="prefill-blocked__title">
            Applying… {progress.done} of {progress.total}
          </p>
          <p className="prefill-note">One change at a time. Leave this open until it finishes.</p>
        </div>
      )}

      {result && (
        <div className={`prefill-result${result.ok ? '' : ' prefill-result--failed'}`}>
          <p className="prefill-blocked__title">
            {result.ok
              ? `Applied all ${result.applied.length}. Everything went through.`
              : `Stopped after ${result.applied.length} of ${result.applied.length + result.remaining.length + 1}.`}
          </p>

          {!result.ok && (
            <>
              <p className="form__error">
                Failed on: {result.failed.step.label} — {result.failed.message}
              </p>
              <p className="prefill-note">
                {result.applied.length === 0
                  ? 'It failed on the very first change, so nothing was applied at all — everything is exactly as it was.'
                  : 'Everything before it was applied and is saved. Nothing after it was attempted, so the rest is exactly as it was.'}{' '}
                Fixing the cause and running the prefill again will pick up only what is still outstanding.
              </p>
              {result.remaining.length > 0 && (
                <>
                  <p className="prefill-note">
                    <strong>Not attempted ({result.remaining.length}):</strong>
                  </p>
                  <ul className="prefill-list">
                    {result.remaining.map((step) => (
                      <li key={step.label}>{step.label}</li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}

          {result.applied.length > 0 && (
            <>
              <p className="prefill-note">
                <strong>Applied ({result.applied.length}):</strong>
              </p>
              <ul className="prefill-list">
                {result.applied.map((step) => (
                  <li key={step.label}>{step.label}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {!result && (
        <button
          type="button"
          className="btn-block"
          disabled={applying || counts.total === 0}
          onClick={() => setConfirmOpen(true)}
        >
          {counts.total === 0 ? 'Nothing to apply' : `Apply ${counts.total} ${counts.total === 1 ? 'change' : 'changes'}`}
        </button>
      )}

      {confirmOpen && (
        <ConfirmDialog
          title={`Apply ${counts.total} ${counts.total === 1 ? 'change' : 'changes'}?`}
          message={`${counts.budgets} envelope budgets for ${targetMonthLabel}, ${counts.goalsCreated} goals created, ${counts.goalsUpdated} goal targets changed. Earlier months and every saved amount stay as they are.`}
          confirmLabel="Apply"
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false);
            onApply(steps);
          }}
        />
      )}
    </div>
  );
}
