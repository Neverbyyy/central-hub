// Линтер дизайн-системы и Storybook (packages/tokens, ui, icons, locales, apps/storybook) — тот же стиль, что у сервиса.
// У apps/central-hub свой конфиг (@nuxt/eslint). Остальные правила дизайн-системы (hex, классы без ds:, <img>)
// появятся вместе с линтером дизайн-системы
import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

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
  ignores: ['apps/central-hub/**', '**/dist/**', '**/storybook-static/**', '**/.turbo/**']
}, {
  // Всё, что потом переносят в InApp: компоненты, шаблоны пейволлов и папки экранов
  files: ['packages/ui/src/**/*.{ts,vue}', 'packages/paywall-kit/src/**/*.{ts,vue}', 'apps/inapp-preview/src/variants/**/*.{ts,vue}'],
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
