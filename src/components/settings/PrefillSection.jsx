import { useApp } from '../../context/AppContext.jsx';

export function PrefillSection() {
  const { openModal } = useApp();

  return (
    <div className="ios-group">
      <div className="ios-group__header">
        <span className="ios-group__title">Plan prefill</span>
      </div>
      <div className="ios-card">
        <button type="button" className="ios-row-wrap list-row-plain" onClick={() => openModal('planPrefill')}>
          <span className="list-row__title">Load a plan file…</span>
          <span className="list-row__subtitle">
            Preview what your plan file would change before anything is applied. Read in this browser only.
          </span>
        </button>
      </div>
    </div>
  );
}
