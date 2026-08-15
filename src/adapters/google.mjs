import { expandAll, scrollUntilStable, detectBlock } from '../lib/browser.mjs';
import { backgroundImageUrl, normalizeText, parseRating } from '../lib/text.mjs';

const CARD = '.jftiEf[data-review-id]';

export async function collectGoogle(page, sourceConfig) {
  await page.goto(sourceConfig.url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  if (new URL(page.url()).hostname === 'consent.google.com') {
    const reject = page.getByRole('button', { name: /Отклонить все|Reject all/u });
    await reject.waitFor({ state: 'visible', timeout: 15_000 });
    await Promise.all([
      page.waitForURL(/google\.[^/]+\/maps\//, { timeout: 30_000 }),
      reject.click()
    ]);
  }
  await page.waitForTimeout(3_000);
  await detectBlock(page, 'google');

  const reviewsTab = page.getByRole('tab', { name: /Отзывы о месте/u });
  if (await reviewsTab.isVisible().catch(() => false)) {
    await reviewsTab.click({ timeout: 10_000 });
  } else {
    const moreReviews = page.getByRole('button', { name: /Ещё отзывы/u });
    if (await moreReviews.isVisible().catch(() => false)) await moreReviews.click({ timeout: 10_000 });
  }

  await page.locator(CARD).first().waitFor({ state: 'visible', timeout: 30_000 });
  await scrollUntilStable(page, CARD, { maxRounds: 35, stableRounds: 5 });
  await expandAll(page, `${CARD} button[aria-label="Ещё"]`);

  const rows = await page.locator(CARD).evaluateAll((cards, placeUrl) => cards.map(card => {
    const profileButton = card.querySelector('[data-href*="/maps/contrib/"]');
    const ratingLabel = card.querySelector('.kvMYJc[aria-label]')?.getAttribute('aria-label') || '';
    const photos = [...card.querySelectorAll('.Tya61d[style*="background-image"]')].map(button => ({
      style: button.getAttribute('style') || '',
      label: button.getAttribute('aria-label') || ''
    }));
    return {
      source: 'google',
      source_review_id: card.getAttribute('data-review-id'),
      author_name: card.querySelector('.d4r55')?.textContent || '',
      author_avatar_url: card.querySelector('.NBa7we')?.getAttribute('src') || null,
      author_profile_url: profileButton?.getAttribute('data-href') || null,
      rating_label: ratingLabel,
      text: card.querySelector('.wiI7pd')?.textContent || '',
      published_at_text: card.querySelector('.rsqaWe')?.textContent || '',
      source_url: placeUrl,
      photos
    };
  }), sourceConfig.url);

  return rows.map(row => ({
    source: row.source,
    source_place_id: sourceConfig.placeId,
    source_review_id: row.source_review_id,
    author: {
      name: normalizeText(row.author_name),
      avatar_source_url: row.author_avatar_url,
      profile_url: row.author_profile_url
    },
    rating: parseRating(row.rating_label),
    text: normalizeText(row.text),
    published_at_text: normalizeText(row.published_at_text),
    published_at: null,
    published_at_is_approximate: true,
    date_precision: 'unknown',
    source_url: row.source_url,
    photo_source_urls: row.photos.map(photo => backgroundImageUrl(photo.style)).filter(Boolean)
  })).filter(review => review.source_review_id && review.author.name && review.text);
}
