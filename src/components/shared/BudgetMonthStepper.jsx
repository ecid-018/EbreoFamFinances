import { addMonths, getMonthName } from '../../utils/date.js';
import { ChevronLeftIcon, ChevronRightIcon } from './Icon.jsx';

export function BudgetMonthStepper({ value, onChange }) {
  return (
    <div className="month-stepper">
      <button
        type="button"
        className="month-stepper__btn"
        aria-label="Previous month"
        onClick={() => onChange(addMonths(value, -1))}
      >
        <ChevronLeftIcon size={18} />
      </button>
      <span className="month-stepper__label">
        {getMonthName(value.year, value.monthIndex)} {value.year}
      </span>
      <button
        type="button"
        className="month-stepper__btn"
        aria-label="Next month"
        onClick={() => onChange(addMonths(value, 1))}
      >
        <ChevronRightIcon size={18} />
      </button>
    </div>
  );
}
