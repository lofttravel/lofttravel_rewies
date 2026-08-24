import test from 'node:test';
import assert from 'node:assert/strict';
import { collectSourceWithRetry } from '../src/lib/collect-source.mjs';

test('retries a transiently truncated source and keeps the complete result', async () => {
  const results = [Array(10).fill({}), Array(48).fill({})];
  let calls = 0;
  const delays = [];

  const reviews = await collectSourceWithRetry({
    source: 'google',
    adapter: async () => results[calls++],
    page: { waitForTimeout: async delay => delays.push(delay) },
    sourceConfig: {},
    previousCount: 48,
    minimum: 5
  });

  assert.equal(calls, 2);
  assert.equal(reviews.length, 48);
  assert.deepEqual(delays, [2_000]);
});

test('fails after three truncated attempts without publishing partial data', async () => {
  let calls = 0;

  await assert.rejects(
    collectSourceWithRetry({
      source: 'google',
      adapter: async () => {
        calls += 1;
        return Array(10).fill({});
      },
      page: { waitForTimeout: async () => {} },
      sourceConfig: {},
      previousCount: 48,
      minimum: 5
    }),
    /google: резкое падение количества 48 → 10/
  );

  assert.equal(calls, 3);
});
