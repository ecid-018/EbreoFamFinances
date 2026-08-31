import { useApp } from '../../context/AppContext.jsx';
import { ChevronRightIcon } from '../shared/Icon.jsx';

export function SecuritySection() {
  const { openModal } = useApp();

  return (
    <div className="ios-group">
      <div className="ios-group__header">
        <span className="ios-group__title">Security</span>
      </div>
      <div className="ios-card">
        <button
          type="button"
          className="ios-row-wrap list-row"
          onClick={() => openModal('changePin')}
        >
          <div className="list-row__main">
            <span className="list-row__title">Change PIN</span>
          </div>
          <ChevronRightIcon size={16} className="list-row__chevron" />
        </button>
      </div>
    </div>
  );
}
