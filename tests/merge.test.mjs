import test from 'node:test';
import assert from 'node:assert/strict';
import { assertSaneSourceCount, mergeReviews } from '../src/lib/merge.mjs';

const base = {
  source: 'yandex', source_place_id: 'place', source_review_id: 'review-123',
  author: { name: 'Анна', avatar_url: null, profile_url: null }, rating: 5,
  text: 'Отличный отдых', published_at_text: 'неделю назад', published_at: null,
  published_at_is_approximate: true, date_precision: 'week', source_url: 'https://example.com', photos: []
};

test('preserves the source date and first seen time on later runs', () => {
  const first = mergeReviews([base], [], new Date('2026-08-15T00:00:00Z'), 'Europe/Minsk');
  const second = mergeReviews([{ ...base, published_at_text: '2 недели назад' }], first, new Date('2026-08-22T00:00:00Z'), 'Europe/Minsk');
  assert.equal(second[0].published_at, null);
  assert.equal(second[0].first_seen_at, first[0].first_seen_at);
});

test('deduplicates repeated source ids', () => {
  const reviews = mergeReviews([base, base], [], new Date('2026-08-15T00:00:00Z'), 'Europe/Minsk');
  assert.equal(reviews.length, 1);
});

test('rejects a sharply truncated source result so the collector can retry', () => {
  assert.throws(
    () => assertSaneSourceCount('yandex', 10, 48, 5),
    /yandex: резкое падение количества 48 → 10/
  );
  assert.doesNotThrow(() => assertSaneSourceCount('yandex', 48, 48, 5));
});

test('Yandex-only sanity check ignores legacy Google reviews', async () => {
  const { assertSaneCounts } = await import('../src/lib/merge.mjs');
  assert.doesNotThrow(() => assertSaneCounts(
    Array(54).fill({ source: 'yandex' }),
    [...Array(48).fill({ source: 'google' }), ...Array(54).fill({ source: 'yandex' })],
    5,
    ['yandex']
  ));
});
