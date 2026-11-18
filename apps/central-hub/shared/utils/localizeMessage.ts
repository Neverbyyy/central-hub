import type { HubLocale } from './hubLocale'

// Сообщения, которые рождаются по-русски там, где языка интерфейса не знают: правила ключей и текста (l10n-core —
// общий с MCP и CLI), ошибки сервера и базы (raise exception). Их переводят на границе — по каталогу русских шаблонов.
// Не нашёлся шаблон — остаётся русский текст: лучше понятная ошибка по-русски, чем никакой

/** Сообщение и его переводы: [ru, en, uz]. {имя} — подставленная часть: в ru её вырезают, в en и uz вставляют. */
export type MessageEntry = readonly [ru: string, en: string, uz: string]

interface Compiled {
  pattern: RegExp
  names: string[]
  entry: MessageEntry
}

const PARAM = /\{(\w+)\}/g
const COLUMN: Record<Exclude<HubLocale, 'ru'>, 1 | 2> = { en: 1, uz: 2 }
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function compile(entry: MessageEntry): Compiled {
  const names: string[] = []
  // split с группой: нечётные части — имена подстановок
  const source = entry[0].split(/\{(\w+)\}/).map((part, i) => {
    if (i % 2 === 0) return escapeRegExp(part)
    names.push(part)
    return '(.+?)'
  }).join('')
  return { pattern: new RegExp(`^${source}$`, 's'), names, entry }
}

/**
 * Переводчик по каталогу: (текст по-русски, язык) → текст на этом языке. Подставленные части тоже переводятся, если
 * сами есть в каталоге: «Перевод не сохранён: <ошибка проверки>». Ещё два вида составных сообщений — список через «; »
 * и «префикс: сообщение» (путь файла перед ошибкой правила): переводятся те части, что нашлись.
 */
export function createLocalizer(entries: readonly MessageEntry[]) {
  // Регулярные выражения — при первом переводе: на русском они не нужны вовсе
  let compiled: Compiled[] | undefined

  const translate = (text: string, locale: HubLocale, depth = 0): string => {
    if (locale === 'ru' || !text || depth > 2) return text
    compiled ??= entries.map(compile)
    // Список сообщений через «; » — раньше шаблонов: иначе «Ключ «{key}» не найден» захватил бы весь список как один
    // ключ. Список — только если перевелась каждая часть: «Конфликт путей: a; b» — одно сообщение со списком внутри
    const parts = text.includes('; ') ? text.split('; ') : []
    const translatedParts = parts.map(part => translate(part, locale, depth + 1))
    if (parts.length && translatedParts.every((part, i) => part !== parts[i])) return translatedParts.join('; ')
    for (const { pattern, names, entry } of compiled) {
      const match = pattern.exec(text)
      if (!match) continue
      const params = new Map(names.map((name, i) => [name, translate(match[i + 1]!, locale, depth + 1)]))
      return entry[COLUMN[locale]].replace(PARAM, (whole, name: string) => params.get(name) ?? whole)
    }
    if (translatedParts.some((part, i) => part !== parts[i])) return translatedParts.join('; ')
    const colon = text.indexOf(': ')
    if (colon > 0) {
      const head = text.slice(0, colon)
      const tail = text.slice(colon + 2)
      const [newHead, newTail] = [translate(head, locale, depth + 1), translate(tail, locale, depth + 1)]
      if (newHead !== head || newTail !== tail) return `${newHead}: ${newTail}`
    }
    return text
  }

  return (text: string, locale: HubLocale) => translate(text, locale)
}
