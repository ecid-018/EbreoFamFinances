import { useApp } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useDerivedFinancials } from '../../hooks/useDerivedFinancials.js';
import { useScrollCollapse } from '../../hooks/useScrollCollapse.js';
import { getMonthName, addDays, getWeekdayName, getDayLabel, isToday } from '../../utils/date.js';
import { SegmentedControl } from '../shared/SegmentedControl.jsx';
import { Avatar } from '../shared/Avatar.jsx';
import { ChevronLeftIcon, ChevronRightIcon, SettingsIcon } from '../shared/Icon.jsx';

export function NavBar() {
  const { state, dispatch, openModal, viewMode, setViewMode, viewDay, setViewDay } = useApp();
  const { session, currentProfile } = useAuth();
  const { daysLeft, isPastMonth } = useDerivedFinancials();
  const liveProfile = state.profiles.find((p) => p.id === session?.user?.id);
  const displayProfile = currentProfile && {
    displayName: currentProfile.displayName,
    avatarUrl: liveProfile?.avatarUrl,
  };
  const collapsed = useScrollCollapse();
  const isDayMode = viewMode === 'day';

  const monthName = getMonthName(state.month.year, state.month.monthIndex);
  const monthLabel = `${monthName} ${state.month.year}`;
  const monthSubtitle = isPastMonth ? 'Month closed' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;

  // The collapsed small-title shares its row with the "Previous/Next Month" text
  // buttons, so it stays compact (no year) — the full "August 2026" form shows in
  // the roomier large title below instead.
  const smallTitle = isDayMode ? getDayLabel(viewDay).replace(`, ${viewDay.slice(0, 4)}`, '') : monthName;
  const largeTitle = isDayMode ? getWeekdayName(viewDay) : monthLabel;
  const subtitle = isDayMode ? (isToday(viewDay) ? 'Today' : getDayLabel(viewDay)) : monthSubtitle;

  const prevLabel = isDayMode ? 'Previous Day' : 'Previous Month';
  const nextLabel = isDayMode ? 'Next Day' : 'Next Month';

  function handlePrev() {
    if (isDayMode) setViewDay(addDays(viewDay, -1));
    else dispatch({ type: 'month/prev' });
  }

  function handleNext() {
    if (isDayMode) setViewDay(addDays(viewDay, 1));
    else dispatch({ type: 'month/next' });
  }

  return (
    <header className={`navbar ${collapsed ? 'navbar--collapsed' : ''}`.trim()}>
      <div className="navbar__bar">
        <button type="button" className="navbar__nav-btn" aria-label={prevLabel} onClick={handlePrev}>
          <ChevronLeftIcon size={13} />
          {prevLabel}
        </button>
        <span className="navbar__small-title">{smallTitle}</span>
        <div className="navbar__bar-trailing">
          <button type="button" className="navbar__nav-btn" aria-label={nextLabel} onClick={handleNext}>
            {nextLabel}
            <ChevronRightIcon size={13} />
          </button>
          {displayProfile && (
            <button
              type="button"
              className="navbar__avatar-btn"
              aria-label={`Signed in as ${displayProfile.displayName}`}
              title={`Signed in as ${displayProfile.displayName}`}
              onClick={() => openModal('settings')}
            >
              <Avatar profile={displayProfile} size={26} />
            </button>
          )}
          <button
            type="button"
            className="navbar__icon-btn"
            aria-label="Settings"
            onClick={() => openModal('settings')}
          >
            <SettingsIcon size={20} />
          </button>
        </div>
      </div>
      <div className="navbar__large-wrap">
        <h1 className="navbar__large-title">{largeTitle}</h1>
        <SegmentedControl
          value={viewMode}
          onChange={setViewMode}
          options={[
            { value: 'month', label: 'Month' },
            { value: 'day', label: 'Day' },
          ]}
        />
        <p className="navbar__subtitle">{subtitle}</p>
      </div>
    </header>
  );
}
