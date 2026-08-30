import { useApp } from '../../context/AppContext.jsx';
import { SegmentedControl } from '../shared/SegmentedControl.jsx';

export function AppearanceSection() {
  const { theme, setTheme } = useApp();

  return (
    <div className="ios-group">
      <div className="ios-group__header">
        <span className="ios-group__title">Appearance</span>
      </div>
      <div className="ios-card">
        <div className="ios-row-wrap appearance-row">
          <span className="list-row__title">Theme</span>
          <SegmentedControl
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
