# Amaya: сервис локализации, дизайн-система, пейволлы и лендинги

Монорепо pnpm + Turborepo. Подробно — README.md, принятые решения — DECISIONS.md. В каждом пакете свой CLAUDE.md.

## Что где

```
apps/central-hub      сервис локализации (Nuxt 4) — тексты всех продуктов, MCP на /mcp
apps/storybook        витрина: пейволлы и лендинги целиком, компоненты, Rive, токены
apps/inapp-preview    экраны пейволлов как варианты InApp: src/variants/ios/as/<игра>/ds1/<экран>/
apps/landings         лендинги (Nuxt 4, prerender): app/landings/<путь>/config.ts + art/
packages/tokens       токены → CSS-переменные и тема Tailwind; темы base, cars2, farm, cars2-go
packages/ui           компоненты Ds* и пресет Tailwind (ds:); манифест — packages/ui/manifest.md
packages/paywall-kit  интерфейс окружения InApp, usePaywall, шаблоны Pw*
packages/landing-kit  конфиг лендинга, track, ссылки в сторы с UTM, блоки Lk*
packages/nuxt         Nuxt-модуль: всё для лендинга одной строкой
packages/locales      утверждённые тексты набора ds (pnpm l10n pull); руками не правится
packages/art          арт, общий для экранов и лендингов: один файл на все продукты
packages/icons, pricing, l10n-core, l10n-cli
tools/eslint          правила дизайн-системы; tools/figma — дерево фрейма и выгрузка арта по REST; tools/check-art.mjs — арт без копий
```

## Команды

`pnpm install` · `pnpm build` (всё, с кешем turbo) · `pnpm test` · `pnpm storybook` (6006) ·
`pnpm --filter @amaya/landings dev` (3020) · `pnpm --filter @amaya/inapp-preview dev` (6020, эмулятор InApp) ·
`pnpm --filter @amaya/inapp-preview scenarios` (сценарии ТЗ для пейволлов и онбординга) ·
`pnpm --filter @amaya/landings check` (проверки лендингов в браузере, после сборки) ·
`pnpm turbo run lint typecheck --filter=@amaya/storybook... --filter=@amaya/inapp-preview... --filter=@amaya/landings...` ·
`pnpm --filter @amaya/ui manifest` — пересобрать манифест после правки компонента.

## Правила — всегда

1. **Строк в коде нет.** Только ключи из сервиса: `t('web.lp_cars2.hero.title')`. Новый текст — скилл `ds-add-strings`
   (MCP `amaya-hub`: похожие строки → ключ с описанием → черновые переводы). Линтер ловит текст в шаблоне.
   Ручные переносы из макета не переносим: заголовкам — `ds:text-balance`. Пока ключи не утверждены, в сборке видны
   сами ключи — это нормально; утверждает и выгружает человек.
2. **Экран — только из готовых деталей.** Сначала `packages/ui/manifest.md` (компоненты Ds*, шаблоны Pw*, блоки Lk*).
   Не хватает детали — сначала проверь, не решается ли настройкой (проп, токен темы); новый компонент — скилл
   `ds-new-component`, в `packages/ui`, а не в папке экрана.
3. **Только токены.** Классы — с префиксом `ds:` (`ds:bg-cta-bg`, `ds:p-4`, `ds:text-title-lg`); никаких hex, px,
   `ds:bg-[#…]`, `style="color: …"`. Нужного токена нет — добавь его в `packages/tokens` (значение — из Figma).
4. **Картинки — `DsImage`** с набором по конвенции `<имя>-{small,wide,medium,large}{,@2x}.{png,webp}` из папки экрана:
   `imageSetFromFiles(import.meta.glob('./art/*.{png,webp}', { query: '?url', import: 'default', eager: true }), './art/имя')`.
   Копий арта нет: нужно двум продуктам — `packages/art`; размер, который повторяет меньший, не храним (`DsImage` сам берёт
   меньший); лендингу — только webp. Проверяет `tools/check-art.mjs`.
   `<img>`, `<video>`, `<canvas>` в экранах и блоках запрещены линтером: `DsImage`, `DsVideo`, `DsRive`.
5. **Vue 3.3, как в InApp:** без `defineModel`, `useTemplateRef`, `useId`, деструктуризации пропсов (линтер).
   Без `gap` во flex (старые вебвью), `:has()`, container queries, `Array.prototype.at`.
6. **Отклик:** нажатие видно на касании (`usePressed`), зона ≥ 44×44, двойной тап — одно срабатывание (`useTapGuard`),
   анимируются только `transform` и `opacity`. Тяжёлое (Rive, видео) — по требованию.
7. **Рабочие проекты не трогаем:** InApp, Pages Hub, Hyper, Auth, бэкенды — только читать и копировать файлы себе.
8. **Готово — после самопроверки** (скилл `ds-self-check`): линтер, типы, тесты, история в Storybook, скриншот рядом
   с макетом. На настоящем телефоне проверяет человек.

## Скиллы

`ds-screen-from-figma` — экран по фрейму Figma · `ds-new-paywall` · `ds-new-landing` · `ds-new-component` ·
`ds-add-strings` · `ds-self-check`.

## Figma

Макеты Cars 2 и Farm: файл `Nu52yK50BBS8zhwXMQAjjx`. Figma MCP на этом аккаунте — 6 вызовов в месяц, поэтому дерево
и арт — по REST: `node tools/figma/node.mjs <ссылка на фрейм>`, `node tools/figma/export.mjs <ссылка> <папка> render|fills <id>`
(токен `FIGMA_ACCESS_TOKEN` в `.env`). Компонент в Figma называется как в коде без префикса: `PlanCard` ↔ `DsPlanCard`.
