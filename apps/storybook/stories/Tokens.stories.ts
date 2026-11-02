import tokens from '@amaya/tokens/tokens.json'
import type { Meta, StoryObj } from '@storybook/vue3-vite'

// Страницы токенов: значения из @amaya/tokens (dist/tokens.json) — сразу по всем темам и брейкпоинтам,
// поэтому переключатель темы им не нужен (themes: false). Подписи — имена токенов и классов, не тексты продукта

type Ladder = Record<string, string>
interface Token {
  name: string
  // theme — цвета, заливки, шрифты, регистр: значение по темам; size — текст, отступы, радиусы, линии: по темам и брейкпоинтам
  kind: 'theme' | 'size'
  cssVar: string
  type: string | null
  description: string | null
  values: Record<string, string | Ladder>
}

const list = tokens.tokens as Token[]
const themes = tokens.themes
const breakpoints = tokens.breakpoints
const dashed = (name: string) => name.split('.').slice(1).join('-')
const ladder = (token: Token | undefined, theme: string) => (token?.values[theme] ?? {}) as Ladder
// Темы, у которых лесенка размеров отличается от base, — их показываем отдельной строкой
const sameAsBase = (tokensOfRow: (Token | undefined)[], theme: string) =>
  tokensOfRow.every(token => JSON.stringify(ladder(token, theme)) === JSON.stringify(ladder(token, 'base')))

// Каким классом токен берут в компоненте
const utilities = (token: Token) => {
  const name = dashed(token.name)
  if (token.name.startsWith('color.')) return [`ds:bg-${name}`, `ds:text-${name}`, `ds:border-${name}`]
  if (token.name.startsWith('surface.')) return [`ds:surface-${name}`]
  if (token.name.startsWith('case.')) return [`ds:case-${name}`]
  if (token.name.startsWith('shadow.')) return [`ds:shadow-(${token.cssVar})`]
  if (token.name.startsWith('radius.')) return [`ds:rounded-${name}`]
  if (token.name.startsWith('spacing.')) return [`ds:h-${name}`, `ds:p-${name}`]
  if (token.name.startsWith('line.')) return [`ds:border-(length:${token.cssVar})`]
  if (token.name.startsWith('font.')) return [`ds:font-${name}`]
  if (token.name.startsWith('ease.')) return [`ds:ease-${name}`]
  return [`var(${token.cssVar})`]
}

// Текстовые стили: text.title-lg.size / .line-height / .weight / .tracking → одна строка на стиль и тему
const textStyles = [...new Set(list.filter(t => t.name.startsWith('text.')).map(t => t.name.split('.')[1]!))].map((style) => {
  const part = (name: string) => list.find(t => t.name === `text.${style}.${name}`)
  const parts = { size: part('size'), lineHeight: part('line-height'), weight: part('weight'), tracking: part('tracking') }
  const rows = themes.filter(theme => theme === 'base' || !sameAsBase(Object.values(parts), theme))
  return { style, description: parts.size?.description, ...parts, rows }
})
// Шрифт текстового стиля — как в DsText
const FONT: Record<string, string> = { 'display-lg': 'display', 'display-md': 'display', 'title-lg': 'title', 'title-md': 'title', 'button': 'button', 'legal': 'link', 'link': 'link' }
const fontOf = (style: string) => `var(--ds-font-${FONT[style] ?? 'body'})`

const meta = {
  title: 'Токены/Значения',
  parameters: { themes: false }
} satisfies Meta

export default meta

export const Colors: StoryObj = {
  name: 'Цвета и заливки',
  render: () => ({
    setup: () => ({ colors: list.filter(t => /^(color|surface|shadow)\./.test(t.name)), themes, utilities }),
    template: `
      <table class="sb-table">
        <thead>
          <tr><th>Токен</th><th v-for="theme in themes" :key="theme">{{ theme }}</th></tr>
        </thead>
        <tbody>
          <tr v-for="token in colors" :key="token.name">
            <td><code>{{ token.name }}</code><br><code style="opacity: .55">{{ utilities(token).join(' · ') }}</code></td>
            <td v-for="theme in themes" :key="theme" :data-token="token.name" :data-theme="theme">
              <span v-if="token.name.startsWith('shadow.')" class="sb-swatch" :style="{ boxShadow: token.values[theme], background: '#fff' }" />
              <span v-else class="sb-swatch" :style="{ background: token.values[theme] }" />
              <code>{{ token.values[theme] }}</code>
            </td>
          </tr>
        </tbody>
      </table>
    `
  })
}

export const Typography: StoryObj = {
  name: 'Типографика',
  render: () => ({
    setup: () => ({ textStyles, breakpoints, fontOf, ladder, fonts: list.filter(t => /^(font|case)\./.test(t.name)), themes }),
    template: `
      <table class="sb-table">
        <thead>
          <tr>
            <th>Стиль · класс</th>
            <th>Тема</th>
            <th v-for="bp in breakpoints" :key="bp.name">{{ bp.name }}{{ bp.min ? ' от ' + bp.min + ' px' : '' }}{{ bp.minHeight ? ' и высота от ' + bp.minHeight : '' }}</th>
            <th>Сейчас, на этом экране</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="row in textStyles" :key="row.style">
            <tr v-for="(theme, index) in row.rows" :key="theme">
              <td v-if="index === 0" :rowspan="row.rows.length">
                <code>text.{{ row.style }}</code><br><code style="opacity: .55">ds:text-{{ row.style }}</code>
                <div v-if="row.description" class="sb-note">{{ row.description }}</div>
              </td>
              <td><code>{{ theme }}</code></td>
              <td v-for="bp in breakpoints" :key="bp.name">
                <code>{{ ladder(row.size, theme)[bp.name] }} / {{ ladder(row.lineHeight, theme)[bp.name] }} · {{ ladder(row.weight, theme)[bp.name] }}<template v-if="row.tracking && ladder(row.tracking, theme)[bp.name] !== '0px'"> · ls {{ ladder(row.tracking, theme)[bp.name] }}</template></code>
              </td>
              <td :data-ds-theme="theme">
                <span
                  :data-text-style="row.style"
                  :style="{
                    fontFamily: fontOf(row.style),
                    fontSize: 'var(--ds-text-' + row.style + ')',
                    lineHeight: 'var(--ds-text-' + row.style + '--line-height)',
                    fontWeight: 'var(--ds-text-' + row.style + '--font-weight, 400)',
                    letterSpacing: 'var(--ds-text-' + row.style + '--letter-spacing, normal)'
                  }"
                >ds:text-{{ row.style }}</span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
      <table class="sb-table">
        <thead>
          <tr><th>Шрифт и регистр</th><th v-for="theme in themes" :key="theme">{{ theme }}</th></tr>
        </thead>
        <tbody>
          <tr v-for="token in fonts" :key="token.name">
            <td><code>{{ token.name }}</code><div v-if="token.description" class="sb-note">{{ token.description }}</div></td>
            <td v-for="theme in themes" :key="theme"><code>{{ String(token.values[theme]).split(',')[0] }}</code></td>
          </tr>
        </tbody>
      </table>
    `
  })
}

export const Sizes: StoryObj = {
  name: 'Размеры, радиусы и анимации',
  render: () => ({
    setup: () => ({
      sizes: list.filter(t => /^(spacing|radius|line)\./.test(t.name)).map(token => ({
        token,
        rows: themes.filter(theme => theme === 'base' || !sameAsBase([token], theme))
      })),
      motion: list.filter(t => /^(duration|ease)\./.test(t.name)),
      breakpoints,
      ladder,
      utilities
    }),
    template: `
      <table class="sb-table">
        <thead>
          <tr>
            <th>Токен · класс</th>
            <th>Тема</th>
            <th v-for="bp in breakpoints" :key="bp.name">{{ bp.name }}{{ bp.min ? ' от ' + bp.min + ' px' : '' }}{{ bp.minHeight ? ' и высота от ' + bp.minHeight : '' }}</th>
            <th>Сейчас</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="{ token, rows } in sizes" :key="token.name">
            <tr v-for="(theme, index) in rows" :key="theme">
              <td v-if="index === 0" :rowspan="rows.length">
                <code>{{ token.name }}</code><br><code style="opacity: .55">{{ utilities(token)[0] }}</code>
                <div v-if="token.description" class="sb-note">{{ token.description }}</div>
              </td>
              <td><code>{{ theme }}</code></td>
              <td v-for="bp in breakpoints" :key="bp.name"><code>{{ ladder(token, theme)[bp.name] }}</code></td>
              <td :data-ds-theme="theme">
                <div
                  v-if="token.name.startsWith('radius.')"
                  :style="{ width: '96px', height: '56px', borderRadius: 'var(' + token.cssVar + ')', background: 'var(--ds-color-accent)' }"
                />
                <div
                  v-else-if="token.name.startsWith('line.')"
                  :style="{ width: '96px', height: '32px', border: 'var(' + token.cssVar + ') solid var(--ds-color-accent)' }"
                />
                <div v-else :style="{ width: 'var(' + token.cssVar + ')', height: '12px', background: 'var(--ds-color-accent)' }" />
              </td>
            </tr>
          </template>
          <tr v-for="token in motion" :key="token.name">
            <td><code>{{ token.name }}</code><br><code style="opacity: .55">{{ utilities(token)[0] }}</code></td>
            <td colspan="5"><code>{{ token.values.base }}</code></td>
          </tr>
        </tbody>
      </table>
    `
  })
}
