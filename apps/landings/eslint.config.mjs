// @ts-check
// Конфиг Nuxt плюс правила дизайн-системы, как у пакетов: без текста в шаблоне, классы ds:, без hex и px,
// картинка — DsImage (tools/eslint/rules.mjs)
import { designSystemRules, screenRules } from '../../tools/eslint/rules.mjs'
import withNuxt from './.nuxt/eslint.config.mjs'

// app/pages/index.vue — оглавление стенда для команды (какие лендинги и языки есть), а не лендинг: подписи по-русски
// и свой CSS, как у эмулятора и Storybook
const TOOLING = ['app/pages/index.vue']

export default withNuxt(
  { files: ['app/**/*.{ts,vue}'], ignores: TOOLING, ...designSystemRules },
  { files: ['app/**/*.vue'], ignores: TOOLING, ...screenRules }
)
