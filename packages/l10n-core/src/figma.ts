// Переменные Figma из строк сервиса — в формате встроенного импорта Figma (W3C Design Tokens, DTCG):
// файл на каждый язык, и каждый файл при импорте становится режимом коллекции.
// Вложенные группы Figma превращает в имена через /, поэтому в Figma получается дерево: app → cars2 → paywall.
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

/** Имя переменной в Figma: части ключа становятся группами, точки — `/`. */
export const figmaName = (key: string) => key.split('.').join('/')

const isToken = (node: FigmaGroup | FigmaToken | undefined): node is FigmaToken => !!node && '$value' in node

/**
 * Файлы для импорта: язык → дерево групп. Каждый ключ есть в каждом файле — Figma создаёт
 * переменную, только если она нашлась во всех импортируемых файлах. Нет перевода — пустая строка:
 * в макете сразу видно, чего не хватает.
 */
export function figmaModeFiles(rows: FigmaSourceRow[], { languages }: { languages: string[] }): Record<string, FigmaGroup> {
  const files: Record<string, FigmaGroup> = Object.fromEntries(languages.map(lang => [lang, {}]))

  for (const row of [...rows].sort((a, b) => a.technical_key.localeCompare(b.technical_key))) {
    const parts = row.technical_key.split('.')
    // DTCG: имя не пустое, не начинается с $ и без фигурных скобок — иначе Figma поймёт его иначе
    const bad = parts.find(part => !part || part.startsWith('$') || /[{}]/.test(part))
    if (bad !== undefined) throw new Error(`Ключ «${row.technical_key}» нельзя выгрузить в Figma: часть «${bad}»`)

    for (const lang of languages) {
      let group = files[lang]!
      for (const part of parts.slice(0, -1)) {
        const next = group[part]
        // Ключ не может быть и строкой, и группой: в Figma переменная не может содержать другие
        if (isToken(next)) throw new Error(`Ключ «${row.technical_key}» вложен в строку «${figmaName(parts.slice(0, parts.indexOf(part) + 1).join('.'))}»`)
        group = (group[part] ??= {}) as FigmaGroup
      }
      const leaf = parts.at(-1)!
      // Ключи отсортированы, поэтому строка всегда встречается раньше вложенных в неё — сюда попадает только повтор
      if (group[leaf]) throw new Error(`Ключ «${row.technical_key}» встречается дважды`)
      group[leaf] = {
        $type: 'string',
        $value: row.translations?.[lang] ?? '',
        ...(row.description ? { $description: row.description } : {})
      }
    }
  }
  return files
}
