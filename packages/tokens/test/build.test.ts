import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BREAKPOINTS, buildTokens, cssValue, flatten, THEMES, themeVar } from '../scripts/tokens.mjs'

const primitives = {
  color: { $type: 'color', orange: { 500: { $value: '#FF8D24' } }, green: { 500: { $value: '#64BF07' } } },
  gradient: { $type: 'gradient', green: { $value: 'linear-gradient(180deg, #76EC00 0%, #36B902 100%)' } },
  radius: { $type: 'dimension', 12: { $value: 12 }, 16: { $value: 16 } },
  duration: { fast: { $type: 'duration', $value: '150ms' } }
}
const base = {
  color: { $type: 'color', cta: { bg: { $value: '{color.orange.500}' } }, accent: { $value: '{color.orange.500}' } },
  surface: { $type: 'gradient', cta: { $value: '{color.orange.500}' } },
  duration: { fast: { $value: '{duration.fast}' } }
}
const small = {
  text: { 'title-lg': { 'size': { $value: 16 }, 'line-height': { $value: 20 }, 'weight': { $type: 'fontWeight', $value: 800 } } },
  radius: { plan: { $value: '{radius.16}' } }
}
const sizes = { base: { small, medium: { text: { 'title-lg': { size: { $value: 20 } } } }, large: { text: { 'title-lg': { size: { $value: 32 } } } } } }
const build = (over: Record<string, unknown> = {}) => buildTokens({
  primitives,
  themes: { base, cars2: { color: { accent: { $value: '{color.green.500}' } } }, farm: {} },
  sizes,
  ...over
})

describe('токены дизайн-системы', () => {
  it('группа передаёт $type и $description вложенным токенам', () => {
    expect(flatten(primitives).get('color.orange.500')).toEqual({ value: '#FF8D24', type: 'color', description: undefined })
    const text = flatten({ text: { body: { $description: 'Обычный текст', size: { $value: 14 }, weight: { $value: 400, $description: 'своё' } } } })
    expect(text.get('text.body.size')!.description).toBe('Обычный текст')
    expect(text.get('text.body.weight')!.description).toBe('своё')
  })

  it('имена переменных Tailwind: цвета, радиусы, части текстового стиля', () => {
    expect(themeVar('color.cta.bg')).toBe('--color-cta-bg')
    expect(themeVar('radius.card')).toBe('--radius-card')
    expect(themeVar('text.title-lg.size')).toBe('--text-title-lg')
    expect(themeVar('text.title-lg.line-height')).toBe('--text-title-lg--line-height')
    expect(themeVar('text.title-lg.weight')).toBe('--text-title-lg--font-weight')
    expect(themeVar('text.price.tracking')).toBe('--text-price--letter-spacing')
    expect(() => themeVar('text.title-lg')).toThrow('text.<стиль>')
  })

  it('числа-размеры — в px, вес шрифта — без единиц', () => {
    expect(cssValue('radius.card', { value: 16, type: 'dimension' })).toBe('16px')
    expect(cssValue('text.body.size', { value: 14, type: undefined })).toBe('14px')
    expect(cssValue('text.body.weight', { value: 700, type: 'fontWeight' })).toBe('700')
  })

  it('@theme: стандартная палитра и тени выключены, ссылки разрешены до значений, брейкпоинты 844 и 1024', () => {
    const { theme } = build()
    expect(theme).toContain('--color-*: initial;')
    expect(theme).toContain('--shadow-*: initial;')
    expect(theme).toContain('--color-cta-bg: #FF8D24;')
    expect(theme).toContain('--radius-plan: 16px;')
    // Заливка может быть цветом или градиентом — в CSS одно и то же background
    expect(theme).toContain('--surface-cta: #FF8D24;')
    // Смысловой токен ссылается на одноимённый примитив — это не круг
    expect(theme).toContain('--duration-fast: 150ms;')
    expect(theme).toContain('--breakpoint-medium: 844px;')
    // ds:large: с условием по высоте — @custom-variant в пресете, переменной брейкпоинта нет
    expect(theme).not.toContain('--breakpoint-large')
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

  it('брейкпоинты base — каскадом min-width: large пишет отличия от medium', () => {
    const { overrides } = build()
    expect(overrides).toContain('@media (min-width: 844px) {\n  :root, :host {\n    --ds-text-title-lg: 20px;\n  }\n}')
    // Размеры iPad — только на широком и высоком экране
    expect(overrides).toContain('@media (min-width: 1024px) and (min-height: 600px) {\n  :root, :host {\n    --ds-text-title-lg: 32px;\n  }\n}')
  })

  it('размеры темы: своя лесенка на корне экрана — small всегда, дальше изменения; medium берёт свой small, а не base', () => {
    const { overrides, list } = build({
      sizes: {
        ...sizes,
        cars2: {
          small: { text: { 'title-lg': { size: { $value: 26 }, weight: { $type: 'fontWeight', $value: 900 } } }, radius: { plan: { $value: '{radius.12}' } } },
          large: { text: { 'title-lg': { size: { $value: 40 } } } }
        }
      }
    })
    // На small тема пишет все свои токены — иначе на 844 просочится base/medium с :root
    expect(overrides).toContain('[data-ds-theme=\'cars2\'] {\n  --ds-text-title-lg: 26px;\n  --ds-text-title-lg--font-weight: 900;\n  --ds-radius-plan: 12px;\n}')
    expect(overrides).toContain('@media (min-width: 1024px) and (min-height: 600px) {\n  [data-ds-theme=\'cars2\'] {\n    --ds-text-title-lg: 40px;\n  }\n}')
    // Чего тема не задала (line-height), остаётся лесенкой base
    expect(overrides).not.toMatch(/cars2[^}]*--ds-text-title-lg--line-height/)
    const size = list.tokens.find(t => t.name === 'text.title-lg.size')!.values as Record<string, Record<string, string>>
    expect(size.cars2).toEqual({ small: '26px', medium: '26px', large: '40px' })
    expect(size.base).toEqual({ small: '16px', medium: '20px', large: '32px' })
    expect(size.farm).toEqual(size.base)
  })

  it('битая ссылка, новый токен в теме или в размерах — понятная ошибка', () => {
    expect(() => build({ themes: { base: { color: { x: { $value: '{color.nope}' } } } } })).toThrow('«color.x» ссылается на «color.nope»')
    expect(() => build({ themes: { base, cars2: { color: { brand: { $value: '#000' } } } } })).toThrow('Тема «cars2» задаёт «color.brand»')
    expect(() => build({ sizes: { base: { small, large: { text: { body: { size: { $value: 1 } } } } } } })).toThrow('Файл размеров «base/large» задаёт «text.body.size»')
    expect(() => build({ sizes: { ...sizes, cars2: { medium: { spacing: { x: { $value: 1 } } } } } })).toThrow('Файл размеров «cars2/medium» задаёт «spacing.x»')
  })

  it('любые группы: именованные отступы (ds:min-h-touch) и размер, который меняется по брейкпоинтам', () => {
    const { theme, overrides } = build({
      sizes: {
        base: {
          small: { ...small, spacing: { touch: { $type: 'dimension', $value: 44 }, button: { $type: 'dimension', $value: 44 } } },
          large: { spacing: { button: { $type: 'dimension', $value: 64 } } }
        }
      }
    })
    expect(theme).toContain('--spacing-touch: 44px;')
    expect(theme).toContain('--spacing-button: 44px;')
    expect(overrides).toContain('--ds-spacing-button: 64px;')
  })

  it('список для Storybook: тема — по темам, размер — по темам и брейкпоинтам', () => {
    const { list } = build()
    const accent = list.tokens.find(t => t.name === 'color.accent')!
    expect(accent.kind).toBe('theme')
    expect(accent.values).toEqual({ base: '#FF8D24', cars2: '#64BF07', farm: '#FF8D24' })
    const size = list.tokens.find(t => t.name === 'text.title-lg.size')!
    expect(size.kind).toBe('size')
    expect((size.values as Record<string, unknown>).base).toEqual({ small: '16px', medium: '20px', large: '32px' })
  })

  it('настоящие источники из src собираются без ошибок', () => {
    const src = (path: string) => {
      try {
        return JSON.parse(readFileSync(join(import.meta.dirname, '../src', path), 'utf8'))
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}
        throw error
      }
    }
    const { list } = buildTokens({
      primitives: src('primitives.json'),
      themes: Object.fromEntries(THEMES.map(theme => [theme, src(`theme/${theme}.json`)])),
      sizes: Object.fromEntries(THEMES.map(theme => [theme, Object.fromEntries(BREAKPOINTS.map(({ name }) => [name, src(`size/${theme}/${name}.json`)]))]))
    })
    expect(list.tokens.some(t => t.name === 'surface.cta')).toBe(true)
    // Cars 2 на 844 — те же стили SM, что на 667 (так в макетах)
    const title = list.tokens.find(t => t.name === 'text.title-lg.size')!.values as Record<string, Record<string, string>>
    expect(title.cars2!.medium).toBe(title.cars2!.small)
  })
})
