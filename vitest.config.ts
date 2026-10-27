import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['packages/*/test/**/*.test.ts']
        }
      },
      {
        // Ходят в настоящую базу Supabase из .env
        test: {
          name: 'db',
          include: ['tests/db/**/*.test.ts'],
          setupFiles: ['tests/db/setup.ts'],
          testTimeout: 30_000,
          // Тесты пишут в один якорный ключ — параллельно им нельзя
          fileParallelism: false
        }
      }
    ]
  }
})
