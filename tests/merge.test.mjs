import test from 'node:test';
import assert from 'node:assert/strict';
import { assertSaneSourceCount, mergeReviews } from '../src/lib/merge.mjs';

const base = {
  source: 'google', source_place_id: 'place', source_review_id: 'review-123',
  author: { name: 'Анна', avatar_url: null, profile_url: null }, rating: 5,
  text: 'Отличный отдых', published_at_text: 'неделю назад', published_at: null,
  published_at_is_approximate: true, date_precision: 'week', source_url: 'https://example.com', photos: []
};

test('keeps the first approximate date on later runs', () => {
  const first = mergeReviews([base], [], new Date('2026-08-15T00:00:00Z'), 'Europe/Minsk');
  const second = mergeReviews([{ ...base, published_at_text: '2 недели назад' }], first, new Date('2026-08-22T00:00:00Z'), 'Europe/Minsk');
  assert.equal(second[0].published_at, '2026-08-08');
  assert.equal(second[0].first_seen_at, first[0].first_seen_at);
});

test('deduplicates repeated source ids', () => {
  const reviews = mergeReviews([base, base], [], new Date('2026-08-15T00:00:00Z'), 'Europe/Minsk');
  assert.equal(reviews.length, 1);
});

test('rejects a sharply truncated source result so the collector can retry', () => {
  assert.throws(
    () => assertSaneSourceCount('google', 10, 48, 5),
    /google: резкое падение количества 48 → 10/
  );
  assert.doesNotThrow(() => assertSaneSourceCount('google', 48, 48, 5));
});
