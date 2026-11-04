---
name: ds-new-landing
description: Собрать новый лендинг игры Amaya в apps/landings — конфиг LandingConfig, арт, тексты web.<сайт>.*, тема lp.* — из блоков landing-kit. Использовать, когда нужен лендинг с кнопкой в стор.
---

# Новый лендинг

Лендинг — конфиг (`packages/landing-kit/src/config.ts`) и арт; страницу собирает `LkPage` из блоков Lk*.

1. **Код сайта** — в справочнике сервиса (`list_registry` kind=site), всегда `lp_<игра>` (`lp_cars2`, `lp_farm`):
   набор выгрузки `ds` берёт все лендинги началом `web.lp_`, и тексты нового лендинга попадут в `packages/locales`
   без правки набора. Кода нет — попросить человека завести (через MCP нельзя): «Новый ключ» → `web.lp_<игра>` →
   «+ добавить сайт в справочник», название «Лендинг <Игра>».
2. **Папка** `apps/landings/app/landings/<путь>/`: `config.ts` — `defineLanding` из `app/shared/landing.ts` по образцу `cars2/config.ts`
   (значки, логотип и футер там уже есть), `art/`. Подключить в
   `app/landings/index.ts`. Путь станет адресом: `/<путь>`, `/<путь>/ru`…
3. **Конфиг**: тема игры, ссылки в сторы (полные адреса App Store и Google Play), значки, логотип, первый экран
   (арт, тексты, две плашки; Rive — только если анимация есть в макете или её прямо попросили: украшения сверх
   макета не добавляем), преимущества, видео (ролик + постер — первый кадр ролика), отзывы, FAQ, документы в футере,
   `stickyCta`.
4. **Тексты** — `web.<сайт>.*` (`ds-add-strings`), общие — `common.button.play_free`, `common.link.*`,
   `common.legal.all_rights_reserved`, `ds.*`.
5. **Вид** — токены `lp.*` в теме игры (`packages/tokens/src/theme/<игра>.json`: `color.lp.*`, `surface.cta-lp`,
   `surface.lp-card`, `shadow.*`); размеры `text.lp-*`, `spacing.lp-*` — общие. Блоки не меняются.
6. **Арт**: первый экран — две обрезки (`hero-small` телефон, `hero-wide` от 640 px), остальное — `small` (колонка ≤ 768);
   webp ≈ 0,8, 1x и 2x. Тяжёлое (ролик, Rive) грузится по требованию само.
7. **История** — файл в `apps/storybook/stories` по образцу `LandingFarm.stories.ts` (`landingStory(config)`).
8. **Проверка** (`ds-self-check`) плюс `pnpm --filter @amaya/landings check` после сборки (сторы, UTM, `track`, FAQ,
   видео, 404, noindex, все языки, ширина 320–1440 — новый лендинг попадает туда сам) и Lighthouse по собранной статике
   (`pnpm turbo run build --filter=@amaya/landings` → `apps/landings/.output/public`): LCP < 2,5 с, CLS ≈ 0.
