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
    <section className="section" id="section-envelopes">
      <div className="section__header">
        <h2 className="section__title">Tightest envelopes</h2>
        {envelopeStats.length > 3 && (
          <button type="button" className="btn-text" onClick={() => setExpanded((v) => !v)}>
            {expanded ? '← Show top 3' : `All ${envelopeStats.length} →`}
          </button>
        )}
      </div>
      <div className="envelope-list">
        {visibleEnvelopes.map((envelope) => (
          <EnvelopeRow key={envelope.id} envelope={envelope} />
        ))}
      </div>
      <button
        type="button"
        className="btn btn-secondary section__add"
        onClick={() => openModal('envelopeForm', { mode: 'add' })}
      >
        + Add envelope
      </button>
    </section>
  );
}
