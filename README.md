# Loft Travel reviews collector

Ежедневный браузерный сбор публичных отзывов Loft Travel из Google Maps и Яндекс Карт. Результат публикуется через GitHub Pages в `reviews.v1.json`; фотографии уменьшаются и конвертируются в WebP.

## Что собирается

- источник и стабильный ID (либо детерминированный fingerprint);
- имя, публичный профиль и аватар автора;
- оценка, текст и дата;
- до четырёх доступных фотографий отзыва;
- ссылка на исходную карточку организации.

Ответы компании и дополнительные данные профиля не собираются. CAPTCHA, авторизация и ограничения площадок не обходятся.

## Даты Google

Относительная дата (`неделю назад`, `2 месяца назад`) преобразуется в приблизительную календарную дату в часовом поясе `Europe/Minsk`. Расчёт фиксируется при первом обнаружении отзыва и не сдвигается при следующих запусках. Исходная подпись и признак `published_at_is_approximate` сохраняются.

## Локальный запуск

```bash
npm install
npx playwright install chromium
npm test
npm run collect
npm run validate
```

Переменные окружения:

- `PUBLIC_BASE_URL` — адрес GitHub Pages без завершающего `/`;
- `HEADLESS=0` — показать браузер для диагностики;
- `MAX_PHOTOS_PER_REVIEW` — максимум фото, по умолчанию 4;
- `MIN_REVIEWS_PER_SOURCE` — sanity limit, по умолчанию 5.

## Публикация

Workflow запускается ежедневно в 03:23 по Минску и вручную через **Actions → Collect reviews → Run workflow**. В настройках репозитория необходимо выбрать **Settings → Pages → Source: GitHub Actions**.

Публичные файлы:

- `https://lofttravel.github.io/lofttravel_rewies/reviews.v1.json`
- `https://lofttravel.github.io/lofttravel_rewies/manifest.json`

При CAPTCHA, неожиданно малом количестве карточек или падении источника last-good файл не перезаписывается. Диагностические HTML и screenshot хранятся в artifact не более семи дней.
