// @ts-check
// Конфиг Nuxt плюс правила дизайн-системы, как у пакетов: без текста в шаблоне, классы ds:, без hex и px,
// картинка — DsImage (tools/eslint/rules.mjs)
import { designSystemRules, screenRules } from '../../tools/eslint/rules.mjs'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  { files: ['app/**/*.{ts,vue}'], ...designSystemRules },
  { files: ['app/**/*.vue'], ...screenRules }
)
