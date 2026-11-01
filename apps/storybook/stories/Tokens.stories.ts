import tokens from '@amaya/tokens/tokens.json'
import type { Meta, StoryObj } from '@storybook/vue3-vite'

// Страницы токенов: значения из @amaya/tokens (dist/tokens.json) — сразу по всем темам и брейкпоинтам,
// поэтому переключатель темы им не нужен (themes: false). Подписи — имена токенов и классов, не тексты продукта

interface Token {
  name: string
  cssVar: string
  type: string | null
  description: string | null
  // Цвета и радиусы — по темам (base, cars2, farm), текст — по брейкпоинтам (small, medium, large)
  values: Record<string, string | undefined>
}

const list: Token[] = tokens.tokens
const dashed = (name: string) => name.split('.').slice(1).join('-')

// Каким классом токен берут в компоненте
const utilities = (token: Token) => {
  const name = dashed(token.name)
  if (token.name.startsWith('color.')) return [`ds:bg-${name}`, `ds:text-${name}`, `ds:border-${name}`]
  if (token.name.startsWith('radius.')) return [`ds:rounded-${name}`]
  if (token.name.startsWith('font.')) return [`ds:font-${name}`]
  if (token.name.startsWith('ease.')) return [`ds:ease-${name}`]
  return [`var(${token.cssVar})`]
}

// Текстовые стили: text.title-lg.size / .line-height / .weight → одна строка на стиль
const textStyles = [...new Set(list.filter(t => t.name.startsWith('text.')).map(t => t.name.split('.')[1]!))].map((style) => {
  const part = (name: string) => list.find(t => t.name === `text.${style}.${name}`)
  return { style, size: part('size'), lineHeight: part('line-height'), weight: part('weight') }
})

const meta = {
  title: 'Основа/Токены',
  parameters: { themes: false }
} satisfies Meta

export default meta

export const Colors: StoryObj = {
  name: 'Цвета',
  render: () => ({
    setup: () => ({ colors: list.filter(t => t.name.startsWith('color.')), themes: tokens.themes, utilities }),
    template: `
      <table class="sb-table">
        <thead>
          <tr><th>Токен</th><th v-for="theme in themes" :key="theme">{{ theme }}</th></tr>
        </thead>
        <tbody>
          <tr v-for="token in colors" :key="token.name">
            <td><code>{{ token.name }}</code><br><code style="opacity: .55">{{ utilities(token).join(' · ') }}</code></td>
            <td v-for="theme in themes" :key="theme" :data-token="token.name" :data-theme="theme">
              <span class="sb-swatch" :style="{ background: token.values[theme] }" />
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
    setup: () => ({ textStyles, breakpoints: tokens.breakpoints }),
    template: `
      <table class="sb-table">
        <thead>
          <tr>
            <th>Стиль · класс</th>
            <th v-for="bp in breakpoints" :key="bp.name">{{ bp.name }}{{ bp.min ? ' от ' + bp.min + ' px' : '' }}</th>
            <th>Сейчас, на этом экране</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in textStyles" :key="row.style">
            <td><code>text.{{ row.style }}</code><br><code style="opacity: .55">ds:text-{{ row.style }}</code></td>
            <td v-for="bp in breakpoints" :key="bp.name">
              <code>{{ row.size?.values[bp.name] }} / {{ row.lineHeight?.values[bp.name] }}<template v-if="row.weight"> · {{ row.weight.values[bp.name] }}</template></code>
            </td>
            <td>
              <span
                :data-text-style="row.style"
                :style="{
                  fontFamily: row.style.startsWith('title') || row.style === 'button' ? 'var(--ds-font-title)' : 'var(--ds-font-body)',
                  fontSize: 'var(--ds-text-' + row.style + ')',
                  lineHeight: 'var(--ds-text-' + row.style + '--line-height)',
                  fontWeight: 'var(--ds-text-' + row.style + '--font-weight, 400)'
                }"
              >ds:text-{{ row.style }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    `
  })
}

export const Radii: StoryObj = {
  name: 'Радиусы и анимации',
  render: () => ({
    setup: () => ({ radii: list.filter(t => t.name.startsWith('radius.')), motion: list.filter(t => /^(duration|ease)\./.test(t.name)), utilities }),
    template: `
      <table class="sb-table">
        <tbody>
          <tr v-for="token in radii" :key="token.name">
            <td><code>{{ token.name }}</code><br><code style="opacity: .55">{{ utilities(token)[0] }}</code></td>
            <td><code>{{ token.values.base }}</code></td>
            <td><div :style="{ width: '96px', height: '56px', borderRadius: 'var(' + token.cssVar + ')', background: 'var(--ds-color-accent)' }" /></td>
          </tr>
          <tr v-for="token in motion" :key="token.name">
            <td><code>{{ token.name }}</code><br><code style="opacity: .55">{{ utilities(token)[0] }}</code></td>
            <td colspan="2"><code>{{ token.values.base }}</code></td>
          </tr>
        </tbody>
      </table>
    `
  })
}
