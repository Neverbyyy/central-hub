// Проверки текста строки по правилам «Как называть ключи → Тексты».
// error — текст сломает экран или vue-i18n, warning — стоит поправить, но не блокирует.

export interface TextIssue {
  level: 'error' | 'warning'
  message: string
}

export interface TextCheckInput {
  text: string
  // Исходный текст (английский) — с ним сверяются подстановки перевода
  source?: string | null
  maxLength?: number | null
  // Новые строки строже старых: в них нельзя HTML
  isNew?: boolean
}

// Подстановки по имени или номеру: {price}, {0}
const PLACEHOLDER = /\{\s*([A-Za-z_]\w*|\d+)\s*\}/g
// Экранированный литерал vue-i18n: {'@'}
const LITERAL = /\{'[^']*'\}/g
const HTML_TAG = /<\/?[a-z][^>]*>/i

/** Имена подстановок в тексте, без повторов и по алфавиту. */
export function placeholders(text: string): string[] {
  const names = new Set<string>()
  for (const match of text.replace(LITERAL, '').matchAll(PLACEHOLDER)) names.add(match[1]!)
  return [...names].sort()
}

export function checkText({ text, source, maxLength, isNew = true }: TextCheckInput): TextIssue[] {
  const issues: TextIssue[] = []
  if (!text) return issues
  const error = (message: string) => issues.push({ level: 'error', message })
  const warning = (message: string) => issues.push({ level: 'warning', message })

  const length = [...text].length
  if (maxLength && length > maxLength) error(`Длиннее лимита: ${length} из ${maxLength} символов`)

  if (source) {
    const expected = placeholders(source)
    const actual = placeholders(text)
    const missing = expected.filter(name => !actual.includes(name))
    const extra = actual.filter(name => !expected.includes(name))
    if (missing.length) error(`Нет подстановок из английского: ${missing.map(n => `{${n}}`).join(', ')}`)
    if (extra.length) error(`Подстановок нет в английском: ${extra.map(n => `{${n}}`).join(', ')}`)
  }

  // Служебные символы vue-i18n вне подстановок и экранированных литералов
  const bare = text.replace(LITERAL, '').replace(PLACEHOLDER, '')
  for (const char of ['@', '{', '}']) {
    if (bare.includes(char)) error(`Символ «${char}» нужно экранировать: {'${char}'} — иначе vue-i18n не разберёт строку`)
  }
  if (bare.includes('$')) warning(`Символ «$» лучше экранировать: {'$'}`)
  if (bare.includes('|') && !source?.includes('|')) {
    warning(`«|» разделяет формы множественного числа; если нужен сам символ — {'|'}`)
  }

  if (HTML_TAG.test(text)) {
    const message = 'HTML в строках нельзя — ссылку или перенос делает компонент через подстановку'
    if (isNew) error(message)
    else warning(message)
  }

  const letters = text.replace(/[^\p{L}]/gu, '')
  if (letters.length >= 4 && letters === letters.toUpperCase() && letters !== letters.toLowerCase()) {
    warning('Текст целиком капсом — пишем в обычном регистре, капс делает CSS')
  }
  if (text !== text.trim()) warning('Пробелы в начале или в конце строки')

  return issues
}
