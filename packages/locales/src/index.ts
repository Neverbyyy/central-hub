/// <reference types="vite/client" />
// Тексты набора выгрузки ds из сервиса локализации — только утверждённые. Файлы <язык>.json кладёт
// `pnpm l10n pull`, руками их не правят (`pnpm l10n check` это ловит). Формат — вложенный JSON для vue-i18n.
// Тексты попадают в Storybook, пейволлы и лендинги при сборке — сервис во время работы никто не спрашивает.
// Здесь — все языки сразу (Storybook, эмулятор: язык переключают на лету); лендингам — @amaya/locales/lazy
import { sortLanguages } from './languages'
import type { Messages } from './types'

export type { Messages } from './types'
export { languageLabel } from './languages'
export { pluralRules } from './plural'

// Языки берутся из файлов набора: добавили язык в сервисе — после pull он появится и здесь
const files = import.meta.glob<Messages>('./*.json', { eager: true, import: 'default' })

export const messages: Record<string, Messages> = Object.fromEntries(
  Object.entries(files).map(([path, content]) => [path.slice(2, -'.json'.length), content])
)

export const locales = sortLanguages(Object.keys(messages))

/** Плоский список «ключ → текст» одного языка: common.button.continue.default → Continue. */
export function flatMessages(tree: Messages = {}, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [name, value] of Object.entries(tree)) {
    const key = prefix ? `${prefix}.${name}` : name
    if (typeof value === 'string') out[key] = value
    else Object.assign(out, flatMessages(value, key))
  }
  return out
}
