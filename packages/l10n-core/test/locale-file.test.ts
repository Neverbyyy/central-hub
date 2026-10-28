import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { findExportConflicts, readLocaleFile, renderLocaleFile, type LocaleEntry } from '../src'

const LANGS = ['en', 'ru', 'de', 'es', 'it', 'pt', 'fr', 'sv', 'nl']
const FIXTURES = join(import.meta.dirname, '../../../fixtures/legacy')
const fixture = (project: string, lang: string) =>
  readFileSync(join(FIXTURES, project === 'inapp' ? 'inapp/src/locales' : 'pages-hub/i18n/locales', `${lang}.json`), 'utf8')

const asMap = (entries: readonly LocaleEntry[]) => new Map(entries.map(e => [JSON.stringify(e.path), e.value]))

// Результат выгрузки должен читаться ровно в желаемые строки
const expectContent = (text: string, entries: readonly LocaleEntry[]) => {
  expect(asMap(readLocaleFile(text))).toEqual(asMap(entries))
}

// Строки, которых нет на другой стороне (с учётом повторов) — сколько строк затронула выгрузка
const changedLines = (a: string, b: string) => {
  const count = (lines: string[]) => lines.reduce((m, l) => m.set(l, (m.get(l) ?? 0) + 1), new Map<string, number>())
  const left = count(a.split('\n'))
  const right = count(b.split('\n'))
  const only = (x: Map<string, number>, y: Map<string, number>) =>
    [...x].reduce((n, [line, times]) => n + Math.max(0, times - (y.get(line) ?? 0)), 0)
  return { removed: only(left, right), added: only(right, left) }
}

describe('выгрузка совпадает с исходными файлами байт в байт', () => {
  it.each(LANGS)('InApp %s.json', (lang) => {
    const file = fixture('inapp', lang)
    expect(renderLocaleFile({ template: file, entries: readLocaleFile(file) })).toBe(file)
  })

  it.each(LANGS)('Pages Hub %s.json — и по шаблону, и без него', (lang) => {
    const file = fixture('pages-hub', lang)
    const entries = readLocaleFile(file)
    expect(renderLocaleFile({ template: file, entries })).toBe(file)
    expect(renderLocaleFile({ entries, finalNewline: false })).toBe(file)
  })

  it('дубль ключа в InApp читается как в vue-i18n — побеждает второе значение', () => {
    const value = readLocaleFile(fixture('inapp', 'en')).find(e => e.path.at(-1) === 'letter_reset_password_button')?.value
    expect(value).toBe('Confirm new password')
  })
})

describe('точечные правки шаблона', () => {
  const template = [
    '{',
    '  "a": "A",',
    '',
    '  "b": "B",  ',
    '  "ns": {',
    '    "x": "X",',
    '    "y": "Y"',
    '  },',
    '  "c": "C"',
    '}',
    ''
  ].join('\n')
  const base = readLocaleFile(template)
  const without = (...paths: string[][]) => base.filter(e => !paths.some(p => JSON.stringify(p) === JSON.stringify(e.path)))
  const replaced = (path: string[], value: string) => base.map(e => (JSON.stringify(e.path) === JSON.stringify(path) ? { path, value } : e))

  it('замена значения меняет одну строку и сохраняет пробелы в конце и пустые строки', () => {
    const entries = replaced(['b'], 'Б "в кавычках"')
    const out = renderLocaleFile({ template, entries })
    expect(out).toBe(template.replace('"b": "B",  ', '"b": "Б \\"в кавычках\\"",  '))
    expectContent(out, entries)
  })

  it('удаление первой строки оставляет пустую строку-разделитель', () => {
    const entries = without(['a'])
    const out = renderLocaleFile({ template, entries })
    expect(out).toBe(template.replace('  "a": "A",\n', ''))
    expectContent(out, entries)
  })

  it('удаление последней строки раздела убирает запятую предыдущей', () => {
    const entries = without(['ns', 'y'])
    const out = renderLocaleFile({ template, entries })
    expect(out).toBe(template.replace('    "x": "X",\n    "y": "Y"\n', '    "x": "X"\n'))
    expectContent(out, entries)
  })

  it('удаление последней строки файла убирает запятую после раздела', () => {
    const entries = without(['c'])
    const out = renderLocaleFile({ template, entries })
    expect(out).toBe(template.replace('  },\n  "c": "C"\n', '  }\n'))
    expectContent(out, entries)
  })

  it('удаление всех строк раздела оставляет пустой раздел', () => {
    const entries = without(['ns', 'x'], ['ns', 'y'])
    const out = renderLocaleFile({ template, entries })
    expect(JSON.parse(out).ns).toEqual({})
    expectContent(out, entries)
  })

  it('новые строки дописываются в конец своего раздела, недостающие разделы создаются', () => {
    const entries = [...base, { path: ['ns', 'z'], value: 'Z' }, { path: ['d'], value: 'D' }, { path: ['new', 'deep', 'k'], value: 'K' }]
    const out = renderLocaleFile({ template, entries })
    expect(out).toBe([
      '{',
      '  "a": "A",',
      '',
      '  "b": "B",  ',
      '  "ns": {',
      '    "x": "X",',
      '    "y": "Y",',
      '    "z": "Z"',
      '  },',
      '  "c": "C",',
      '  "d": "D",',
      '  "new": {',
      '    "deep": {',
      '      "k": "K"',
      '    }',
      '  }',
      '}',
      ''
    ].join('\n'))
    expectContent(out, entries)
  })

  it('строка в пустой раздел', () => {
    const tpl = '{\n  "ns": {},\n  "a": "A"\n}\n'
    const entries = [{ path: ['ns', 'x'], value: 'X' }, { path: ['a'], value: 'A' }]
    const out = renderLocaleFile({ template: tpl, entries })
    expect(out).toBe('{\n  "ns": {\n    "x": "X"\n  },\n  "a": "A"\n}\n')
  })

  it('строка на месте раздела и раздел на месте строки', () => {
    const entries = [...without(['a'], ['ns', 'x'], ['ns', 'y']), { path: ['a', 'inner'], value: 'I' }, { path: ['ns'], value: 'NS' }]
    const out = renderLocaleFile({ template, entries })
    expectContent(out, entries)
  })

  it('у дубля меняется последнее вхождение, удаление убирает оба', () => {
    const tpl = '{\n  "dup": "first",\n  "dup": "second",\n  "z": "Z"\n}\n'
    const changed = renderLocaleFile({ template: tpl, entries: [{ path: ['dup'], value: 'new' }, { path: ['z'], value: 'Z' }] })
    expect(changed).toBe('{\n  "dup": "first",\n  "dup": "new",\n  "z": "Z"\n}\n')

    const removed = renderLocaleFile({ template: tpl, entries: [{ path: ['z'], value: 'Z' }] })
    expect(removed).toBe('{\n  "z": "Z"\n}\n')
  })

  it('пути с точкой в имени не путаются с разделами', () => {
    const tpl = '{\n  "settings": {\n    "auth.email": "E"\n  }\n}\n'
    const entries = [{ path: ['settings', 'auth.email'], value: 'E2' }, { path: ['settings', 'auth', 'email'], value: 'N' }]
    const out = renderLocaleFile({ template: tpl, entries })
    expectContent(out, entries)
  })
})

describe('случайные правки настоящего en.json', () => {
  // Детерминированный генератор, чтобы падение воспроизводилось
  const random = (() => {
    let seed = 42
    return () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31
  })()

  it('результат читается ровно в желаемые строки, а diff не шире правок', () => {
    const file = fixture('inapp', 'en')
    const base = readLocaleFile(file)
    for (let round = 0; round < 20; round++) {
      const entries = base.map(e => ({ ...e }))
      const pick = () => entries[Math.floor(random() * entries.length)]!
      for (let i = 0; i < 5; i++) pick().value = `Изменено ${round}-${i}`
      const removed = new Set(Array.from({ length: 5 }, () => JSON.stringify(pick().path)))
      const kept = entries.filter(e => !removed.has(JSON.stringify(e.path)))
      const namespace = pick().path.slice(0, -1)
      kept.push({ path: [...namespace, `new_key_${round}`], value: 'Новая' }, { path: ['brand_new', `k${round}`], value: 'Раздел' })

      const out = renderLocaleFile({ template: file, entries: kept })
      expectContent(out, kept)

      // 5 замен (по строке туда и обратно), до 5 удалений с правкой запятых, 2 вставки с разделом
      const { removed: gone, added } = changedLines(file, out)
      expect(gone).toBeLessThanOrEqual(5 + 5 + 3)
      expect(added).toBeLessThanOrEqual(5 + 3 + 6)
    }
  })
})

describe('findExportConflicts', () => {
  it('одинаковые пути и строка на месте раздела', () => {
    expect(findExportConflicts([['a', 'b'], ['a', 'b']])).toHaveLength(1)
    expect(findExportConflicts([['a', 'b'], ['a', 'b', 'c']])).not.toHaveLength(0)
    expect(findExportConflicts([['a', 'b', 'c'], ['a', 'b']])).not.toHaveLength(0)
  })

  it('соседние ключи и ключ с точкой в имени — не конфликт', () => {
    expect(findExportConflicts([['a', 'b'], ['a', 'c'], ['a.b'], ['ab']])).toEqual([])
  })

  it('выгрузка с конфликтом падает, а не перезаписывает молча', () => {
    expect(() => renderLocaleFile({ entries: [{ path: ['a'], value: '1' }, { path: ['a', 'b'], value: '2' }] })).toThrow('Конфликт путей')
  })
})
