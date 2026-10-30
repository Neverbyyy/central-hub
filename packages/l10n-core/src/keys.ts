// Правила имени ключа из «Как называть ключи» (ТЗ, этап 1).
// База проверяет то же самое функцией l10n_key_error — здесь правила нужны,
// чтобы интерфейс, CLI и MCP подсказывали до запроса. Меняя одно, меняй и другое.

export const KEY_ROOTS = ['common', 'app', 'web', 'brand', 'ds', 'test', 'legacy'] as const
export type KeyRoot = typeof KEY_ROOTS[number]

// Начала новых ключей: legacy.* приходит только импортом
export const NEW_KEY_ROOTS = KEY_ROOTS.filter((root): root is Exclude<KeyRoot, 'legacy'> => root !== 'legacy')

export type RegistryKind = 'game' | 'site' | 'brand' | 'test' | 'project'

export interface KeyContext {
  // Допустимые коды из справочника сервиса
  registry: Partial<Record<RegistryKind, readonly string[]>>
  // Коды языков: язык не может быть частью ключа
  languages: readonly string[]
}

export const MIN_SEGMENTS = 3
export const MAX_KEY_LENGTH = 200
export const MAX_VALUE_LENGTH = 5000

// Второй сегмент ключа с этими началами — код из справочника
const ROOT_REGISTRY: Partial<Record<KeyRoot, RegistryKind>> = {
  app: 'game',
  web: 'site',
  brand: 'brand',
  test: 'test',
  legacy: 'project'
}

const KIND_LABEL: Record<RegistryKind, string> = {
  game: 'игры',
  site: 'сайта',
  brand: 'бренда',
  test: 'теста',
  project: 'проекта'
}

const SEGMENT = /^[a-z0-9_]+$/

const isRoot = (value: string): value is KeyRoot => (KEY_ROOTS as readonly string[]).includes(value)

/** Текст ошибки на русском или null, если ключ подходит под схему. */
export function keyError(key: string, ctx: KeyContext): string | null {
  if (!key) return 'Ключ пустой'
  if (key.length > MAX_KEY_LENGTH) return `Ключ длиннее ${MAX_KEY_LENGTH} символов`

  const segments = key.split('.')
  if (segments.some(s => s === '')) return 'В ключе пустая часть: две точки подряд или точка в начале или в конце'

  const [root, code] = segments as [string, ...string[]]
  if (!isRoot(root)) return 'Ключ начинается с common., app., web., brand., ds., test. или legacy.'
  if (segments.length < MIN_SEGMENTS) return 'Слишком короткий ключ: нужно минимум три части, например common.button.continue'

  const kind = ROOT_REGISTRY[root]
  if (kind && !ctx.registry[kind]?.includes(code!)) {
    return `Неизвестный код ${KIND_LABEL[kind]} «${code}» — его нет в справочнике`
  }

  // Старые ключи InApp и Pages Hub импортируются как есть, под прежними именами
  if (root === 'legacy') return null

  const bad = segments.find(s => !SEGMENT.test(s))
  if (bad !== undefined) return `Часть «${bad}»: только строчная латиница, цифры и _`

  if (root === 'test') {
    const inner = segments.slice(2).join('.')
    if (inner.startsWith('test.') || inner.startsWith('legacy.')) return 'После test.<тест>. идёт обычный ключ: common., app., web., brand. или ds.'
    return keyError(inner, ctx)
  }

  // Код из справочника (второй сегмент) не проверяем — его уже проверил справочник
  const withLanguage = segments.slice(kind ? 2 : 1).find(s =>
    ctx.languages.some(lang => s === lang || s.endsWith(`_${lang}`))
  )
  if (withLanguage) return `В ключе не должно быть языка: «${withLanguage}»`

  return null
}

// У нового ключа описание обязательно: где показывается строка и какие у неё ограничения
export const MIN_DESCRIPTION_LENGTH = 10

/**
 * Ошибка имени для нового ключа (форма в интерфейсе, MCP) или null. Строже keyError:
 * legacy.* — строки из файлов проектов, их приносит только импорт.
 */
export function newKeyError(key: string, ctx: KeyContext): string | null {
  // Начало — первым: «legacy» без продолжения — не «короткий ключ», а начало, которое новому ключу нельзя
  const root = key.split('.')[0]!
  if (root === 'legacy') {
    return 'legacy.* — строки из файлов проектов, они приходят только импортом. Новый ключ — по новой схеме: common., app.<игра>., web.<сайт>. … Или возьмите существующую строку из похожих'
  }
  if (key && !isRoot(root)) return `Ключ начинается с ${NEW_KEY_ROOTS.map(r => `${r}.`).join(', ')}`
  return keyError(key, ctx)
}

/** Ошибка описания нового ключа или null. */
export function descriptionError(description: string): string | null {
  const length = description.trim().length
  if (length >= MIN_DESCRIPTION_LENGTH) return null
  return `Опишите, где показывается строка и какие у неё ограничения — от ${MIN_DESCRIPTION_LENGTH} символов (сейчас ${length})`
}

// Ссылка на макет — только figma.com: в панели ключа она открывается в новой вкладке
const FIGMA_URL = /^https:\/\/(www\.)?figma\.com\/\S+$/

/** Ошибка ссылки на Figma или null; пустая ссылка допустима. */
export function figmaUrlError(url: string): string | null {
  const value = url.trim()
  if (!value || (value.length <= 2000 && FIGMA_URL.test(value))) return null
  return 'Ссылка на Figma начинается с https://www.figma.com/'
}

/**
 * Один ключ не может быть началом другого: в JSON `continue` не может быть
 * одновременно строкой и папкой (`common.button.continue` и `common.button.continue.trial`).
 */
export function isPrefixConflict(a: string, b: string): boolean {
  return a !== b && (a.startsWith(`${b}.`) || b.startsWith(`${a}.`))
}
