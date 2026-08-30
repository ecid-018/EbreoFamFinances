import { useApp } from '../../context/AppContext.jsx';
import { EnvelopeList } from '../envelopes/EnvelopeList.jsx';

export function BudgetTab() {
  const { openModal } = useApp();

  return (
    <>
      <div className="ios-group">
        <div className="ios-card">
          <button
            type="button"
            className="ios-row-wrap list-row-plain"
            onClick={() => openModal('allocateBudget')}
          >
            Allocate Monthly Budget
          </button>
        </div>
      </div>
      <EnvelopeList />
    </>
  );
}
