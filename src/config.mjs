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
  publicBaseUrl: (process.env.PUBLIC_BASE_URL || 'https://lofttravel.github.io/lofttravel_rewies').replace(/\/$/, ''),
  dryRun: process.env.REVIEWS_DRY_RUN === '1',
  headless: process.env.HEADLESS !== '0',
  maxPhotosPerReview: Number(process.env.MAX_PHOTOS_PER_REVIEW || 4),
  minimumReviewsPerSource: Number(process.env.MIN_REVIEWS_PER_SOURCE || 5),
  google: {
    placeId: '0x46dbcf13de883f57:0x7e6e3bff805d04d',
    url: 'https://www.google.com/maps/place/%D0%9B%D0%BE%D1%84%D1%82+%D0%A2%D1%80%D1%8D%D0%B2%D0%B5%D0%BB/@53.908511,27.5161381,17z/data=!4m8!3m7!1s0x46dbcf13de883f57:0x7e6e3bff805d04d!8m2!3d53.908511!4d27.518713!9m1!1b1!16s%2Fg%2F11h0hkh8j7?hl=ru'
  },
  yandex: {
    placeId: '160356850970',
    url: 'https://yandex.by/maps/org/loft_trevel/160356850970/reviews/?ll=27.518730%2C53.908686&z=17'
  }
});
