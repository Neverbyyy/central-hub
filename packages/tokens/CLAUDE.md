# @amaya/tokens — токены дизайн-системы

JSON в формате W3C Design Tokens → `dist/theme.css` (тема Tailwind), `dist/overrides.css` (темы и размеры),
`dist/tokens.json` (Storybook). Сборка — `pnpm --filter @amaya/tokens build`, тесты — `packages/tokens/test`.

```
src/breakpoints.json       брейкпоинты: токены, варианты ds:large и ds:wide, media картинок — всё отсюда
src/primitives.json        палитра, градиенты, тени, шрифты — компоненты их не видят
src/theme/base.json        смысловые токены: color.*, surface.*, shadow.*, font.*, case.* (base = стиль Amaya Plus)
src/theme/<тема>.json      только отличия темы игры (cars2, farm)
src/size/base/small.json   text.*, spacing.*, radius.*, line.* — до 844 px; medium/large — отличия
src/size/<тема>/<размер>   размеры темы, если свои
```

- Компоненты используют только смысловые токены (`color.cta.bg`, `radius.card`); темы переопределяют именно их.
- Новый токен: сначала в `base` (тема или размер), потом отличия в темах. Тема или размер не могут завести токен,
  которого нет в base, — сборка упадёт с именем токена.
- Значения — из Figma (переменные и стили Антона), не пипеткой по картинке. Если у элемента нет переменной —
  в `$description` написать, откуда значение.
- Имена стиля текста и цвета не должны совпадать: `ds:text-<имя>` иначе неоднозначен (`text.lp-note` и `color.lp.deep`).
- Новая игра — новый файл `src/theme/<игра>.json` (+ `THEMES` в `scripts/tokens.mjs` и `DS_THEMES` в ui), компоненты не меняются.
