// Линтер дизайн-системы и Storybook (packages/tokens, ui, locales, apps/storybook) — тот же стиль, что у сервиса.
// У apps/central-hub свой конфиг (@nuxt/eslint). Правила дизайн-системы (hex, классы без ds:, <img>, API Vue новее 3.3)
// появятся вместе с линтером дизайн-системы
import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

export default createConfigForNuxt({
  features: {
    // Сам он включает TypeScript, только если пакет typescript есть у проекта — у tokens и locales его нет
    typescript: true,
    stylistic: {
      commaDangle: 'never',
      braceStyle: '1tbs'
    }
  }
}).append({
  ignores: ['apps/central-hub/**', '**/dist/**', '**/storybook-static/**', '**/.turbo/**']
})
