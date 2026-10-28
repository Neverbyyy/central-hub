import { describe, expect, it } from 'vitest'
import { checkText, placeholders } from '../src'

const messages = (input: Parameters<typeof checkText>[0], level?: 'error' | 'warning') =>
  checkText(input).filter(i => !level || i.level === level).map(i => i.message)

describe('placeholders', () => {
  it('находит подстановки по имени и номеру, но не экранированные литералы', () => {
    expect(placeholders('{price} / week, {0} and {days}')).toEqual(['0', 'days', 'price'])
    expect(placeholders(`support{'@'}example.com`)).toEqual([])
  })
})

describe('checkText', () => {
  it('нормальный текст без замечаний', () => {
    expect(checkText({ text: 'Try {days} days free', source: 'Try {days} days free' })).toEqual([])
    expect(checkText({ text: '' })).toEqual([])
  })

  it('подстановки перевода сверяются с английским', () => {
    expect(messages({ text: 'Попробуйте бесплатно', source: 'Try {days} days free' }, 'error')).toEqual(['Нет подстановок из английского: {days}'])
    expect(messages({ text: '{price} в неделю', source: '{cost} / week' }, 'error')).toHaveLength(2)
  })

  it('лимит длины считает символы, а не байты', () => {
    expect(messages({ text: 'Продолжить', maxLength: 10 }, 'error')).toEqual([])
    expect(messages({ text: 'Продолжить!', maxLength: 10 }, 'error')).toEqual(['Длиннее лимита: 11 из 10 символов'])
  })

  it('неэкранированная @ и фигурные скобки — ошибка, экранированные — нет', () => {
    expect(messages({ text: 'Write to support@example.com' }, 'error')).toEqual([expect.stringContaining('«@»')])
    expect(messages({ text: `Write to support{'@'}example.com` })).toEqual([])
    expect(messages({ text: 'Use { here' }, 'error')).toEqual([expect.stringContaining('«{»')])
  })

  it('| — предупреждение, если в английском нет множественного числа', () => {
    expect(messages({ text: 'A | B' }, 'warning')).toEqual([expect.stringContaining('«|»')])
    expect(messages({ text: '{count} день | {count} дня', source: '{count} day | {count} days' })).toEqual([])
  })

  it('HTML: в новых строках ошибка, в старых — предупреждение', () => {
    expect(messages({ text: 'Line<br/>break', isNew: true }, 'error')).toHaveLength(1)
    expect(messages({ text: 'Line<br/>break', isNew: false }, 'error')).toEqual([])
    expect(messages({ text: 'Line<br/>break', isNew: false }, 'warning')).toHaveLength(1)
  })

  it('капс и пробелы по краям — предупреждения', () => {
    expect(messages({ text: 'CONTINUE' }, 'warning')).toEqual([expect.stringContaining('капсом')])
    expect(messages({ text: 'OK' }, 'warning')).toEqual([])
    expect(messages({ text: 'Continue ' }, 'warning')).toEqual(['Пробелы в начале или в конце строки'])
  })
})
