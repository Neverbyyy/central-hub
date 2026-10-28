// Переменные Figma из строк сервиса: коллекция, в ней по переменной на ключ, каждый язык — режим.
// Формат — как у экспорта в прототипе. Когда станет известно, каким плагином Антон импортирует
// переменные, формат меняется здесь, а не в интерфейсе и не на сервере.

export interface FigmaSourceRow {
  technical_key: string
  translations: Record<string, string | null | undefined>
}

export interface FigmaVariable {
  $type: 'string'
  $value: Record<string, string>
}

export type FigmaCollection = Record<string, Record<string, FigmaVariable>>

/**
 * Имя переменной: точки → `/`, и Figma строит из частей дерево групп: app → cars2 → paywall.
 * У строк InApp и Pages Hub точка внутри части пути тоже означает вложенность
 * (`settings` → `auth.continue`), поэтому правило для них то же.
 */
export const figmaName = (key: string) => key.split('.').join('/')

export function figmaVariables(
  rows: FigmaSourceRow[],
  { languages, collection = 'Localizations' }: { languages: string[], collection?: string }
): FigmaCollection {
  const variables: Record<string, FigmaVariable> = {}
  const owners = new Map<string, string>()
  for (const row of [...rows].sort((a, b) => a.technical_key.localeCompare(b.technical_key))) {
    const name = figmaName(row.technical_key)
    // Два ключа с одним именем молча затёрли бы друг друга в Figma
    const owner = owners.get(name)
    if (owner) throw new Error(`Ключи «${owner}» и «${row.technical_key}» дают одно имя переменной Figma «${name}»`)
    owners.set(name, row.technical_key)
    variables[name] = {
      $type: 'string',
      // Нет перевода — пустая строка: в макете сразу видно, чего не хватает
      $value: Object.fromEntries(languages.map(lang => [lang, row.translations?.[lang] ?? '']))
    }
  }
  return { [collection]: variables }
}
