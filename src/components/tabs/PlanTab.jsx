import { PlanSegment } from '../plan/PlanSegment.jsx';
import { PlanView } from '../plan/PlanView.jsx';

// Reachable from the SideNav at >= 600px, and from the Overview | Plan segment
// on Home below that. Both set the same activeTab, so there is one piece of
// state and resizing the window cannot strand anyone on a hidden screen.
export function PlanTab() {
  return (
    <>
      <PlanSegment />
      <PlanView />
    </>
  );
}
