import { SafeToSpend } from '../hero/SafeToSpend.jsx';
import { StatsRow } from '../stats/StatsRow.jsx';
import { HouseholdSnapshot } from '../home/HouseholdSnapshot.jsx';
import { NeedsAttentionCard } from '../home/NeedsAttentionCard.jsx';
import { SpendingByEnvelopeChart } from '../home/SpendingByEnvelopeChart.jsx';

export function HomeTab() {
  return (
    <>
      <SafeToSpend />
      <StatsRow />
      <HouseholdSnapshot />
      <NeedsAttentionCard />
      <SpendingByEnvelopeChart />
    </>
  );
}
