import { expandAll, scrollUntilStable, detectBlock } from '../lib/browser.mjs';
import { fingerprintReview, normalizeText } from '../lib/text.mjs';

const CARD = '.business-review-view[itemprop="review"]';

export async function collectYandex(page, sourceConfig) {
  await page.goto(sourceConfig.url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(3_000);
  await detectBlock(page, 'yandex');
  await page.locator(CARD).first().waitFor({ state: 'visible', timeout: 30_000 });
  await scrollUntilStable(page, CARD, { maxRounds: 25, stableRounds: 4 });
  await expandAll(page, `${CARD} .business-review-view__expand`);

  const rows = await page.locator(CARD).evaluateAll((cards, placeUrl) => cards.map(card => ({
    author_name: card.querySelector('[itemprop="author"] [itemprop="name"]')?.textContent || '',
    author_avatar_url: card.querySelector('.business-review-view__user-icon img')?.getAttribute('src') || null,
    author_profile_url: card.querySelector('.business-review-view__link')?.getAttribute('href') || null,
    rating: card.querySelector('meta[itemprop="ratingValue"]')?.getAttribute('content') || null,
    text: card.querySelector('.spoiler-view__text-container')?.textContent || card.querySelector('[itemprop="reviewBody"]')?.textContent || '',
    published_at_text: card.querySelector('.business-review-view__date span')?.textContent || '',
    published_at: card.querySelector('meta[itemprop="datePublished"]')?.getAttribute('content') || null,
    source_url: placeUrl,
    photos: [...card.querySelectorAll('.business-review-media__item-img')].map(image => image.currentSrc || image.getAttribute('src')).filter(Boolean)
  })), sourceConfig.url);

  return rows.map(row => {
    const publishedAt = row.published_at ? new Date(row.published_at).toISOString().slice(0, 10) : null;
    const review = {
      source: 'yandex',
      source_place_id: sourceConfig.placeId,
      source_review_id: null,
      author: {
        name: normalizeText(row.author_name),
        avatar_source_url: row.author_avatar_url,
        profile_url: row.author_profile_url
      },
      rating: row.rating ? Number(row.rating) : null,
      text: normalizeText(row.text),
      published_at_text: normalizeText(row.published_at_text),
      published_at: publishedAt,
      published_at_is_approximate: false,
      date_precision: publishedAt ? 'exact' : 'unknown',
      source_url: row.source_url,
      photo_source_urls: row.photos
    };
    review.source_review_id = `fp_${fingerprintReview(review)}`;
    return review;
  }).filter(review => review.author.name && review.text);
}
