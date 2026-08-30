import { useApp } from '../../context/AppContext.jsx';
import { useDerivedFinancials } from '../../hooks/useDerivedFinancials.js';
import { formatPHP } from '../../utils/currency.js';
import { ChevronRightIcon } from '../shared/Icon.jsx';
import { AllocationRow } from './AllocationRow.jsx';

export function TithesSection() {
  const { state, openModal } = useApp();
  const { tithesAllocated, tithesUnallocated } = useDerivedFinancials();
  const { tithesSetAside, tithesAllocations } = state;

  return (
    <div className="ios-group" id="section-tithes">
      <div className="ios-group__header">
        <span className="ios-group__title">Tithes &amp; Offerings</span>
      </div>
      <div className="ios-card">
        <button
          type="button"
          className="ios-row-wrap list-row"
          onClick={() => openModal('tithesSetAside', { current: tithesSetAside })}
        >
          <div className="list-row__main">
            <span className="list-row__title">Set aside this month</span>
          </div>
          <span className="list-row__value">{formatPHP(tithesSetAside)}</span>
          <ChevronRightIcon size={16} className="list-row__chevron" />
        </button>

        <div className="ios-row-wrap stats-card">
          <div className="stats__col">
            <div className="stats__label">Allocated</div>
            <div className="stats__value">{formatPHP(tithesAllocated)}</div>
          </div>
          <div className="stats__col">
            <div className="stats__label">Unallocated</div>
            <div className={`stats__value ${tithesUnallocated < 0 ? 'stats__value--danger' : ''}`.trim()}>
              {formatPHP(tithesUnallocated)}
            </div>
          </div>
        </div>

        {tithesAllocations.length === 0 ? (
          <div className="ios-row-wrap list-row">
            <span className="list-row__meta">
              Nothing allocated yet — set some aside for a specific offering, activity, or project.
            </span>
          </div>
        ) : (
          tithesAllocations.map((allocation) => (
            <AllocationRow key={allocation.id} allocation={allocation} />
          ))
        )}

        <button
          type="button"
          className="ios-row-wrap list-row-plain"
          onClick={() => openModal('tithesAllocation')}
        >
          + Allocate to Activity
        </button>
      </div>
    </div>
  );
}
