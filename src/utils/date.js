export function pad2(n) {
  return String(n).padStart(2, '0');
}

export function getMonthKey(year, monthIndex) {
  return `${year}-${pad2(monthIndex + 1)}`;
}

export function getMonthKeyFromDateStr(dateStr) {
  return dateStr.slice(0, 7);
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
