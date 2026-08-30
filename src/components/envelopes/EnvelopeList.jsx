import { useApp } from '../../context/AppContext.jsx';
import { useDerivedFinancials } from '../../hooks/useDerivedFinancials.js';
import { formatPHP } from '../../utils/currency.js';
import { EnvelopeRow } from './EnvelopeRow.jsx';

export function EnvelopeList() {
  const { openModal } = useApp();
  const { envelopeGroups } = useDerivedFinancials();

  return (
    <div className="ios-group" id="section-envelopes">
      <div className="ios-group__header">
        <span className="ios-group__title">Envelopes</span>
      </div>
      <div className="ios-card">
        {envelopeGroups.map(({ group, items, spent, budget, isOver }) => (
          <div key={group}>
            {items.length > 1 && (
              <div className="ios-row-wrap group-header-row">
                <span className="group-header-row__name">{group}</span>
                <span className={`group-header-row__amount ${isOver ? 'group-header-row__amount--over' : ''}`.trim()}>
                  {formatPHP(spent)} of {formatPHP(budget)}
                </span>
              </div>
            )}
            {items.map((envelope) => (
              <EnvelopeRow key={envelope.id} envelope={envelope} indented={items.length > 1} />
            ))}
          </div>
        ))}
        <button
          type="button"
          className="ios-row-wrap list-row-plain"
          onClick={() => openModal('envelopeForm', { mode: 'add' })}
        >
          + Add Envelope
        </button>
      </div>
    </div>
  );
}
