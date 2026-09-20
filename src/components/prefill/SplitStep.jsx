import { formatPHP } from '../../utils/currency.js';
import { resolveBalancingLine } from '../../utils/plan/prefill.js';

// A calculator, not a write. Nothing on this step is saved anywhere — it
// becomes the Payday screen later.
export function SplitStep({ plan, actualHub, onActualHubChange }) {
  const { balancing_line: balancingKey, ...lines } = plan.split;
  const actual = actualHub === '' ? Number(plan.pay.hub) || 0 : Number(actualHub) || 0;
  const result = resolveBalancingLine(lines, actual, balancingKey);

  return (
    <div className="prefill-step">
      <h3 className="prefill-heading">Payday split</h3>
      <p className="prefill-note">
        Every line is fixed except <strong>{balancingKey}</strong>, which the file names as the balancing line. When
        the amount that actually arrives differs from the plan, the difference comes out of — or goes into — that one
        line. Nothing here is saved.
      </p>

      <label className="form__field">
        <span className="form__label">Amount actually received in the hub account (₱)</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          className="form__input"
          value={actualHub}
          onChange={(e) => onActualHubChange(e.target.value)}
          placeholder={String(plan.pay.hub)}
        />
        <span className="form__checkbox-hint">Planned hub pay is {formatPHP(Number(plan.pay.hub) || 0)}.</span>
      </label>

      <table className="prefill-table">
        <thead>
          <tr>
            <th>Line</th>
            <th className="prefill-table__num">Planned</th>
            <th className="prefill-table__num">This payday</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(lines).map((key) => {
            const isBalancing = key === balancingKey;
            const planned = Number(lines[key]) || 0;
            const resolved = result.resolved[key];
            return (
              <tr key={key} className={isBalancing ? 'prefill-row--balancing' : undefined}>
                <td>
                  {key}
                  {isBalancing && <span className="prefill-table__muted"> · balancing line</span>}
                </td>
                <td className="prefill-table__num">{formatPHP(planned)}</td>
                <td className={`prefill-table__num${isBalancing && result.belowZero ? ' prefill-down' : ''}`}>
                  {formatPHP(resolved)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="prefill-totals">
        <div className="prefill-totals__row">
          <span>Planned total</span>
          <span>{formatPHP(result.planned)}</span>
        </div>
        <div className="prefill-totals__row">
          <span>Actually received</span>
          <span>{formatPHP(result.actual)}</span>
        </div>
        <div className="prefill-totals__row prefill-totals__row--total">
          <span>{result.difference < 0 ? 'Short by' : 'Over by'}</span>
          <span>{formatPHP(Math.abs(result.difference))}</span>
        </div>
      </div>

      {result.belowZero && (
        <p className="form__error">
          That leaves {balancingKey} at {formatPHP(result.balancingAmount)} — below zero. The shortfall is larger than
          that line can absorb, so another line has to give as well.
        </p>
      )}
    </div>
  );
}
