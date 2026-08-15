import crypto from 'node:crypto';

export function normalizeText(value) {
  return String(value || '')
    .replace(/[\u00a0\u2007\u202f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function fingerprintReview(review) {
  return sha256([
    review.source,
    review.author?.profile_url || review.author?.name || '',
    review.published_at || review.published_at_text || '',
    review.rating || '',
    normalizeText(review.text).toLocaleLowerCase('ru')
  ].join('\n'));
}

export function parseRating(label) {
  const match = normalizeText(label).match(/([1-5])(?:[,.]\d+)?/);
  return match ? Number(match[1]) : null;
}

export function backgroundImageUrl(style) {
  const match = String(style || '').match(/url\(["']?(.*?)["']?\)/i);
  return match?.[1] || null;
}
