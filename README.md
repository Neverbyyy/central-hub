# Amaya Hub

Монорепозиторий веб-инструментов Amaya. Сейчас в нём сервис локализации — единое место,
где живут все тексты продуктов и откуда они выгружаются в код, в Figma и доступны нейросетям по MCP.

```
apps/central-hub/      сервис локализации (Nuxt 4, Nuxt UI 4, Tailwind 4)
packages/l10n-core/    правила ключей — общие для сервера, CLI и MCP
supabase/              миграции базы (Supabase CLI)
tests/db/              автотесты базы: права, правила ключей, история
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

## Деплой

Vercel: Root Directory — `apps/central-hub`, переменные окружения — как в `.env.example`
(без `SUPABASE_DB_PASSWORD`), плюс `ENABLE_EXPERIMENTAL_COREPACK=1`, чтобы Vercel взял pnpm из `packageManager`.

## Что не попадает в репозиторий

`.env`, `public/data.json` (выгрузка Mixpanel с ID пользователей) и бэкапы страниц — см. `.gitignore`.
