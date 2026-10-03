import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { formatPHP } from '../../utils/currency.js';
import { getActiveAccounts } from '../../utils/accounts.js';
import { SPLIT_FIELDS } from '../../utils/plan/settings.js';
import { getLineItems, getItemsTotal, hasItems } from '../../utils/plan/splitItems.js';

// Breaks a split line into the named parts it is actually made of.
//
// A line left alone here keeps the behaviour it has always had: one source
// account, and for goals the priority waterfall. Itemising a line replaces
// both, which the screen says before anything is saved.

function blankItem() {
  return { label: '', amount: '', fromAccountId: '', toAccountId: '', goalId: '' };
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function LineEditor({ accounts, goals, items, planned, onSave, onCancel }) {
  const [draft, setDraft] = useState(() =>
    items.length
      ? items.map((i) => ({
          label: i.label,
          amount: String(i.amount),
          fromAccountId: i.fromAccountId ?? '',
          toAccountId: i.toAccountId ?? '',
          goalId: i.goalId ?? '',
        }))
      : [blankItem()]
  );
  const [error, setError] = useState('');

  const total = draft.reduce((sum, d) => sum + toNumber(d.amount), 0);
  const difference = Math.round((total - (planned ?? 0)) * 100) / 100;

  function set(index, key, value) {
    setDraft((d) => d.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
    setError('');
  }

  function handleSave() {
    const cleaned = draft
      .map((d) => ({
        label: d.label.trim(),
        amount: toNumber(d.amount),
        fromAccountId: d.fromAccountId || null,
        toAccountId: d.goalId ? null : d.toAccountId || null,
        goalId: d.goalId || null,
      }))
      .filter((d) => d.label || d.amount > 0);

    if (cleaned.some((d) => !d.label)) {
      setError('Every part needs a name — it is what the payday screen and the ledger will call it.');
      return;
    }
    onSave(cleaned);
  }

  return (
    <div className="plan-settings">
      {draft.map((row, index) => (
        <div className="split-item" key={index}>
          <div className="split-item__row">
            <input
              type="text"
              className="form__input"
              value={row.label}
              onChange={(e) => set(index, 'label', e.target.value)}
              placeholder="What this part is for"
            />
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              className="form__input split-item__amount"
              value={row.amount}
              onChange={(e) => set(index, 'amount', e.target.value)}
              placeholder="0"
            />
          </div>
          {/* One per row: "From Test Mum BPI" and "To goal: Test Baby fund"
              both truncate to uselessness side by side at 390px. */}
          <div className="split-item__row">
            <select
              className="form__input"
              value={row.fromAccountId}
              onChange={(e) => set(index, 'fromAccountId', e.target.value)}
            >
              <option value="">Paid from — the line’s usual account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  From {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="split-item__row">
            <select
              className="form__input"
              value={row.goalId ? `goal:${row.goalId}` : row.toAccountId ? `acct:${row.toAccountId}` : ''}
              onChange={(e) => {
                const [kind, id] = e.target.value.split(':');
                set(index, 'goalId', kind === 'goal' ? id : '');
                set(index, 'toAccountId', kind === 'acct' ? id : '');
              }}
            >
              <option value="">Stays where it is</option>
              {goals.map((g) => (
                <option key={g.id} value={`goal:${g.id}`}>
                  To goal: {g.name}
                </option>
              ))}
              {accounts.map((a) => (
                <option key={a.id} value={`acct:${a.id}`}>
                  To account: {a.name}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="checklist__skip-btn" onClick={() => setDraft((d) => d.filter((_, i) => i !== index))}>
            Remove this part
          </button>
        </div>
      ))}

      <button type="button" className="ios-row-wrap list-row-plain" onClick={() => setDraft((d) => [...d, blankItem()])}>
        + Add a part
      </button>

      <div className={`plan-settings__status ${difference === 0 ? 'plan-settings__status--ok' : ''}`.trim()}>
        {difference === 0
          ? `Adds up to the ${formatPHP(planned ?? 0)} this line is set to ✓`
          : `${formatPHP(Math.abs(difference))} ${difference > 0 ? 'more than' : 'short of'} the ${formatPHP(planned ?? 0)} this line is set to`}
      </div>

      {error && <p className="form__error">{error}</p>}

      <button type="button" className="btn-block" onClick={handleSave}>
        Save these parts
      </button>
      <button type="button" className="checklist__skip-btn" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}

export function SplitItemsSection() {
  const { state, dispatch, refetchAll } = useApp();
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const accounts = getActiveAccounts(state.accounts);
  const settings = state.planSettings;
  const items = state.splitLineItems;

  // The table arrives with a migration applied by hand, so an empty list is a
  // real state rather than an error.
  if (!settings) return null;

  const accountName = (id) => state.accounts.find((a) => a.id === id)?.name ?? null;
  const goalName = (id) => state.goals.find((g) => g.id === id)?.name ?? null;

  async function save(lineKey, nextItems) {
    setBusy(true);
    await dispatch({ type: 'splitLineItems/save', payload: { lineKey, items: nextItems } });
    await refetchAll();
    setBusy(false);
    setEditing(null);
  }

  return (
    <div className="ios-group">
      <div className="ios-group__header">
        <span className="ios-group__title">How each split line is made up</span>
      </div>
      <div className="ios-card">
        {SPLIT_FIELDS.map((field) => {
          const lineItems = getLineItems(items, field.key);
          const itemised = hasItems(items, field.key);
          const planned = settings[field.key] ?? 0;
          const total = getItemsTotal(items, field.key);
          const off = itemised && Math.abs(total - planned) >= 0.005;

          if (editing === field.key) {
            return (
              <div className="ios-row-wrap" key={field.key}>
                <div className="list-row__title" style={{ padding: '11px 16px 0' }}>{field.label}</div>
                <LineEditor
                  accounts={accounts}
                  goals={state.goals}
                  items={lineItems}
                  planned={planned}
                  onSave={(next) => save(field.key, next)}
                  onCancel={() => setEditing(null)}
                />
              </div>
            );
          }

          return (
            <button
              type="button"
              className="ios-row-wrap list-row"
              key={field.key}
              disabled={busy}
              onClick={() => setEditing(field.key)}
            >
              <div className="list-row__main">
                <span className="list-row__title">{field.label}</span>
                <span className={`list-row__meta ${off ? 'plan-meta--late' : ''}`.trim()}>
                  {!itemised
                    ? field.key === 'splitGoals'
                      ? 'Not broken up — goes to goals in priority order'
                      : 'Not broken up — goes wherever this line points'
                    : lineItems
                        .map((i) => {
                          const to = i.goalId ? goalName(i.goalId) : accountName(i.toAccountId);
                          const from = accountName(i.fromAccountId);
                          return `${i.label} ${formatPHP(i.amount)}${from ? ` from ${from}` : ''}${to ? ` → ${to}` : ' (stays)'}`;
                        })
                        .join(' · ')}
                </span>
                {off && (
                  <span className="list-row__meta plan-meta--late">
                    These parts come to {formatPHP(total)}, but the line is set to {formatPHP(planned)}.
                  </span>
                )}
              </div>
            </button>
          );
        })}
        <div className="ios-row-wrap list-row">
          <span className="list-row__meta">
            A line left alone keeps doing what it does today. Breaking one up replaces both the
            account it is paid from and, for goals, the priority order — each part then goes
            exactly where you put it, every payday.
          </span>
        </div>
      </div>
    </div>
  );
}
