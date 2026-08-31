import { useApp } from '../../context/AppContext.jsx';
import { useDerivedFinancials } from '../../hooks/useDerivedFinancials.js';
import { useDayFinancials } from '../../hooks/useDayFinancials.js';
import { formatPHP } from '../../utils/currency.js';

function buildMonthSummary({ safeToSpend, daysLeft, isPastMonth, tightestEnvelope }) {
  if (isPastMonth) {
    return 'This month is closed — no more days left to track.';
  }

  const dailyPace = daysLeft > 0 ? safeToSpend / daysLeft : safeToSpend;
  const paceSentence = `That's about ${formatPHP(dailyPace)}/day for the rest of the month.`;

  if (!tightestEnvelope) {
    return paceSentence;
  }

  const calloutSentence = tightestEnvelope.isOver
    ? `${tightestEnvelope.name} is over budget by ${formatPHP(tightestEnvelope.spent - tightestEnvelope.monthlyBudget)}.`
    : `${tightestEnvelope.name} is closest to its limit, at ${Math.round(tightestEnvelope.ratio * 100)}% used.`;

  return `${paceSentence} ${calloutSentence}`;
}

function buildDaySummary({ dayTransactions, dayIncomeEntries, dayNet }) {
  const count = dayTransactions.length;
  if (count === 0 && dayIncomeEntries.length === 0) {
    return 'Nothing logged for this day yet.';
  }
  const expensePart = count > 0 ? `${count} expense${count === 1 ? '' : 's'} logged` : 'No expenses logged';
  const netPart = dayNet >= 0 ? `net ${formatPHP(dayNet)} for the day.` : `net -${formatPHP(Math.abs(dayNet))} for the day.`;
  return `${expensePart} — ${netPart}`;
}

export function SafeToSpend() {
  const { viewMode } = useApp();
  const monthFinancials = useDerivedFinancials();
  const dayFinancials = useDayFinancials();
  const isDayMode = viewMode === 'day';

  return (
    <div className="ios-group">
      <div className="ios-card ios-card--padded">
        <div className="hero__eyebrow">{isDayMode ? 'Spent' : 'Safe to spend'}</div>
        <div className="hero__amount">
          {formatPHP(isDayMode ? dayFinancials.daySpent : monthFinancials.safeToSpend)}
        </div>
        <p className="hero__summary">
          {isDayMode ? buildDaySummary(dayFinancials) : buildMonthSummary(monthFinancials)}
        </p>
      </div>
    </div>
  );
}
