# Amaya Hub

Монорепозиторий веб-инструментов Amaya. Сейчас в нём сервис локализации — единое место,
где живут все тексты продуктов и откуда они выгружаются в код, в Figma и доступны нейросетям по MCP.

```
apps/central-hub/      сервис локализации (Nuxt 4, Nuxt UI 4, Tailwind 4)
packages/l10n-core/    правила ключей и форматы файлов локалей — общие для сервера, CLI и MCP
packages/l10n-cli/     CLI amaya-l10n: pull / diff / check / import
supabase/              миграции базы (Supabase CLI)
fixtures/legacy/       копии файлов локалей InApp и Pages Hub — для автотеста выгрузки
tests/db/              автотесты базы: права, правила ключей, история, импорт и выгрузка
```

Решения, принятые по ходу работы, — в [DECISIONS.md](DECISIONS.md).

## Как устроен доступ

- Сервис закрыт общим паролем (`NUXT_HUB_PASSWORD`) и спрашивает имя — им подписываются правки в истории.
- Браузер **только читает** из Supabase публичным ключом: ключи, языки, справочник.
  Права на запись и вызов изменяющих функций у публичного ключа отобраны миграцией `lockdown`,
  это проверяет `tests/db/security.test.ts`.
- Все изменения идут через серверные маршруты `apps/central-hub/server/api/*` с секретным ключом.
- Строки не удаляются — только помечаются устаревшими. Правила имени ключа проверяет сама база.

## Установка

Нужны Node.js 22 и pnpm 10 (`corepack enable` или `npx pnpm@10.33.2 …`).

```bash
pnpm install
cp .env.example .env   # и заполнить значения
```

## Команды

```bash
pnpm dev          # сервис на http://localhost:3000
pnpm build        # сборка apps/central-hub
pnpm lint
pnpm typecheck
pnpm test         # unit-тесты packages/*
pnpm test:db      # тесты базы из .env (пишут в служебный ключ common.selftest.anchor.default)
```

## База

Миграции лежат в `supabase/migrations` и применяются Supabase CLI:

```bash
pnpm exec supabase login                               # один раз
pnpm exec supabase link --project-ref <project-ref>    # один раз, спросит пароль базы
pnpm db:push                                           # применить новые миграции
pnpm db:new <name>                                     # создать миграцию
```

Справочники (языки, коды игр и сайтов) — тоже в миграциях, seed не используется:
строки приходят импортом из InApp и Pages Hub.

## Создание ключей

Кнопка «Новый ключ» над гридом. Имя проверяется на лету по правилам «Как называть ключи»
(`packages/l10n-core/src/keys.ts`, те же правила держит база), описание обязательно, текст проверяется
на подстановки, экранирование `@ { } | $`, HTML и капс (`text-checks.ts`). Рядом — похожие строки
(`pg_trgm`): сначала стоит взять существующий ключ. Неизвестный код игры, сайта, бренда или теста
добавляется в справочник прямо из формы. Тексты из интерфейса — черновики (`draft`).

## MCP для нейросетей

`POST /mcp` — MCP-сервер (Streamable HTTP без сессий), токен `NUXT_MCP_TOKEN`. Инструменты:
`search_strings`, `get_string`, `find_similar`, `get_key_tree`, `list_registry`, `create_key`,
`write_draft_translation`, `list_untranslated`, `check_text`.

- `create_key` требует описание и не создаёт ключ, если есть похожая строка (≥ 60 %), пока в
  `not_duplicate_reason` не объяснено, чем новая отличается.
- Тексты нейросети сохраняются со статусом «от ИИ» (`ai`). Утверждать, удалять и переименовывать нечем,
  а перезаписать текст человека не даёт сама база (`set_ai_translation`).

Подключение в Claude Code — `.mcp.json` в корне проекта (как в этом репозитории) и переменная `AMAYA_HUB_TOKEN`:

```json
{ "mcpServers": { "amaya-hub": { "type": "http", "url": "https://central-hub-sigma.vercel.app/mcp",
  "headers": { "Authorization": "Bearer ${AMAYA_HUB_TOKEN}" } } } }
```

## Выгрузка в проекты — CLI `amaya-l10n`

Набор выгрузки (`export_sets`) описывает, какие ключи и языки кладутся в какие файлы проекта.
Сейчас два набора: `inapp` → `src/locales/{lang}.json` и `pages_hub` → `i18n/locales/{lang}.json`, 9 языков.
В них идут старые строки проекта (`legacy.inapp.` / `legacy.pages_hub.`) и новые ключи:
у InApp — `common. app. brand. ds. test.`, у Pages Hub — `common. web. brand. ds. test.`.
Служебные ключи автотестов (`common.selftest.`) не выгружаются никогда.
Остальные файлы проектов (у InApp — `ja`, `zh`, `src/locales/new/*`) CLI не читает и не трогает.

В корне проекта — `amaya-l10n.json`, токен — переменная `AMAYA_L10N_TOKEN` (на сервере это `NUXT_CLI_TOKEN`):

```json
{ "hub": "https://central-hub-sigma.vercel.app", "set": "inapp" }
```

```bash
node packages/l10n-cli/amaya-l10n.mjs pull    # забрать файлы и показать, что изменилось по языкам
node packages/l10n-cli/amaya-l10n.mjs diff    # то же без записи; код 1, если есть разница
node packages/l10n-cli/amaya-l10n.mjs check   # файлы не правили руками после pull; код 1, если правили
node packages/l10n-cli/amaya-l10n.mjs import  # занести текущие файлы проекта как есть (legacy.<проект>.)
```

CLI — один файл без зависимостей (Node.js 18+), его можно запускать из любого проекта (`--cwd <папка>`).

**Как устроена выгрузка.** Импорт сохраняет каждый файл шаблоном, а выгрузка меняет в шаблоне только
изменившиеся строки (`packages/l10n-core/src/locale-file.ts`). Без правок файл совпадает с исходным байт в байт —
с пустыми строками, порядком ключей и ручным форматированием, — а `pull` даёт в проекте diff ровно
по изменённым строкам. Это проверяют `packages/l10n-core/test/locale-file.test.ts` на копиях из
`fixtures/legacy/` и `tests/db/legacy.test.ts` на настоящей базе. Если новый ключ совпадает со старым,
выгрузка падает с ошибкой, а не перезаписывает молча.

## Деплой

Vercel: Root Directory — `apps/central-hub`, переменные окружения — как в `.env.example`
(без `SUPABASE_DB_PASSWORD`), плюс `ENABLE_EXPERIMENTAL_COREPACK=1`, чтобы Vercel взял pnpm из `packageManager`.

## Что не попадает в репозиторий

`.env`, `public/data.json` (выгрузка Mixpanel с ID пользователей) и бэкапы страниц — см. `.gitignore`.
