import { formatPHP, formatPHPPrecise } from '../../utils/currency.js';

// The default formatter rounds to whole pesos, which can show a rail as met
// when it is ₱0.40 short. Within a peso of the threshold, show the centavos.
function railFigures({ current, target }) {
  const near = Math.abs(current - target) < 1;
  const format = near ? formatPHPPrecise : formatPHP;
  return { current: format(current), target: format(target) };
}

function verdict({ direction, current, target, isBreached }) {
  if (direction === 'min') {
    return isBreached
      ? { text: `${formatPHP(target - current)} below the floor`, tone: 'bad' }
      : { text: `${formatPHP(current - target)} above the floor`, tone: 'good' };
  }
  if (direction === 'max') {
    return isBreached
      ? { text: `${formatPHP(current - target)} over the cap`, tone: 'bad' }
      : { text: `${formatPHP(target - current)} left under the cap`, tone: 'good' };
  }
  // A target to reach, not a limit: there is no failing it part-way through
  // the year, so it gets a plain figure rather than a verdict.
  return { text: `${formatPHP(Math.max(0, target - current))} to go`, tone: 'neutral' };
}

export function PlanGuardRailsSection({ guardRails }) {
  if (guardRails.length === 0) return null;

  return (
    <div className="ios-group">
      <div className="ios-group__header">
        <span className="ios-group__title">Guard-rails</span>
      </div>
      <div className="ios-card">
        {guardRails.map((rail) => {
          const figures = railFigures(rail);
          const said = verdict(rail);
          const pct = rail.target > 0 ? Math.min(100, (rail.current / rail.target) * 100) : 0;
          return (
            <div className="stack-row" key={rail.key}>
              <div className="stack-row__top">
                <span className="stack-row__name">{rail.label}</span>
                <span className="list-row__value">
                  {figures.current} / {figures.target}
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className={`progress-bar__fill ${rail.isBreached ? 'progress-bar__fill--over' : ''}`.trim()}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="plan-row__footer">
                <span className={`plan-badge plan-badge--${said.tone}`}>{said.text}</span>
                <span className="list-row__meta">{rail.note}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
