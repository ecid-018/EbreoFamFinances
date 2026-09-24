import { useApp } from '../../context/AppContext.jsx';
import { SegmentedControl } from '../shared/SegmentedControl.jsx';

// Phone-only navigation between Home, the Plan and Bills, hidden from 600px up
// where the SideNav has items for both instead.
//
// It drives activeTab rather than holding its own state. With a second piece
// of state, resizing a window from phone to tablet while the Plan was showing
// would leave it on screen with no visible control to leave it.
export function PlanSegment() {
  const { activeTab, setActiveTab } = useApp();

  return (
    <div className="plan-segment">
      <SegmentedControl
        value={activeTab === 'plan' || activeTab === 'bills' ? activeTab : 'home'}
        onChange={setActiveTab}
        options={[
          { value: 'home', label: 'Overview' },
          { value: 'plan', label: 'Plan' },
          { value: 'bills', label: 'Bills' },
        ]}
      />
    </div>
  );
}
