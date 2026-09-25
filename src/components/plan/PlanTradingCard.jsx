import { formatPHP } from '../../utils/currency.js';

// Does trading make money once what it costs to run is taken off?
//
// Net is the headline on purpose. A year of payouts on its own flatters the
// answer, and the costs are spread across ordinary envelopes where nobody
// would think to add them up.
export function PlanTradingCard({ trading }) {
  if (!trading?.hasData) return null;

  const { year, costs, payouts, net } = trading;
  const down = net < 0;

  return (
    <div className="ios-group">
      <div className="ios-group__header">
        <span className="ios-group__title">Trading in {year}</span>
      </div>
      <div className="ios-card">
        <div className="ios-row-wrap list-row">
          <div className="list-row__main">
            <span className={`trading-net ${down ? 'trading-net--down' : ''}`.trim()}>
              {down ? `−${formatPHP(-net)}` : formatPHP(net)}
            </span>
            <span className="list-row__meta">
              {down ? 'more spent running it than it paid out' : 'net, after what it costs to run'}
            </span>
          </div>
        </div>

        <div className="ios-row-wrap list-row">
          <div className="list-row__main">
            <span className="list-row__title">{formatPHP(payouts.total)} paid out</span>
            <span className="list-row__meta">
              {payouts.count === 0
                ? 'No payouts tagged this year'
                : `${payouts.count} payout${payouts.count === 1 ? '' : 's'}`}
            </span>
          </div>
        </div>

        <div className="ios-row-wrap list-row">
          <div className="list-row__main">
            <span className="list-row__title">{formatPHP(costs.total)} to run</span>
            <span className="list-row__meta">
              {costs.flaggedCount === 0
                ? 'No envelope is marked as a trading cost yet'
                : costs.byEnvelope.length === 0
                  ? 'Nothing spent in the marked envelopes this year'
                  : costs.byEnvelope.map((e) => `${e.name} ${formatPHP(e.amount)}`).join(' · ')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
