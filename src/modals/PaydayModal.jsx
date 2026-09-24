import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatPHP } from '../utils/currency.js';
import { getMonthKey, toISODateString } from '../utils/date.js';
import { generateId } from '../utils/id.js';
import { computePaydaySplit, getExpectedLanding, PAYDAY_KINDS, SPLIT_FIELDS } from '../utils/plan/payday.js';

const SOURCE_LABEL = {
  [PAYDAY_KINDS.PAY]: 'Pay',
  [PAYDAY_KINDS.WINDFALL]: 'Windfall',
  [PAYDAY_KINDS.SIGNOFF]: 'Sign-off pay',
};
import { SegmentedControl } from '../components/shared/SegmentedControl.jsx';
import { BottomSheet } from './BottomSheet.jsx';

// One payday, applied as one transaction. The split is computed by the pure
// function in utils/plan/payday.js; this screen only shows it, lets the two
// incoming amounts be corrected, and hands the result to apply_payday.
const round2 = (n) => Math.round(n * 100) / 100;

export function PaydayModal() {
  const { state, dispatch, refetchAll, closeModal } = useApp();
  const { session } = useAuth();
  const settings = state.planSettings;

  const [kind, setKind] = useState(PAYDAY_KINDS.PAY);
  const [date, setDate] = useState(toISODateString());
  // Prefilled with what each account is expected to RECEIVE, derived from the
  // lines it funds. pay_household is the spending allowance and pay_hub is the
  // total split across both accounts — neither is a landing figure, and using
  // them here put the larger sum in the wrong account.
  const [household, setHousehold] = useState(() =>
    String(getExpectedLanding(settings?.householdAccountId, settings, state.splitLineSources) || '')
  );
  const [hub, setHub] = useState(() =>
    String(getExpectedLanding(settings?.hubAccountId, settings, state.splitLineSources) || '')
  );
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');

  const hubAmount = hub === '' ? null : Number(hub);
  const householdAmount = household === '' ? 0 : Number(household);

  // Since split_line_sources, several accounts fund the plan. What gets split
  // is what arrives in the hub, plus whatever is left in the household account
  // once the household's own spending money is set aside. Those are different
  // numbers and conflating them is how the hub looked ~170k short.
  const householdSurplus = Math.max(0, householdAmount - (settings?.payHousehold ?? 0));
  const amountToSplit = hubAmount == null && household === '' ? null : round2((hubAmount ?? 0) + householdSurplus);

  const split = useMemo(
    () => computePaydaySplit({ settings, goals: state.goals, kind, amountToSplit, sources: state.splitLineSources }),
    [settings, state.goals, kind, amountToSplit, state.splitLineSources]
  );

  // Each source account can only supply what actually arrived in it, less any
  // household spending money that must stay behind.
  const availableBySource = {};
  if (settings) {
    availableBySource[settings.hubAccountId] = hubAmount ?? 0;
    if (settings.householdAccountId) availableBySource[settings.householdAccountId] = householdSurplus;
  }
  const shortfalls = Object.entries(split?.bySource ?? {})
    .filter(([id, needed]) => id !== 'none' && needed > (availableBySource[id] ?? 0) + 0.005)
    .map(([id, needed]) => ({ id, needed, available: availableBySource[id] ?? 0 }));

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
      <BottomSheet title="Payday" onClose={closeModal} fullScreen>
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
    if ((hubAmount ?? 0) > 0) {
      incomes.push({
        id: generateId(),
        account_id: settings.hubAccountId,
        // What actually landed in the hub, not the total being split — the
        // rest of that total is already sitting in the household account.
        amount: hubAmount,
        source: SOURCE_LABEL[kind] ?? 'Pay',
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
        // Each line is paid from its own source account, which is not always
        // the hub — see split_line_sources.
        from_account_id: t.sourceAccountId ?? settings.hubAccountId,
        to_account_id: t.accountId,
        amount: t.amount,
        note: `Payday — ${t.items.map((i) => i.label).join(', ')}`,
      })),
      // Only items that actually point at a goal. Retirement and trading move
      // to an account and have no goal to credit.
      goal_allocations: [...split.transfers.flatMap((t) => t.items), ...split.allocations]
        .filter((i) => i.goalId)
        .map((i) => ({
          goal_id: i.goalId,
          amount: i.amount,
          label: i.label,
          // The RPC balances every account, so an allocation has to say which
          // one it is funded from even though no money moves.
          source_account_id: i.sourceAccountId ?? settings.hubAccountId,
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

  const isSignoff = kind === PAYDAY_KINDS.SIGNOFF;
  // Only an ordinary payday is split against the plan. A windfall and a
  // sign-off each work out their own two lines, so the household field, the
  // plan comparison and the split table belong to neither.
  const isPlanSplit = kind === PAYDAY_KINDS.PAY;

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
              { value: PAYDAY_KINDS.SIGNOFF, label: 'Sign-off' },
            ]}
          />
        </div>

        <label className="form__field">
          <span className="form__label">Date</span>
          <input type="date" className="form__input" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        {isPlanSplit && (
          <label className="form__field">
            <span className="form__label">Into {accountName(settings.householdAccountId)} (₱)</span>
            <input
              type="number" inputMode="decimal" min="0" step="0.01" className="form__input"
              value={household} onChange={(e) => setHousehold(e.target.value)}
            />
            <span className="form__checkbox-hint">
              What actually landed here. {formatPHP(settings.payHousehold ?? 0)} stays for household spending; anything
              above that is available to the lines this account funds.
            </span>
          </label>
        )}

        <label className="form__field">
          <span className="form__label">Into {accountName(settings.hubAccountId)} (₱)</span>
          <input
            type="number" inputMode="decimal" min="0" step="0.01" className="form__input"
            value={hub} onChange={(e) => setHub(e.target.value)}
          />
          {isPlanSplit && split && (
            <span className="form__checkbox-hint">
              Total to split {formatPHP(amountToSplit ?? 0)} against a plan of {formatPHP(split.plannedTotal)}.{' '}
              {split.difference === 0
                ? 'Matches the plan.'
                : `${split.difference > 0 ? 'Over' : 'Short'} by ${formatPHP(Math.abs(split.difference))}, absorbed by the goals line.`}
            </span>
          )}
        </label>

        {split && isSignoff && (
          <span className="form__checkbox-hint">
            {split.reserve.unconfigured
              ? 'No vacation reserve or target is set, so all of this follows goal priority. Set them in Settings if the reserve should be filled first.'
              : split.reserve.alreadyFull
                ? 'The vacation reserve is already at target, so all of this follows goal priority.'
                : `${formatPHP(split.reserve.toReserve)} tops up the vacation reserve first${
                    split.reserve.stillShort > 0
                      ? `, leaving it ${formatPHP(split.reserve.stillShort)} short`
                      : ', which reaches its target'
                  }. The remaining ${formatPHP(split.reserve.remainder)} follows goal priority.`}
          </span>
        )}

        {split && isPlanSplit && (
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
                      {accountName(t.sourceAccountId)} → {accountName(t.accountId)}
                      <span className="prefill-table__muted"> · {t.items.map((i) => i.label).join(', ')}</span>
                    </td>
                    <td className="prefill-table__num">{formatPHP(t.amount)}</td>
                  </tr>
                ))}
                {split.allocations.map((a) => (
                  <tr key={a.line + (a.goalId ?? '')}>
                    <td>
                      {a.label}
                      <span className={a.unconfigured ? 'prefill-down' : 'prefill-table__muted'}>
                        {a.unconfigured ? ' · no destination set — money stays in the hub' : ' · stays in the hub'}
                      </span>
                    </td>
                    <td className="prefill-table__num">{formatPHP(a.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {split?.bySource && Object.keys(split.bySource).length > 1 && (
          <>
            <h3 className="prefill-heading">What each account supplies</h3>
            <table className="prefill-table">
              <tbody>
                {Object.entries(split.bySource).map(([id, amount]) => (
                  <tr key={id}>
                    <td>{id === 'none' ? 'No source set' : accountName(id)}</td>
                    <td className="prefill-table__num">{formatPHP(amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="prefill-note">
              Each account must have at least this much available, or the payday is rejected before anything is
              written.
            </p>
            {shortfalls.map((sf) => (
              <p key={sf.id} className="form__error">
                {accountName(sf.id)} needs {formatPHP(sf.needed)} but only {formatPHP(sf.available)} is available.
              </p>
            ))}
          </>
        )}

        {split?.allocations.some((a) => a.unconfigured) && (
          <p className="form__error">
            Some lines have no destination set, so their share would sit in the hub instead of moving anywhere. Set
            &ldquo;Held in&rdquo; on those goals, or the missing account in Settings → Plan, or apply this knowing
            the money stays put.
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

        <button type="button" className="btn-block" disabled={applying || !split || split.belowZero || shortfalls.length > 0} onClick={handleApply}>
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
