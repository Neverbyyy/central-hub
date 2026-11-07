# @amaya/inapp-kit — готовая сборка дизайн-системы для InApp

Пилот доставки: в InApp нет Tailwind, стоит Vite 4 и цель es2015, поэтому исходники `@amaya/*` он собрать не может. Здесь они собираются
в обычный JS и CSS с внешними `vue`, `vue-i18n` и `@rive-app/webgl2`. Рабочие проекты по-прежнему не трогаем: всё проверяется на своей копии.

- `pnpm --filter @amaya/inapp-kit kit` — сборка в `dist`: `index.js`, `plural.js`, `style.css`, `fonts/`. Типы (`scripts/types.mjs`) пока ручные, в
  настоящем релизе — генерировать.
- Не режим библиотеки: он встроил бы шрифты в CSS как base64.
- `@layer` убирается в `scripts/flatten.mjs` по всему файлу, а не в сборке Vite. Иначе сброс стилей начинает перебивать стили компонентов.
- `plural` — отдельная точка входа: `main.ts` InApp не должен тянуть весь пакет в главный чанк.
- Своих классов `ds:` у папки экрана быть не должно: собрать их в InApp некому. Классы экранов не попадают в `style.css`.
- `templates/dsEnv.ts` — адаптер окружения, кладётся в `src/utils/dsEnv.ts` InApp: `PaywallEnv` поверх его `mitt` и сторов.
- `scripts/deliver-pilot.mjs` — перенос экрана в клон, черновик будущего `pnpm deliver`.
- `scripts/check-inapp.mjs` — сценарий экрана в клоне по мосту InApp; `scripts/check-parity.mjs` — положения элементов против эмулятора.
