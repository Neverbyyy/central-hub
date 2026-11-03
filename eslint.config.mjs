// Линтер дизайн-системы и Storybook (packages/*, apps/storybook, apps/inapp-preview) — тот же стиль, что у сервиса.
// У Nuxt-приложений свой конфиг (@nuxt/eslint): apps/central-hub — свой, apps/landings — те же правила
// дизайн-системы из tools/eslint/rules.mjs. Правила: без текста в шаблоне, классы ds:, без hex и px, <img> → DsImage
import { createConfigForNuxt } from '@nuxt/eslint-config/flat'
import { designSystemRules, screenRules } from './tools/eslint/rules.mjs'

// Что уходит в продукты (InApp, Pages Hub): компоненты, шаблоны пейволлов, блоки лендингов, папки экранов.
// Истории и демо-данные Storybook — инструменты, им можно
const PRODUCT = ['packages/ui/src/**/*.{ts,vue}', 'packages/paywall-kit/src/**/*.{ts,vue}', 'packages/landing-kit/src/**/*.{ts,vue}', 'apps/inapp-preview/src/variants/**/*.{ts,vue}']
const TOOLING = ['**/*.stories.ts', 'packages/ui/src/stories/**']
// Блоки и экраны — только из компонентов; сами компоненты (DsImage, DsVideo, DsRive) теги и реализуют
const SCREENS = ['packages/paywall-kit/src/**/*.vue', 'packages/landing-kit/src/**/*.vue', 'apps/inapp-preview/src/variants/**/*.vue']

// Компоненты потом встраивают в InApp, а там Vue 3.3: возможности новее нельзя
const VUE_33 = 'В InApp Vue 3.3 — этого там нет'

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
  // У Nuxt-приложений свой конфиг (@nuxt/eslint)
  ignores: ['apps/central-hub/**', 'apps/landings/**', '**/dist/**', '**/storybook-static/**', '**/.turbo/**']
}, {
  files: PRODUCT,
  ignores: TOOLING,
  ...designSystemRules
}, {
  files: SCREENS,
  ...screenRules
}, {
  // Всё, что потом переносят в InApp и Pages Hub: компоненты, шаблоны пейволлов, блоки лендингов и папки экранов
  files: PRODUCT,
  rules: {
    'no-restricted-imports': ['error', {
      paths: [{ name: 'vue', importNames: ['useTemplateRef', 'useId', 'onWatcherCleanup', 'useModel', 'useHost', 'useShadowRoot'], message: `${VUE_33} (Vue 3.4–3.5)` }]
    }],
    'no-restricted-syntax': ['error',
      { selector: 'CallExpression[callee.name=\'defineModel\']', message: `defineModel — Vue 3.4. ${VUE_33}: проп modelValue и событие update:modelValue` },
      { selector: 'VariableDeclarator[id.type=\'ObjectPattern\'] > CallExpression[callee.name=\'defineProps\']', message: `Деструктуризация пропсов — Vue 3.5. ${VUE_33}: const props = defineProps(...)` },
      { selector: 'VariableDeclarator[id.type=\'ObjectPattern\'] > CallExpression[callee.name=\'withDefaults\']', message: `Деструктуризация пропсов — Vue 3.5. ${VUE_33}: const props = withDefaults(...)` }
    ]
  }
}, {
  // Папка экрана устроена как вариант InApp: экран — её index.vue
  files: ['apps/inapp-preview/src/variants/**/index.vue'],
  rules: {
    'vue/multi-word-component-names': 'off'
  }
})
