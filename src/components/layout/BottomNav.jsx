import { useApp } from '../../context/AppContext.jsx';

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function BottomNav() {
  const { openModal } = useApp();

  return (
    <nav className="bottom-nav" aria-label="Primary">
      <button
        type="button"
        className="bottom-nav__item"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        Home
      </button>
      <button
        type="button"
        className="bottom-nav__item"
        onClick={() => scrollToSection('section-envelopes')}
      >
        Budget
      </button>
      <button
        type="button"
        className="bottom-nav__item bottom-nav__item--add"
        onClick={() => openModal('addExpense')}
      >
        Add
      </button>
      <button
        type="button"
        className="bottom-nav__item"
        onClick={() => scrollToSection('section-needs-category')}
      >
        Activity
      </button>
      <button
        type="button"
        className="bottom-nav__item"
        onClick={() => scrollToSection('section-accounts')}
      >
        More
      </button>
    </nav>
  );
}
