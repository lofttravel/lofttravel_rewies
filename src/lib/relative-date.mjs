import { normalizeText } from './text.mjs';

function calendarParts(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return { year: Number(value.year), month: Number(value.month), day: Number(value.day) };
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function shiftCalendar({ year, month, day }, { days = 0, months = 0, years = 0 }) {
  let targetYear = year - years;
  let targetMonthIndex = month - 1 - months;
  targetYear += Math.floor(targetMonthIndex / 12);
  targetMonthIndex = ((targetMonthIndex % 12) + 12) % 12;
  const safeDay = Math.min(day, daysInMonth(targetYear, targetMonthIndex + 1));
  const shifted = new Date(Date.UTC(targetYear, targetMonthIndex, safeDay));
  shifted.setUTCDate(shifted.getUTCDate() - days);
  return shifted.toISOString().slice(0, 10);
}

function quantity(text) {
  const numeric = text.match(/\d+/)?.[0];
  if (numeric) return Number(numeric);
  if (/\b(?:один|одну|a|an)\b/u.test(text)) return 1;
  return 1;
}

export function estimateRelativeDate(label, observedAt = new Date(), timezone = 'Europe/Minsk') {
  const original = normalizeText(label);
  const text = original.toLocaleLowerCase('ru');
  const base = calendarParts(observedAt, timezone);

  if (!text) return { date: null, approximate: true, precision: 'unknown' };
  if (/только что|сегодня|just now|today/u.test(text)) {
    return { date: shiftCalendar(base, {}), approximate: true, precision: 'day' };
  }
  if (/вчера|yesterday/u.test(text)) {
    return { date: shiftCalendar(base, { days: 1 }), approximate: true, precision: 'day' };
  }

  const amount = quantity(text);
  if (/минут|minute/u.test(text)) return { date: shiftCalendar(base, {}), approximate: true, precision: 'day' };
  if (/час|hour/u.test(text)) return { date: shiftCalendar(base, {}), approximate: true, precision: 'day' };
  if (/день|дня|дней|day/u.test(text)) return { date: shiftCalendar(base, { days: amount }), approximate: true, precision: 'day' };
  if (/недел|week/u.test(text)) return { date: shiftCalendar(base, { days: amount * 7 }), approximate: true, precision: 'week' };
  if (/полгода/u.test(text)) return { date: shiftCalendar(base, { months: 6 }), approximate: true, precision: 'month' };
  if (/месяц|месяца|месяцев|month/u.test(text)) return { date: shiftCalendar(base, { months: amount }), approximate: true, precision: 'month' };
  if (/год|года|лет|year/u.test(text)) return { date: shiftCalendar(base, { years: amount }), approximate: true, precision: 'year' };

  return { date: null, approximate: true, precision: 'unknown' };
}
