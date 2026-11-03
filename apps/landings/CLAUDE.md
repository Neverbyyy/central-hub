# apps/landings — лендинги на Nuxt 4

Одно приложение, лендинги по путям: `/cars2` (английский), `/cars2/<язык>`. Все страницы собираются заранее
(prerender) — на Vercel это статичный HTML. Дизайн-система подключена модулем `@amaya/nuxt` одной строкой.

- Лендинг — папка `app/landings/<путь>/`: `config.ts` (`LandingConfig` из `@amaya/landing-kit`) и `art/` (картинки по
  конвенции, ролик, значки сторов, `.riv`). Подключить в `app/landings/index.ts`. Страницы для сборки nuxt.config
  находит по папкам, языки — по файлам `packages/locales/src`.
- Страница — `app/pages/[landing]/[[lang]].vue`: 404 для неизвестного, `await useLocale(lang)` (только язык страницы),
  мета-теги из ключей, noindex.
- Тексты — ключи сервиса (`web.<сайт>.*`); пока ключи не утверждены, в собранной странице видны сами ключи —
  утверждение и выгрузка (набор `ds`) — за человеком.
- Проверка: `pnpm --filter @amaya/landings dev` (3020), сборка — `pnpm turbo run build --filter=@amaya/landings`,
  Lighthouse — по собранной статике `.output/public` (мобильный: LCP < 2,5 с, CLS ≈ 0).
- Линтер — Nuxt плюс правила дизайн-системы (`tools/eslint/rules.mjs`).
