import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const config = Object.freeze({
  root,
  publicDir: path.join(root, 'public'),
  artifactsDir: path.join(root, 'artifacts'),
  stateFile: path.join(root, 'state', 'reviews.json'),
  outputFile: path.join(root, 'public', 'reviews.v1.json'),
  manifestFile: path.join(root, 'public', 'manifest.json'),
  schemaFile: path.join(root, 'schemas', 'reviews.v1.schema.json'),
  timezone: 'Europe/Minsk',
  publicBaseUrl: (process.env.PUBLIC_BASE_URL || 'https://raw.githubusercontent.com/lofttravel/lofttravel_rewies/main/public').replace(/\/$/, ''),
  dryRun: process.env.REVIEWS_DRY_RUN === '1',
  headless: process.env.HEADLESS !== '0',
  maxPhotosPerReview: Number(process.env.MAX_PHOTOS_PER_REVIEW || 4),
  minimumReviewsPerSource: Number(process.env.MIN_REVIEWS_PER_SOURCE || 5),
  yandex: {
    placeId: '160356850970',
    url: 'https://yandex.by/maps/org/loft_trevel/160356850970/reviews/?ll=27.518730%2C53.908686&z=17'
  }
});
