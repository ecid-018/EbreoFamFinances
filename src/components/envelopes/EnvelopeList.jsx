import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { useDerivedFinancials } from '../../hooks/useDerivedFinancials.js';
import { EnvelopeRow } from './EnvelopeRow.jsx';

export function EnvelopeList() {
  const { openModal } = useApp();
  const { envelopeStats } = useDerivedFinancials();
  const [expanded, setExpanded] = useState(false);

  const visibleEnvelopes = expanded ? envelopeStats : envelopeStats.slice(0, 3);

  return (
    <div className="ios-group" id="section-envelopes">
      <div className="ios-group__header">
        <span className="ios-group__title">Tightest Envelopes</span>
      </div>
      <div className="ios-card">
        {visibleEnvelopes.map((envelope) => (
          <EnvelopeRow key={envelope.id} envelope={envelope} />
        ))}
        {envelopeStats.length > 3 && (
          <button
            type="button"
            className="ios-row-wrap list-row-plain"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? 'Show Top 3' : `Show All ${envelopeStats.length}`}
          </button>
        )}
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
