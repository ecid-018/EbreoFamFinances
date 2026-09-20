import { useMemo } from 'react';
import { formatPHP } from '../../utils/currency.js';
import { groupByOrder } from '../../utils/group.js';
import { addMonths, getCurrentMonth, getMonthKey, getMonthName } from '../../utils/date.js';
import { OVERLAP_GROUPS, OVERLAP_CHOICE } from '../../utils/plan/prefill.js';

// Household spending only. Goals, sinking funds, retirement and trading are
// deliberately NOT turned into envelopes here — they are goals and split lines,
// and duplicating them as envelopes would double-count the same money.

const MONTH_CHOICES = 6;

export function EnvelopesStep({
  plan,
  envelopes,
  groupNames,
  mappings,
  onMappingChange,
  proposed,
  onProposedChange,
  overlapChoices,
  onOverlapChange,
  targetMonth,
  targetMonthLabel,
  onTargetMonthChange,
}) {
  // Only months from the current one forward: writing a budget for a month that
  // has closed would carry forward into every later month without one of its
  // own, rewriting exactly the history month-scoped budgets exist to protect.
  const monthOptions = useMemo(() => {
    const start = getCurrentMonth();
    return Array.from({ length: MONTH_CHOICES }, (_, i) => addMonths(start, i));
  }, []);

  const currentTotal = envelopes.reduce((sum, env) => sum + env.monthlyBudget, 0);
  const proposedTotal = envelopes.reduce(
    (sum, env) => sum + (proposed[env.id] ?? env.monthlyBudget),
    0
  );
  const householdPay = Number(plan.pay.household) || 0;
  const leftToAssign = householdPay - proposedTotal;

  const overlapEnvelopes = envelopes.filter((env) => OVERLAP_GROUPS.includes(env.group));
  const touched = envelopes.filter((env) => proposed[env.id] !== undefined);
  const groups = groupByOrder(touched, (env) => env.group);

  return (
    <div className="prefill-step">
      <label className="form__field">
        <span className="form__label">Apply these budgets to</span>
        <select
          className="form__input"
          value={getMonthKey(targetMonth.year, targetMonth.monthIndex)}
          onChange={(e) => {
            const [year, month] = e.target.value.split('-').map(Number);
            onTargetMonthChange({ year, monthIndex: month - 1 });
          }}
        >
          {monthOptions.map((m) => (
            <option key={getMonthKey(m.year, m.monthIndex)} value={getMonthKey(m.year, m.monthIndex)}>
              {getMonthName(m.year, m.monthIndex)} {m.year}
            </option>
          ))}
        </select>
        <span className="form__checkbox-hint">
          Earlier months keep their own budgets. Months after this one inherit it until they get budgets of their own.
        </span>
      </label>

      <h3 className="prefill-heading">Map each spending line</h3>
      <p className="prefill-note">
        A line with no confident name match is left blank on purpose — pick where it belongs rather than trusting a
        guess. Mapping to a group spreads its target across that group&apos;s envelopes in proportion to what they
        are budgeted now.
      </p>

      <table className="prefill-table">
        <thead>
          <tr>
            <th>Line</th>
            <th className="prefill-table__num">At sea</th>
            <th className="prefill-table__num prefill-table__muted">On vacation</th>
            <th>Maps to</th>
          </tr>
        </thead>
        <tbody>
          {plan.household_targets.map((target) => {
            const mapping = mappings[target.label];
            const value = mapping ? `${mapping.kind}:${mapping.id}` : '';
            return (
              <tr key={target.label}>
                <td>{target.label}</td>
                <td className="prefill-table__num">{formatPHP(target.sea)}</td>
                {/* Reference only. Vacation months get their own budgets once
                    the household sets them; this tool writes the sea figures. */}
                <td className="prefill-table__num prefill-table__muted">
                  {target.vacation === undefined ? '—' : formatPHP(target.vacation)}
                </td>
                <td>
                  <select
                    className="form__input"
                    value={value}
                    onChange={(e) => {
                      if (!e.target.value) return onMappingChange(target.label, null);
                      const [kind, ...rest] = e.target.value.split(':');
                      onMappingChange(target.label, { kind, id: rest.join(':') });
                    }}
                  >
                    <option value="">Not mapped — leave alone</option>
                    <optgroup label="Groups">
                      {groupNames.map((group) => (
                        <option key={group} value={`group:${group}`}>
                          {group}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Envelopes">
                      {envelopes.map((env) => (
                        <option key={env.id} value={`envelope:${env.id}`}>
                          {env.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h3 className="prefill-heading">Proposed budgets for {targetMonthLabel}</h3>
      {!touched.length && <p className="prefill-note">Nothing is mapped yet, so no budget would change.</p>}

      {groups.map(({ group, items }) => (
        <div key={group}>
          <div className="allocate-group-title">{group}</div>
          <table className="prefill-table">
            <thead>
              <tr>
                <th>Envelope</th>
                <th className="prefill-table__num">Current</th>
                <th className="prefill-table__num">Proposed</th>
                <th className="prefill-table__num">Difference</th>
              </tr>
            </thead>
            <tbody>
              {items.map((env) => {
                const next = proposed[env.id] ?? env.monthlyBudget;
                const diff = next - env.monthlyBudget;
                return (
                  <tr key={env.id}>
                    <td>{env.name}</td>
                    <td className="prefill-table__num">{formatPHP(env.monthlyBudget)}</td>
                    <td className="prefill-table__num">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        className="form__input prefill-table__input"
                        value={next}
                        onChange={(e) => onProposedChange(env.id, Number(e.target.value))}
                        aria-label={`Proposed budget for ${env.name}`}
                      />
                    </td>
                    <td
                      className={`prefill-table__num${diff === 0 ? '' : diff > 0 ? ' prefill-up' : ' prefill-down'}`}
                    >
                      {diff === 0 ? '—' : `${diff > 0 ? '+' : ''}${formatPHP(diff)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      <div className="prefill-totals">
        <div className="prefill-totals__row">
          <span>Current total (all envelopes)</span>
          <span>{formatPHP(currentTotal)}</span>
        </div>
        <div className="prefill-totals__row">
          <span>Proposed total</span>
          <span>{formatPHP(proposedTotal)}</span>
        </div>
        <div className="prefill-totals__row">
          <span>Household pay from the file</span>
          <span>{formatPHP(householdPay)}</span>
        </div>
        <div className="prefill-totals__row prefill-totals__row--total">
          <span>{leftToAssign < 0 ? 'Over household pay by' : 'Left to assign'}</span>
          <span className={leftToAssign < 0 ? 'prefill-down' : undefined}>{formatPHP(Math.abs(leftToAssign))}</span>
        </div>
      </div>

      {overlapEnvelopes.length > 0 && (
        <>
          <h3 className="prefill-heading">These overlap with goals and split lines</h3>
          <p className="prefill-note">
            Envelopes in {OVERLAP_GROUPS.join(', ')} mirror money the plan already handles as goals, insurance or
            trading. Budgeting them here as household spending would count the same money twice. Left untouched
            unless you say otherwise.
          </p>
          <table className="prefill-table">
            <thead>
              <tr>
                <th>Envelope</th>
                <th className="prefill-table__num">Current</th>
                <th>What to do</th>
              </tr>
            </thead>
            <tbody>
              {overlapEnvelopes.map((env) => (
                <tr key={env.id}>
                  <td>
                    {env.name}
                    <span className="prefill-table__muted"> · {env.group}</span>
                  </td>
                  <td className="prefill-table__num">{formatPHP(env.monthlyBudget)}</td>
                  <td>
                    <select
                      className="form__input"
                      value={overlapChoices[env.id] ?? OVERLAP_CHOICE.UNTOUCHED}
                      onChange={(e) => onOverlapChange(env.id, e.target.value)}
                      aria-label={`What to do with ${env.name}`}
                    >
                      <option value={OVERLAP_CHOICE.UNTOUCHED}>Leave untouched</option>
                      <option value={OVERLAP_CHOICE.KEEP}>Keep as household spending</option>
                      <option value={OVERLAP_CHOICE.ZERO}>Set to zero</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
