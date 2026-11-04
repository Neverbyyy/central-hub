# @amaya/ui — компоненты Ds* и пресет Tailwind

Список всех компонентов с пропсами, событиями и «когда использовать» — `manifest.md` (собирается из кода).

## Компонент

- Файл `src/components/Ds<Имя>.vue`, экспорт — в `src/index.ts`, история — рядом: `Ds<Имя>.stories.ts`.
- В начале `<script setup>` — JSDoc: что это, когда использовать, вид (какие токены), поведение. Из него строится манифест.
  Комментарий `//` над пропом — его пояснение в манифесте.
- Тексты приходят снаружи (пропсы и слоты, уже переведённые), подписи для скринридера — тоже пропсом. Компонент
  сам не переводит, не шлёт аналитику (только событие наружу) и не знает про InApp.
- Только токены и классы `ds:`. Нужен размер или цвет — токен в `packages/tokens` (`spacing.*`, `color.*`), не `[12px]`.
- Нажимаемое: `usePressed` («нажато» на касании → `data-pressed`), `useTapGuard` (двойной тап), зона ≥ 44
  (`ds:min-h-touch` или невидимый слой). Анимация — `transform` и `opacity`, длительность `--ds-duration-*`.
- Появление на экране — `useInView(элемент, обработчик)`: подписка и отписка в одном месте, без `IntersectionObserver` считает, что видно.
- Vue 3.3: `withDefaults(defineProps<…>(), …)`, `const props = …`, `ref<HTMLElement | null>(null)` вместо useTemplateRef,
  id — от пропа `id` (одинаковые на сервере и в браузере), не счётчиком.
- Компонент с классом `ds:relative` внутри нельзя позиционировать `ds:absolute` снаружи — оберни в div.
- После правки пропсов или JSDoc — `pnpm --filter @amaya/ui manifest` (lint падает, если манифест устарел).

## Пресет

`src/tailwind.css`: `@import '@amaya/ui/tailwind.css'` в приложении. Брейкпоинты: `ds:medium:` (844), `ds:large:`
(844 и высота от 600 — iPad, планшеты), `ds:wide:` (640 — раскладка лендинга), `ds:phone-landscape:`; значения —
`packages/tokens/src/breakpoints.json`, `ds:large:` и `ds:wide:` собираются из него. Утилиты: `ds:surface-*` (заливка
цветом или градиентом), `ds:case-*` (регистр из темы), `ds:h-vh`, `ds:pt-safe`, `ds:no-select`.

## Картинки

`src/image.ts`: `imageSet('/путь/имя')` — 12 файлов по конвенции; `imageSetFromFiles(files, './art/имя')` — из
`import.meta.glob` папки экрана (small обязателен, wide/medium/large — если есть).
