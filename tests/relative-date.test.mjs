import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateRelativeDate } from '../src/lib/relative-date.mjs';

const observed = new Date('2026-08-15T00:23:00.000Z');

test('converts Russian Google relative dates', () => {
  assert.equal(estimateRelativeDate('неделю назад', observed).date, '2026-08-08');
  assert.equal(estimateRelativeDate('2 недели назад', observed).date, '2026-08-01');
  assert.equal(estimateRelativeDate('месяц назад', observed).date, '2026-07-15');
  assert.equal(estimateRelativeDate('10 месяцев назад', observed).date, '2025-10-15');
  assert.equal(estimateRelativeDate('полгода назад', observed).date, '2026-02-15');
  assert.equal(estimateRelativeDate('год назад', observed).date, '2025-08-15');
  assert.equal(estimateRelativeDate('вчера', observed).date, '2026-08-14');
});

test('clamps calendar months safely', () => {
  assert.equal(estimateRelativeDate('месяц назад', new Date('2026-03-31T12:00:00Z')).date, '2026-02-28');
});
