import { assertSaneSourceCount } from './merge.mjs';

export async function collectSourceWithRetry({
  source,
  adapter,
  page,
  sourceConfig,
  previousCount,
  minimum,
  maxAttempts = 3
}) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const reviews = await adapter(page, sourceConfig);
      assertSaneSourceCount(source, reviews.length, previousCount, minimum);
      return reviews;
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      console.warn(`[${source}] attempt ${attempt}/${maxAttempts} rejected: ${error.message}; retrying`);
      await page.waitForTimeout(attempt * 2_000);
    }
  }

  return [];
}
