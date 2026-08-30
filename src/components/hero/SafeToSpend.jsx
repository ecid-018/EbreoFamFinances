import { useDerivedFinancials } from '../../hooks/useDerivedFinancials.js';
import { formatPHP } from '../../utils/currency.js';
import { Eyebrow } from '../shared/Eyebrow.jsx';

function buildSummary({ safeToSpend, daysLeft, isPastMonth, tightestEnvelope }) {
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

export function SafeToSpend() {
  const financials = useDerivedFinancials();

  return (
    <section className="hero">
      <Eyebrow>Safe to spend</Eyebrow>
      <div className="hero__amount">{formatPHP(financials.safeToSpend)}</div>
      <p className="hero__summary">{buildSummary(financials)}</p>
    </section>
  );
}
