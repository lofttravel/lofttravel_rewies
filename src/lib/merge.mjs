import { estimateRelativeDate } from './relative-date.mjs';
import { fingerprintReview, sha256 } from './text.mjs';

export function mergeReviews(collected, previousReviews, observedAt, timezone) {
  const previous = new Map(previousReviews.map(review => [`${review.source}:${review.source_review_id}`, review]));
  const seen = new Set();
  const merged = [];

  for (const incoming of collected) {
    const key = `${incoming.source}:${incoming.source_review_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const old = previous.get(key);
    const estimated = incoming.source === 'google'
      ? estimateRelativeDate(incoming.published_at_text, observedAt, timezone)
      : { date: incoming.published_at, approximate: incoming.published_at_is_approximate, precision: incoming.date_precision };
    const publishedAt = old?.published_at || incoming.published_at || estimated.date;
    const firstSeenAt = old?.first_seen_at || observedAt.toISOString();
    const contentHash = sha256(JSON.stringify({
      author: incoming.author.name,
      rating: incoming.rating,
      text: incoming.text,
      published_at: publishedAt,
      photos: incoming.photos.map(photo => photo.id)
    }));

    merged.push({
      source: incoming.source,
      source_place_id: incoming.source_place_id,
      source_review_id: incoming.source_review_id || `fp_${fingerprintReview(incoming)}`,
      author: incoming.author,
      rating: incoming.rating,
      text: incoming.text,
      published_at_text: incoming.published_at_text,
      published_at: publishedAt,
      published_at_is_approximate: old?.published_at_is_approximate ?? estimated.approximate,
      date_precision: old?.date_precision || estimated.precision,
      first_seen_at: firstSeenAt,
      last_seen_at: observedAt.toISOString(),
      source_url: incoming.source_url,
      photos: incoming.photos,
      content_hash: contentHash
    });
  }

  return merged.sort((a, b) => {
    const dateOrder = String(b.published_at || '').localeCompare(String(a.published_at || ''));
    return dateOrder || a.source.localeCompare(b.source) || a.source_review_id.localeCompare(b.source_review_id);
  });
}

export function assertSaneCounts(reviews, previousReviews, minimum) {
  for (const source of ['google', 'yandex']) {
    const count = reviews.filter(review => review.source === source).length;
    const previousCount = previousReviews.filter(review => review.source === source).length;
    assertSaneSourceCount(source, count, previousCount, minimum);
  }
}

export function assertSaneSourceCount(source, count, previousCount, minimum) {
  if (count < minimum) throw new Error(`${source}: получено только ${count} отзывов, минимум ${minimum}`);
  if (previousCount >= minimum && count < Math.floor(previousCount * 0.6)) {
    throw new Error(`${source}: резкое падение количества ${previousCount} → ${count}`);
  }
}
