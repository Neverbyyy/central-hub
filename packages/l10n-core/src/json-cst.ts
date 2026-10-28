// Разбор JSON с позициями в исходном тексте. Нужен выгрузке: она правит файл локали
// точечно, сохраняя всё остальное (пустые строки, пробелы, порядок, дубли ключей) байт в байт.

export interface CstLeaf {
  kind: 'string' | 'number' | 'literal' | 'array'
  start: number
  // Индекс сразу после значения
  end: number
}

export interface CstMember {
  key: string
  keyStart: number
  value: CstNode
  // Индекс запятой после значения или -1, если участник последний
  comma: number
}

export interface CstObject {
  kind: 'object'
  start: number
  end: number
  members: CstMember[]
}

export type CstNode = CstObject | CstLeaf

const WHITESPACE = new Set([' ', '\t', '\n', '\r'])

export function parseCst(text: string): CstObject {
  let pos = 0

  const fail = (message: string): never => {
    const line = text.slice(0, pos).split('\n').length
    throw new Error(`Неверный JSON: ${message} (строка ${line})`)
  }

  const skipWhitespace = () => {
    while (pos < text.length && WHITESPACE.has(text[pos]!)) pos++
  }

  const expect = (char: string) => {
    if (text[pos] !== char) fail(`ожидался «${char}»`)
    pos++
  }

  const parseStringToken = (): [string, number] => {
    const start = pos
    expect('"')
    while (pos < text.length && text[pos] !== '"') {
      pos += text[pos] === '\\' ? 2 : 1
    }
    expect('"')
    return [JSON.parse(text.slice(start, pos)) as string, start]
  }

  const parseValue = (): CstNode => {
    skipWhitespace()
    const start = pos
    const char = text[pos]
    if (char === '{') return parseObject()
    if (char === '"') {
      parseStringToken()
      return { kind: 'string', start, end: pos }
    }
    if (char === '[') {
      pos++
      skipWhitespace()
      if (text[pos] !== ']') {
        for (;;) {
          parseValue()
          skipWhitespace()
          if (text[pos] === ',') {
            pos++
            continue
          }
          break
        }
      }
      expect(']')
      return { kind: 'array', start, end: pos }
    }
    const literal = /^(?:true|false|null)/.exec(text.slice(pos, pos + 5))
    if (literal) {
      pos += literal[0].length
      return { kind: 'literal', start, end: pos }
    }
    const number = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(text.slice(pos, pos + 64))
    if (number) {
      pos += number[0].length
      return { kind: 'number', start, end: pos }
    }
    return fail('неизвестное значение')
  }

  const parseObject = (): CstObject => {
    const start = pos
    expect('{')
    const members: CstMember[] = []
    skipWhitespace()
    if (text[pos] === '}') {
      pos++
      return { kind: 'object', start, end: pos, members }
    }
    for (;;) {
      skipWhitespace()
      const [key, keyStart] = parseStringToken()
      skipWhitespace()
      expect(':')
      const value = parseValue()
      skipWhitespace()
      if (text[pos] === ',') {
        members.push({ key, keyStart, value, comma: pos })
        pos++
        continue
      }
      members.push({ key, keyStart, value, comma: -1 })
      expect('}')
      return { kind: 'object', start, end: pos, members }
    }
  }

  skipWhitespace()
  if (text[pos] !== '{') fail('файл локали должен быть объектом')
  const root = parseObject()
  skipWhitespace()
  if (pos !== text.length) fail('лишние символы после объекта')
  return root
}
