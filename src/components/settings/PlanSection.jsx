import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { formatPHP } from '../../utils/currency.js';
import { getActiveAccounts } from '../../utils/accounts.js';
import { SPLIT_FIELDS, getSplitTotal, getSplitRemainder, isSplitBalanced } from '../../utils/plan/settings.js';

const MONEY_FIELDS = [
  { key: 'payHousehold', label: 'Household pay' },
  { key: 'payHub', label: 'Hub pay' },
];

const TARGET_FIELDS = [
  { key: 'bankFloorTarget', label: 'Bank floor target' },
  { key: 'vacationReserveTarget', label: 'Vacation reserve target' },
  { key: 'tradingCapAnnual', label: 'Trading cap (annual)' },
  { key: 'tripsAnnual', label: 'Trips (annual)' },
  { key: 'insuranceAnnual', label: 'Insurance (annual)' },
];

const ACCOUNT_POINTERS = [
  { key: 'householdAccountId', label: 'Household account' },
  { key: 'hubAccountId', label: 'Hub account' },
  { key: 'tradingAccountId', label: 'Trading account' },
  { key: 'retirementAccountId', label: 'Retirement account' },
  { key: 'tradingTaxAccountId', label: 'Trading tax and reserve' },
];

const GOAL_POINTERS = [
  { key: 'vacationGoalId', label: 'Vacation fund' },
  { key: 'insuranceGoalId', label: 'Insurance fund' },
  { key: 'tripsGoalId', label: 'Trips fund' },
  { key: 'carGoalId', label: 'Car fund' },
];

// Empty string in a numeric input means "not decided yet", which must round
// trip as null rather than 0 — a zero here would read as a deliberate figure.
function toNumberOrNull(value) {
  if (value === '' || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toInput(value) {
  return value == null ? '' : String(value);
}

export function PlanSection() {
  const { state, dispatch } = useApp();
  const { planSettings, goals } = state;
  const accounts = getActiveAccounts(state.accounts);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(planSettings ?? {});
  const [saved, setSaved] = useState(false);

  // The table arrives with a migration the household applies by hand, so this
  // is a real state rather than an error: say so plainly instead of rendering
  // a form that cannot save.
  if (planSettings === null) {
    return (
      <div className="ios-group">
        <div className="ios-group__header">
          <span className="ios-group__title">Plan</span>
        </div>
        <div className="ios-card">
          <div className="ios-row-wrap list-row">
            <span className="list-row__meta">
              Plan settings aren&rsquo;t set up yet. Once the plan migration is applied, your pay
              figures, splits and targets can be entered here.
            </span>
          </div>
        </div>
      </div>
    );
  }

  const splitTotal = getSplitTotal(draft);
  const remainder = getSplitRemainder(draft);
  const balanced = isSplitBalanced(draft);

  function setField(key, value) {
    setDraft((d) => ({ ...d, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    dispatch({ type: 'planSettings/update', payload: draft });
    setSaved(true);
  }

  function moneyInput({ key, label }) {
    return (
      <label className="form__field" key={key}>
        <span className="form__label">{label} (₱)</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          className="form__input"
          value={toInput(draft[key])}
          onChange={(e) => setField(key, toNumberOrNull(e.target.value))}
          placeholder="Not set"
        />
      </label>
    );
  }

  function pickerInput({ key, label }, options, emptyLabel) {
    return (
      <label className="form__field" key={key}>
        <span className="form__label">{label}</span>
        <select
          className="form__input"
          value={draft[key] ?? ''}
          onChange={(e) => setField(key, e.target.value || null)}
        >
          <option value="">{emptyLabel}</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div className="ios-group">
      <div className="ios-group__header">
        <span className="ios-group__title">Plan</span>
      </div>
      <div className="ios-card">
        <button type="button" className="ios-row-wrap list-row" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <div className="list-row__main">
            <span className="list-row__title">Pay, splits and targets</span>
            <span className="list-row__meta">
              {draft.payHub == null
                ? 'Not set up yet'
                : balanced
                  ? 'Splits balanced'
                  : `${formatPHP(Math.abs(remainder))} ${remainder > 0 ? 'left to assign' : 'over'}`}
            </span>
          </div>
        </button>

        {open && (
          <div className="plan-settings">
            <div className="plan-settings__group">Incoming</div>
            {MONEY_FIELDS.map(moneyInput)}

            <div className="plan-settings__group">Split of hub pay</div>
            {SPLIT_FIELDS.map(moneyInput)}
            <div className={`plan-settings__status ${balanced ? 'plan-settings__status--ok' : ''}`.trim()}>
              {draft.payHub == null ? (
                <>Enter hub pay to check the split adds up.</>
              ) : balanced ? (
                <>Splits add up to hub pay ✓</>
              ) : remainder > 0 ? (
                <>
                  {formatPHP(remainder)} left to assign — split total {formatPHP(splitTotal)}
                </>
              ) : (
                <>
                  {formatPHP(-remainder)} over hub pay — split total {formatPHP(splitTotal)}
                </>
              )}
            </div>

            <div className="plan-settings__group">Targets and caps</div>
            {TARGET_FIELDS.map(moneyInput)}
            <label className="form__field">
              <span className="form__label">Windfall to goals (%)</span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max="100"
                step="1"
                className="form__input"
                value={toInput(draft.windfallGoalsPct)}
                onChange={(e) => setField('windfallGoalsPct', toNumberOrNull(e.target.value))}
                placeholder="Not set"
              />
            </label>

            <div className="plan-settings__group">Pre-sign-off rule</div>
            <label className="form__field form__checkbox">
              <input
                type="checkbox"
                checked={draft.presignoffActive ?? false}
                onChange={(e) => setField('presignoffActive', e.target.checked)}
              />
              <span>
                Hold the vacation line until the reserve is funded
                <span className="form__checkbox-hint">
                  While the vacation fund is below its target, it gets the fixed amount below and the
                  difference goes to goals. Lapses on its own once the target is reached.
                </span>
              </span>
            </label>
            {draft.presignoffActive && moneyInput({ key: 'presignoffVacationAmount', label: 'Held vacation amount' })}

            {/* Hidden until 0011 is applied. The field cannot be saved before
                the column exists, and an input that silently fails is worse
                than one that is not there yet. */}
            {planSettings.targetAshoreYear !== undefined && (
              <>
                <div className="plan-settings__group">Going ashore</div>
                <label className="form__field">
                  <span className="form__label">Target year ashore</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="2000"
                    max="2100"
                    step="1"
                    className="form__input"
                    value={toInput(draft.targetAshoreYear)}
                    onChange={(e) => setField('targetAshoreYear', toNumberOrNull(e.target.value))}
                    placeholder="Not set"
                  />
                </label>
              </>
            )}

            <div className="plan-settings__group">Which account is which</div>
            {/* A pointer whose column has not been migrated yet reads as
                undefined. Showing it would offer a field that cannot be
                saved, so it waits until the migration lands. */}
            {ACCOUNT_POINTERS.filter((f) => planSettings[f.key] !== undefined).map((f) =>
              pickerInput(f, accounts, 'Not set')
            )}

            <div className="plan-settings__group">Which goal is which</div>
            {GOAL_POINTERS.filter((f) => planSettings[f.key] !== undefined).map((f) =>
              pickerInput(f, goals, 'Not set')
            )}

            <button type="button" className="btn-block" onClick={handleSave}>
              {saved ? 'Saved ✓' : 'Save Plan Settings'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
