import { describe, expect, it } from 'vitest'
import { errorMessage } from '../../apps/central-hub/app/utils/errorMessage'
import { changeFileName, changeKind, quoteChange, totalChanges, type FileChange } from '../../apps/central-hub/app/utils/exportChanges'
import { formatDateTime } from '../../apps/central-hub/app/utils/formatDate'
import { keysCount, plural } from '../../apps/central-hub/app/utils/plural'

describe('plural и keysCount', () => {
  it.each([
    [1, 'ключ'], [2, 'ключа'], [4, 'ключа'], [5, 'ключей'], [11, 'ключей'], [12, 'ключей'], [14, 'ключей'],
    [21, 'ключ'], [22, 'ключа'], [101, 'ключ'], [111, 'ключей'], [0, 'ключей'], [2722, 'ключа']
  ])('%i — %s', (count, form) => {
    expect(plural(count, ['ключ', 'ключа', 'ключей'])).toBe(form)
    expect(keysCount(count)).toBe(`${count} ${form}`)
  })
})

describe('formatDateTime', () => {
  // Время без зоны — местное: тест не зависит от часового пояса машины
  it('с годом и без', () => {
    expect(formatDateTime('2026-10-30T11:48:00')).toBe('30.10.26, 11:48')
    expect(formatDateTime('2026-10-30T11:48:00', { year: false })).toBe('30.10, 11:48')
  })
  it('нет даты — прочерк', () => {
    expect(formatDateTime(null)).toBe('—')
    expect(formatDateTime(undefined)).toBe('—')
    expect(formatDateTime('')).toBe('—')
  })
})

describe('errorMessage', () => {
  it('текст сервера из data.message важнее текста ошибки', () => {
    expect(errorMessage(Object.assign(new Error('fetch failed'), { data: { message: 'Ключ уже есть' } }))).toBe('Ключ уже есть')
  })
  it('без data — текст ошибки, без него — общий', () => {
    expect(errorMessage(new Error('Нет сети'))).toBe('Нет сети')
    expect(errorMessage({ data: { message: '' } })).toBe('Что-то пошло не так')
    expect(errorMessage(null)).toBe('Что-то пошло не так')
    expect(errorMessage('строка')).toBe('Что-то пошло не так')
  })
})

describe('изменения выгрузки', () => {
  it('вид строки — по тому, чего нет', () => {
    expect(changeKind({ key: 'a', after: 'x' })).toBe('added')
    expect(changeKind({ key: 'a', before: 'x' })).toBe('removed')
    expect(changeKind({ key: 'a', before: 'x', after: 'y' })).toBe('changed')
    // null — значение в файле, а не отсутствие строки
    expect(changeKind({ key: 'a', before: null, after: 'y' })).toBe('changed')
  })
  it('кавычки, null и прочерк', () => {
    expect(quoteChange('Continue')).toBe('«Continue»')
    expect(quoteChange(null)).toBe('null')
    expect(quoteChange(undefined)).toBe('—')
  })
  it('имя файла и сумма изменений', () => {
    expect(changeFileName('src/locales/ru.json')).toBe('ru.json')
    expect(changeFileName('ru.json')).toBe('ru.json')
    const file = (added: number, changed: number, removed: number): FileChange => ({ path: 'x', lang: 'en', added, changed, removed, lines: [] })
    expect(totalChanges([file(1, 2, 3), file(0, 1, 0)])).toBe(7)
    expect(totalChanges([])).toBe(0)
  })
})
