import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildTokens, cssValue, flatten, themeVar } from '../scripts/tokens.mjs'

const primitives = {
  color: { $type: 'color', orange: { 500: { $value: '#FF8D24' } }, green: { 500: { $value: '#64BF07' } } },
  radius: { $type: 'dimension', 16: { $value: 16 } },
  duration: { fast: { $type: 'duration', $value: '150ms' } }
}
const base = {
  color: { $type: 'color', cta: { bg: { $value: '{color.orange.500}' } }, accent: { $value: '{color.orange.500}' } },
  radius: { card: { $value: '{radius.16}' } },
  duration: { fast: { $value: '{duration.fast}' } }
}
const small = { text: { 'title-lg': { 'size': { $value: 16 }, 'line-height': { $value: 20 }, 'weight': { $type: 'fontWeight', $value: 800 } } } }
const build = (over: Record<string, unknown> = {}) => buildTokens({
  primitives,
  themes: { base, cars2: { color: { accent: { $value: '{color.green.500}' } } }, farm: {} },
  breakpoints: { small, medium: { text: { 'title-lg': { size: { $value: 20 } } } }, large: { text: { 'title-lg': { size: { $value: 32 } } } } },
  ...over
})

describe('токены дизайн-системы', () => {
  it('группа передаёт $type вложенным токенам', () => {
    expect(flatten(primitives).get('color.orange.500')).toEqual({ value: '#FF8D24', type: 'color', description: undefined })
  })

  it('имена переменных Tailwind: цвета, радиусы, части текстового стиля', () => {
    expect(themeVar('color.cta.bg')).toBe('--color-cta-bg')
    expect(themeVar('radius.card')).toBe('--radius-card')
    expect(themeVar('text.title-lg.size')).toBe('--text-title-lg')
    expect(themeVar('text.title-lg.line-height')).toBe('--text-title-lg--line-height')
    expect(themeVar('text.title-lg.weight')).toBe('--text-title-lg--font-weight')
    expect(() => themeVar('text.title-lg')).toThrow('text.<стиль>')
  })

  it('числа-размеры — в px, вес шрифта — без единиц', () => {
    expect(cssValue('radius.card', { value: 16, type: 'dimension' })).toBe('16px')
    expect(cssValue('text.body.size', { value: 14, type: undefined })).toBe('14px')
    expect(cssValue('text.body.weight', { value: 700, type: 'fontWeight' })).toBe('700')
  })

  it('@theme: стандартная палитра выключена, ссылки разрешены до значений, брейкпоинты 844 и 1024', () => {
    const { theme } = build()
    expect(theme).toContain('--color-*: initial;')
    expect(theme).toContain('--color-cta-bg: #FF8D24;')
    expect(theme).toContain('--radius-card: 16px;')
    // Смысловой токен ссылается на одноимённый примитив — это не круг
    expect(theme).toContain('--duration-fast: 150ms;')
    expect(theme).toContain('--breakpoint-medium: 844px;')
    expect(theme).toContain('--text-title-lg--font-weight: 800;')
    // Примитивы в Tailwind не попадают: только смысловые токены
    expect(theme).not.toContain('--color-orange-500')
  })

  it('тема переопределяет только свои отличия, на переменных --ds-*', () => {
    const { overrides } = build()
    expect(overrides).toContain('[data-ds-theme=\'cars2\'] {\n  --ds-color-accent: #64BF07;\n}')
    // У farm отличий нет — блока нет
    expect(overrides).not.toContain('farm')
  })

  it('брейкпоинты — каскадом min-width: large пишет отличия от medium', () => {
    const { overrides } = build()
    expect(overrides).toContain('@media (min-width: 844px) {\n  :root, :host {\n    --ds-text-title-lg: 20px;\n  }\n}')
    expect(overrides).toContain('@media (min-width: 1024px) {\n  :root, :host {\n    --ds-text-title-lg: 32px;\n  }\n}')
  })

  it('битая ссылка, новый токен в теме или брейкпоинте — понятная ошибка', () => {
    expect(() => build({ themes: { base: { color: { x: { $value: '{color.nope}' } } } } })).toThrow('«color.x» ссылается на «color.nope»')
    expect(() => build({ themes: { base, cars2: { color: { brand: { $value: '#000' } } } } })).toThrow('Тема «cars2» задаёт «color.brand»')
    expect(() => build({ breakpoints: { small, large: { text: { body: { size: { $value: 1 } } } } } })).toThrow('Брейкпоинт «large» задаёт «text.body.size»')
  })

  it('список для Storybook: значения по темам и по брейкпоинтам', () => {
    const { list } = build()
    expect(list.tokens.find(t => t.name === 'color.accent')!.values).toEqual({ base: '#FF8D24', cars2: '#64BF07', farm: '#FF8D24' })
    expect(list.tokens.find(t => t.name === 'text.title-lg.size')!.values).toEqual({ small: '16px', medium: '20px', large: '32px' })
  })

  it('настоящие источники из src собираются без ошибок', () => {
    const src = (path: string) => JSON.parse(readFileSync(join(import.meta.dirname, '../src', path), 'utf8'))
    const { list } = buildTokens({
      primitives: src('primitives.json'),
      themes: { base: src('theme/base.json'), cars2: src('theme/cars2.json'), farm: src('theme/farm.json') },
      breakpoints: { small: src('breakpoint/small.json'), medium: src('breakpoint/medium.json'), large: src('breakpoint/large.json') }
    })
    expect(list.tokens.some(t => t.name === 'color.cta.bg')).toBe(true)
  })
})
