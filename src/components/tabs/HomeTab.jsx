import { useApp } from '../../context/AppContext.jsx';
import { PlanSegment } from '../plan/PlanSegment.jsx';
import { DueSoonCard } from '../bills/DueSoonCard.jsx';
import { ChecklistCard } from '../checklist/ChecklistCard.jsx';
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
      <PlanSegment />
      <SafeToSpend />
      <StatsRow />
      {viewMode === 'day' ? (
        <DayActivityList />
      ) : (
        <>
          {/* These two also fill the overview column at >=1024px (see
              App.jsx). layout.css hides this copy at that width so they are
              not rendered twice. */}
          <div className="home__overview-cards">
            <ChecklistCard />
            <DueSoonCard />
            <HouseholdSnapshot />
            <NeedsAttentionCard />
          </div>
          <SpendingByEnvelopeChart />
        </>
      )}
    </>
  );
}
