import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          // tests/unit — серверный код без базы, например выгрузка в GitHub на поддельном API
          include: ['packages/*/test/**/*.test.ts', 'tests/unit/**/*.test.ts']
        }
      },
      {
        // Только локальный Supabase (pnpm db:start): тесты пишут и импортируют fixtures
        test: {
          name: 'db',
          include: ['tests/db/**/*.test.ts'],
          globalSetup: ['tests/db/global-setup.ts'],
          setupFiles: ['tests/db/setup.ts'],
          testTimeout: 30_000,
          // Тесты пишут в один якорный ключ — параллельно им нельзя
          fileParallelism: false
        }
      },
      {
        // Права настоящего стенда из .env: публичный ключ ничего не может записать
        test: {
          name: 'stand',
          include: ['tests/db/security.test.ts'],
          setupFiles: ['tests/db/stand-setup.ts'],
          testTimeout: 30_000
        }
      }
    ]
  }
})
