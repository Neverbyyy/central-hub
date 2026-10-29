// Переменные Figma из строк сервиса. Два вида выгрузки:
// - плагин «Amaya Hub — тексты» (packages/figma-plugin) получает плоский список переменных — figmaVariables;
// - встроенный импорт Figma (W3C Design Tokens, DTCG) — файл на каждый язык, каждый файл становится режимом.
// Имя переменной — ключ с / вместо точек, поэтому в Figma получается дерево групп: app → cars2 → paywall.
// Справка: https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables

export interface FigmaSourceRow {
  technical_key: string
  translations: Record<string, string | null | undefined>
  description?: string | null
}

export interface FigmaToken {
  $type: 'string'
  $value: string
  $description?: string
}

export interface FigmaGroup {
  [name: string]: FigmaGroup | FigmaToken
}

export interface FigmaVariable {
  key: string
  name: string
  description: string
  // Язык → текст; нет перевода — пустая строка
  values: Record<string, string>
}

/** Имя переменной в Figma: части ключа становятся группами, точки — `/`. */
export const figmaName = (key: string) => key.split('.').join('/')

const languageNames = new Intl.DisplayNames(['en'], { type: 'language' })

/** Имя режима в Figma — английское название языка: English, Russian, German… */
export const figmaModeName = (code: string) => languageNames.of(code) ?? code

const byKey = (rows: FigmaSourceRow[]) => [...rows].sort((a, b) => a.technical_key.localeCompare(b.technical_key))

/**
 * Ключи, которые нельзя превратить в переменные Figma: часть, которую DTCG поймёт иначе, ключ внутри
 * другой строки (переменная не может быть группой) и повтор. Ошибка, а не молчаливая потеря.
 */
function assertFigmaKeys(rows: FigmaSourceRow[]) {
  const keys = new Set<string>()
  for (const { technical_key: key } of byKey(rows)) {
    const parts = key.split('.')
    // DTCG: имя не пустое, не начинается с $ и без фигурных скобок
    const bad = parts.find(part => !part || part.startsWith('$') || /[{}]/.test(part))
    if (bad !== undefined) throw new Error(`Ключ «${key}» нельзя выгрузить в Figma: часть «${bad}»`)
    if (keys.has(key)) throw new Error(`Ключ «${key}» встречается дважды`)
    keys.add(key)
  }
  for (const key of keys) {
    const parts = key.split('.')
    for (let i = 1; i < parts.length; i++) {
      const outer = parts.slice(0, i).join('.')
      if (keys.has(outer)) throw new Error(`Ключ «${key}» вложен в строку «${figmaName(outer)}»`)
    }
  }
}

/** Переменные для плагина: по одной на ключ, тексты всех выбранных языков. */
export function figmaVariables(rows: FigmaSourceRow[], { languages }: { languages: string[] }): FigmaVariable[] {
  assertFigmaKeys(rows)
  return byKey(rows).map(row => ({
    key: row.technical_key,
    name: figmaName(row.technical_key),
    description: row.description ?? '',
    values: Object.fromEntries(languages.map(lang => [lang, row.translations?.[lang] ?? '']))
  }))
}

/**
 * Файлы для встроенного импорта: язык → дерево групп. Каждый ключ есть в каждом файле — Figma создаёт
 * переменную, только если она нашлась во всех импортируемых файлах. Нет перевода — пустая строка:
 * в макете сразу видно, чего не хватает.
 */
export function figmaModeFiles(rows: FigmaSourceRow[], { languages }: { languages: string[] }): Record<string, FigmaGroup> {
  assertFigmaKeys(rows)
  const files: Record<string, FigmaGroup> = Object.fromEntries(languages.map(lang => [lang, {}]))

  for (const row of byKey(rows)) {
    const parts = row.technical_key.split('.')
    for (const lang of languages) {
      let group = files[lang]!
      for (const part of parts.slice(0, -1)) group = (group[part] ??= {}) as FigmaGroup
      group[parts.at(-1)!] = {
        $type: 'string',
        $value: row.translations?.[lang] ?? '',
        ...(row.description ? { $description: row.description } : {})
      }
    }
  }
  return files
}
