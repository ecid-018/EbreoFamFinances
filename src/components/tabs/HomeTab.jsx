import { useApp } from '../../context/AppContext.jsx';
import { SafeToSpend } from '../hero/SafeToSpend.jsx';
import { StatsRow } from '../stats/StatsRow.jsx';
import { HouseholdSnapshot } from '../home/HouseholdSnapshot.jsx';
import { NeedsAttentionCard } from '../home/NeedsAttentionCard.jsx';
import { SpendingByEnvelopeChart } from '../home/SpendingByEnvelopeChart.jsx';
import { DayActivityList } from '../home/DayActivityList.jsx';

export function HomeTab() {
  const { viewMode } = useApp();

  return (
    <>
      <SafeToSpend />
      <StatsRow />
      {viewMode === 'day' ? (
        <DayActivityList />
      ) : (
        <>
          <HouseholdSnapshot />
          <NeedsAttentionCard />
          <SpendingByEnvelopeChart />
        </>
      )}
    </>
  );
}
