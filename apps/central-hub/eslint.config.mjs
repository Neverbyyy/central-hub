// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  // Типы схемы Supabase генерирует pnpm db:types — руками не правятся
  ignores: ['app/types/database.types.ts']
})
