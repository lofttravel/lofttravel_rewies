import fs from 'node:fs/promises';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { chromium } from 'playwright';
import { collectGoogle } from './adapters/google.mjs';
import { collectYandex } from './adapters/yandex.mjs';
import { config } from './config.mjs';
import { collectSourceWithRetry } from './lib/collect-source.mjs';
import { processMedia, pruneUnreferencedMedia } from './lib/media.mjs';
import { assertSaneCounts, mergeReviews } from './lib/merge.mjs';
import { sha256 } from './lib/text.mjs';

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return fallback; }
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

await Promise.all([fs.mkdir(config.publicDir, { recursive: true }), fs.mkdir(config.artifactsDir, { recursive: true })]);
const observedAt = new Date();
const previousFeed = await readJson(config.outputFile, await readJson(config.stateFile, { reviews: [] }));
const browser = await chromium.launch({ headless: config.headless });
const context = await browser.newContext({
  locale: 'ru-RU',
  timezoneId: config.timezone,
  viewport: { width: 1440, height: 900 },
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
});

const collected = [];
try {
  for (const [source, adapter, sourceConfig] of [
    ['google', collectGoogle, config.google],
    ['yandex', collectYandex, config.yandex]
  ]) {
    const page = await context.newPage();
    try {
      const previousCount = (previousFeed.reviews || []).filter(review => review.source === source).length;
      const reviews = await collectSourceWithRetry({
        source,
        adapter,
        page,
        sourceConfig,
        previousCount,
        minimum: config.minimumReviewsPerSource
      });

      console.log(`[${source}] collected ${reviews.length}`);
      for (const review of reviews) collected.push(await processMedia(review, config));
    } catch (error) {
      await page.screenshot({ path: path.join(config.artifactsDir, `${source}-failure.png`), fullPage: false }).catch(() => {});
      await fs.writeFile(path.join(config.artifactsDir, `${source}-failure.html`), await page.content().catch(() => '')).catch(() => {});
      throw error;
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}

const reviews = mergeReviews(collected, previousFeed.reviews || [], observedAt, config.timezone);
assertSaneCounts(reviews, previousFeed.reviews || [], config.minimumReviewsPerSource);
const feed = {
  schema_version: 'reviews.v1',
  generated_at: observedAt.toISOString(),
  timezone: config.timezone,
  sources: {
    google: { place_id: config.google.placeId, url: config.google.url },
    yandex: { place_id: config.yandex.placeId, url: config.yandex.url }
  },
  stats: {
    total: reviews.length,
    google: reviews.filter(review => review.source === 'google').length,
    yandex: reviews.filter(review => review.source === 'yandex').length,
    with_photos: reviews.filter(review => review.photos.length > 0).length
  },
  reviews
};

const schema = await readJson(config.schemaFile, null);
const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);
if (!validate(feed)) throw new Error(`JSON Schema: ${JSON.stringify(validate.errors)}`);
const serialized = `${JSON.stringify(feed, null, 2)}\n`;
const manifest = {
  schema_version: feed.schema_version,
  generated_at: feed.generated_at,
  sha256: sha256(serialized),
  bytes: Buffer.byteLength(serialized),
  reviews: feed.stats
};

if (config.dryRun) {
  console.log(JSON.stringify({ feed: feed.stats, manifest }, null, 2));
} else {
  await pruneUnreferencedMedia(reviews, config);
  await fs.writeFile(config.outputFile, serialized);
  await writeJson(config.manifestFile, manifest);
  await writeJson(config.stateFile, { generated_at: feed.generated_at, reviews: feed.reviews });
  console.log(`[done] wrote ${feed.stats.total} reviews, checksum ${manifest.sha256}`);
}
