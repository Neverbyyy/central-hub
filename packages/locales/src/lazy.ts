/// <reference types="vite/client" />
// Тексты по одному языку — для лендингов: странице на телефоне не нужны все 9 языков сразу, каждый язык —
// отдельный чанк. Отдельная точка входа: @amaya/locales грузит все языки статически, и сборщик не смог бы
// вынести их в чанки, если бы оба способа жили в одном модуле
import type { Messages } from './types'

const lazy = import.meta.glob<Messages>('./*.json', { import: 'default' })

export const locales = Object.keys(lazy).map(path => path.slice(2, -'.json'.length))

export async function loadMessages(lang: string): Promise<Messages | undefined> {
  return lazy[`./${lang}.json`]?.()
}

export { pluralRules } from './plural'
export type { Messages } from './types'
