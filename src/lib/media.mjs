import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { sha256 } from './text.mjs';

const MAX_DOWNLOAD_BYTES = 15 * 1024 * 1024;

function higherResolutionUrl(url, source) {
  if (source === 'google') return url.replace(/=w\d+-h\d+[^?]*$/i, '=w1600-h1600-p-k-no');
  if (source === 'yandex') return url.replace(/\/(?:S|M|L|XL|XXL|orig)(?:\?.*)?$/i, '/orig');
  return url;
}

async function download(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(20_000),
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; LoftTravelReviews/1.0; +https://lofttravel.by)',
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
    }
  });
  if (!response.ok) throw new Error(`image HTTP ${response.status}`);
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > MAX_DOWNLOAD_BYTES) throw new Error('image is too large');
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0 || buffer.length > MAX_DOWNLOAD_BYTES) throw new Error('invalid image size');
  return buffer;
}

async function ensureDir(directory) {
  await fs.mkdir(directory, { recursive: true });
}

export async function cacheAvatar(review, config) {
  const sourceUrl = review.author.avatar_source_url;
  if (!sourceUrl) return null;
  try {
    const input = await download(higherResolutionUrl(sourceUrl, review.source));
    const hash = sha256(input).slice(0, 24);
    const relative = `media/avatars/${hash}.webp`;
    const target = path.join(config.publicDir, relative);
    await ensureDir(path.dirname(target));
    await sharp(input).rotate().resize(96, 96, { fit: 'cover' }).webp({ quality: 74, effort: 5 }).toFile(target);
    return `${config.publicBaseUrl}/${relative}`;
  } catch (error) {
    console.warn(`[media] avatar skipped for ${review.source_review_id}: ${error.message}`);
    return sourceUrl;
  }
}

export async function cacheReviewPhoto(url, review, config) {
  try {
    const resolvedUrl = higherResolutionUrl(url, review.source);
    const input = await download(resolvedUrl);
    const hash = sha256(input).slice(0, 24);
    const thumbRelative = `media/thumbnails/${hash}.webp`;
    const popupRelative = `media/popup/${hash}.webp`;
    const thumbTarget = path.join(config.publicDir, thumbRelative);
    const popupTarget = path.join(config.publicDir, popupRelative);
    await Promise.all([ensureDir(path.dirname(thumbTarget)), ensureDir(path.dirname(popupTarget))]);

    const image = sharp(input).rotate();
    const metadata = await image.metadata();
    await Promise.all([
      image.clone().resize({ width: 560, height: 560, fit: 'inside', withoutEnlargement: true }).webp({ quality: 70, effort: 5 }).toFile(thumbTarget),
      image.clone().resize({ width: 1440, height: 1440, fit: 'inside', withoutEnlargement: true }).webp({ quality: 76, smartSubsample: true, effort: 6 }).toFile(popupTarget)
    ]);

    return {
      id: hash,
      thumbnail_url: `${config.publicBaseUrl}/${thumbRelative}`,
      popup_url: `${config.publicBaseUrl}/${popupRelative}`,
      width: metadata.width || null,
      height: metadata.height || null,
      mime_type: 'image/webp'
    };
  } catch (error) {
    console.warn(`[media] photo skipped for ${review.source_review_id}: ${error.message}`);
    return null;
  }
}

export async function processMedia(review, config) {
  const [avatarUrl, photos] = await Promise.all([
    cacheAvatar(review, config),
    Promise.all(review.photo_source_urls.slice(0, config.maxPhotosPerReview).map(url => cacheReviewPhoto(url, review, config)))
  ]);
  return {
    ...review,
    author: { name: review.author.name, avatar_url: avatarUrl, profile_url: review.author.profile_url },
    photos: photos.filter(Boolean)
  };
}

export async function pruneUnreferencedMedia(reviews, config) {
  const referenced = new Set();
  for (const review of reviews) {
    for (const url of [review.author.avatar_url, ...review.photos.flatMap(photo => [photo.thumbnail_url, photo.popup_url])]) {
      if (! url?.startsWith(`${config.publicBaseUrl}/media/`)) continue;
      referenced.add(url.slice(`${config.publicBaseUrl}/`.length));
    }
  }

  for (const directory of ['media/avatars', 'media/thumbnails', 'media/popup']) {
    const absolute = path.join(config.publicDir, directory);
    const files = await fs.readdir(absolute).catch(() => []);
    await Promise.all(files
      .filter(file => ! referenced.has(`${directory}/${file}`))
      .map(file => fs.unlink(path.join(absolute, file))));
  }
}
