export function pad2(n) {
  return String(n).padStart(2, '0');
}

export function getMonthKey(year, monthIndex) {
  return `${year}-${pad2(monthIndex + 1)}`;
}

export function getMonthKeyFromDateStr(dateStr) {
  return dateStr.slice(0, 7);
}

export function parseMonthKey(key) {
  return { year: Number(key.slice(0, 4)), monthIndex: Number(key.slice(5, 7)) - 1 };
}

export function getMonthName(year, monthIndex) {
  return new Date(year, monthIndex, 1).toLocaleString('en-PH', { month: 'long' });
}

export function getDaysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function getCurrentMonth() {
  const now = new Date();
  return { year: now.getFullYear(), monthIndex: now.getMonth() };
}

export function addMonths({ year, monthIndex }, delta) {
  const d = new Date(year, monthIndex + delta, 1);
  return { year: d.getFullYear(), monthIndex: d.getMonth() };
}

export function isSameMonth(a, b) {
  return a.year === b.year && a.monthIndex === b.monthIndex;
}

export function getDaysLeftInMonth(year, monthIndex, today = new Date()) {
  const daysInMonth = getDaysInMonth(year, monthIndex);
  const isCurrent = year === today.getFullYear() && monthIndex === today.getMonth();
  if (isCurrent) return daysInMonth - today.getDate() + 1;
  const isFuture = new Date(year, monthIndex, 1) > today;
  return isFuture ? daysInMonth : 0;
}

export function toISODateString(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function filterByMonth(items, year, monthIndex, dateField = 'date') {
  const key = getMonthKey(year, monthIndex);
  return items.filter((item) => getMonthKeyFromDateStr(item[dateField]) === key);
}

export function addDays(dateStr, delta) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day + delta);
  return toISODateString(d);
}

export function getWeekdayName(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-PH', { weekday: 'long' });
}

export function getDayLabel(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function isToday(dateStr) {
  return dateStr === toISODateString();
}

export function getDayRange(date = new Date()) {
  const iso = toISODateString(date);
  return { start: iso, end: iso };
}

export function getWeekRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  return { start: toISODateString(start), end: toISODateString(end) };
}

export function getMonthRange(year, monthIndex) {
  const lastDay = getDaysInMonth(year, monthIndex);
  return {
    start: `${year}-${pad2(monthIndex + 1)}-01`,
    end: `${year}-${pad2(monthIndex + 1)}-${pad2(lastDay)}`,
  };
}

export function getYearRange(year) {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

export function isDateInRange(dateStr, { start, end }) {
  return dateStr >= start && dateStr <= end;
}

export function getPeriodRange(period, viewedMonth, today = new Date()) {
  switch (period) {
    case 'daily':
      return getDayRange(today);
    case 'weekly':
      return getWeekRange(today);
    case 'annual':
      return getYearRange(viewedMonth.year);
    case 'monthly':
    default:
      return getMonthRange(viewedMonth.year, viewedMonth.monthIndex);
  }
}
