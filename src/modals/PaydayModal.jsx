import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatPHP } from '../utils/currency.js';
import { getMonthKey, toISODateString } from '../utils/date.js';
import { generateId } from '../utils/id.js';
import { computePaydaySplit, PAYDAY_KINDS, SPLIT_FIELDS } from '../utils/plan/payday.js';
import { SegmentedControl } from '../components/shared/SegmentedControl.jsx';
import { BottomSheet } from './BottomSheet.jsx';

// One payday, applied as one transaction. The split is computed by the pure
// function in utils/plan/payday.js; this screen only shows it, lets the two
// incoming amounts be corrected, and hands the result to apply_payday.
export function PaydayModal() {
  const { state, dispatch, refetchAll, closeModal } = useApp();
  const { session } = useAuth();
  const settings = state.planSettings;

  const [kind, setKind] = useState(PAYDAY_KINDS.PAY);
  const [date, setDate] = useState(toISODateString());
  const [household, setHousehold] = useState(String(settings?.payHousehold ?? ''));
  const [hub, setHub] = useState(String(settings?.payHub ?? ''));
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');

  const hubAmount = hub === '' ? null : Number(hub);
  const householdAmount = household === '' ? 0 : Number(household);

  const split = useMemo(
    () => computePaydaySplit({ settings, goals: state.goals, kind, hubAmount }),
    [settings, state.goals, kind, hubAmount]
  );

  // Both BPI accounts are called "BPI Savings" — one each. Naming the owner is
  // the only way the two incoming lines can be told apart.
  const accountName = (id) => {
    const account = state.accounts.find((a) => a.id === id);
    if (!account) return 'an account';
    const sameName = state.accounts.filter((a) => a.name === account.name);
    if (sameName.length < 2) return account.name;
    const owner = state.profiles.find((p) => p.id === account.ownerId);
    return owner ? `${account.name} (${owner.displayName})` : account.name;
  };

  if (!settings || !settings.hubAccountId) {
    return (
      <BottomSheet title="Payday" onClose={closeModal}>
        <p className="prefill-note">
          Payday needs the plan set up first — at least the hub account and the split. Settings → Plan.
        </p>
      </BottomSheet>
    );
  }

  async function handleApply() {
    setError('');
    setApplying(true);

    const incomes = [];
    if (householdAmount > 0 && settings.householdAccountId) {
      incomes.push({
        id: generateId(),
        account_id: settings.householdAccountId,
        amount: householdAmount,
        source: kind === PAYDAY_KINDS.WINDFALL ? 'Windfall (household)' : 'Allotment',
      });
    }
    if (split.total > 0) {
      incomes.push({
        id: generateId(),
        account_id: settings.hubAccountId,
        amount: split.total,
        source: kind === PAYDAY_KINDS.WINDFALL ? 'Windfall' : 'Pay',
      });
    }

    const payload = {
      id: generateId(),
      date,
      budget_month_key: getMonthKey(state.month.year, state.month.monthIndex),
      kind,
      incomes,
      transfers: split.transfers.map((t) => ({
        id: generateId(),
        from_account_id: settings.hubAccountId,
        to_account_id: t.accountId,
        amount: t.amount,
        note: `Payday — ${t.goals.map((g) => g.goalName).join(', ')}`,
      })),
      goal_allocations: [...split.transfers.flatMap((t) => t.goals), ...split.allocations].map((g) => ({
        goal_id: g.goalId,
        amount: g.amount,
        label: g.goalName,
      })),
    };

    const outcome = await dispatch({ type: 'payday/apply', payload });
    if (outcome && outcome.ok === false) {
      setError(outcome.error?.message ?? 'Could not apply this payday.');
      setApplying(false);
      return;
    }
    await refetchAll();
    setApplying(false);
    closeModal();
  }

  const isWindfall = kind === PAYDAY_KINDS.WINDFALL;

  return (
    <BottomSheet title="Payday" onClose={closeModal}>
      <div className="prefill-step">
        <div className="form__field">
          <span className="form__label">Kind</span>
          <SegmentedControl
            value={kind}
            onChange={setKind}
            options={[
              { value: PAYDAY_KINDS.PAY, label: 'Pay' },
              { value: PAYDAY_KINDS.WINDFALL, label: 'Windfall' },
            ]}
          />
        </div>

        <label className="form__field">
          <span className="form__label">Date</span>
          <input type="date" className="form__input" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        {!isWindfall && (
          <label className="form__field">
            <span className="form__label">Into {accountName(settings.householdAccountId)} (₱)</span>
            <input
              type="number" inputMode="decimal" min="0" step="0.01" className="form__input"
              value={household} onChange={(e) => setHousehold(e.target.value)}
            />
            <span className="form__checkbox-hint">Household allotment. Not split; it lands and stays.</span>
          </label>
        )}

        <label className="form__field">
          <span className="form__label">Into {accountName(settings.hubAccountId)} (₱)</span>
          <input
            type="number" inputMode="decimal" min="0" step="0.01" className="form__input"
            value={hub} onChange={(e) => setHub(e.target.value)}
          />
          {!isWindfall && split && (
            <span className="form__checkbox-hint">
              Planned {formatPHP(split.plannedTotal)}.{' '}
              {split.difference === 0
                ? 'Matches the plan.'
                : `${split.difference > 0 ? 'Over' : 'Short'} by ${formatPHP(Math.abs(split.difference))}, absorbed by the goals line.`}
            </span>
          )}
        </label>

        {split && !isWindfall && (
          <>
            <h3 className="prefill-heading">The split</h3>
            <table className="prefill-table">
              <tbody>
                {SPLIT_FIELDS.map(({ key, label }) => (
                  <tr key={key}>
                    <td>
                      {label}
                      {key === 'splitGoals' && <span className="prefill-table__muted"> · absorbs the difference</span>}
                      {key === 'splitVacationReserve' && split.presignoff.applied && (
                        <span className="prefill-table__muted"> · pre-sign-off rule</span>
                      )}
                    </td>
                    <td className={`prefill-table__num${key === 'splitGoals' && split.belowZero ? ' prefill-down' : ''}`}>
                      {formatPHP(split.lines[key] ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {split && (split.transfers.length > 0 || split.allocations.length > 0) && (
          <>
            <h3 className="prefill-heading">Where it goes</h3>
            <table className="prefill-table">
              <tbody>
                {split.transfers.map((t) => (
                  <tr key={t.accountId}>
                    <td>
                      Transfer to {accountName(t.accountId)}
                      <span className="prefill-table__muted"> · {t.goals.map((g) => g.goalName).join(', ')}</span>
                    </td>
                    <td className="prefill-table__num">{formatPHP(t.amount)}</td>
                  </tr>
                ))}
                {split.allocations.map((a) => (
                  <tr key={a.goalId}>
                    <td>
                      {a.goalName}
                      <span className={a.unconfigured ? 'prefill-down' : 'prefill-table__muted'}>
                        {a.unconfigured ? ' · no account set — money stays in the hub' : ' · stays in the hub'}
                      </span>
                    </td>
                    <td className="prefill-table__num">{formatPHP(a.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {split?.allocations.some((a) => a.unconfigured) && (
          <p className="form__error">
            Some goals have no account set, so their share would sit in the hub instead of moving anywhere. Set
            &ldquo;Held in&rdquo; on those goals first, or apply this knowing the money stays put.
          </p>
        )}
        {split?.unrouted > 0 && (
          <p className="form__error">
            {formatPHP(split.unrouted)} has nowhere to go — every goal it could fund is already at target. Raise a
            target or add a goal before applying, or it will sit unallocated in the hub.
          </p>
        )}
        {split?.belowZero && (
          <p className="form__error">
            The goals line is below zero: the shortfall is larger than it can absorb. Another line has to give.
          </p>
        )}
        {error && <p className="form__error">{error}</p>}

        <button type="button" className="btn-block" disabled={applying || !split || split.belowZero} onClick={handleApply}>
          {applying ? 'Applying…' : 'Apply payday'}
        </button>
        <p className="prefill-note">
          Applied as one transaction: if any part fails, none of it is recorded. Logged by{' '}
          {state.profiles.find((p) => p.id === session?.user?.id)?.displayName ?? 'you'}.
        </p>
      </div>
    </BottomSheet>
  );
}
