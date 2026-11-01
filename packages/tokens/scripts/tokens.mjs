// Токены дизайн-системы: JSON в формате W3C Design Tokens (так Figma экспортирует переменные) → CSS для Tailwind 4
// и список для Storybook. Чистые функции без файловой системы — их проверяет packages/tokens/test.
//
// Источник — «коллекция → режим», как переменные у Антона в Figma:
//   primitives            палитра, радиусы, шрифты — компоненты их не видят, только через смысловые токены;
//   theme/<тема>          смысловые токены (color.cta.bg, radius.card…): base целиком, темы игр — только отличия;
//   breakpoint/<размер>   размеры текста: small целиком, medium и large — только отличия от small.

// Tailwind собирается с prefix(ds): переменные темы у него --ds-*, переопределения пишем в те же имена
export const PREFIX = 'ds'
export const THEMES = ['base', 'cars2', 'farm']
// Брейкпоинты как в макетах и в InApp: 667 (по умолчанию) / 844 / 1024
export const BREAKPOINTS = [
  { name: 'small', min: 0 },
  { name: 'medium', min: 844 },
  { name: 'large', min: 1024 }
]
// Шаг отступов: ds:p-4 = 16px — сетка 4 px, без произвольных пикселей
const SPACING = '4px'
// Стандартные значения Tailwind в этих пространствах выключены: остаются только наши токены
const RESET = ['color', 'font', 'radius', 'text', 'breakpoint', 'ease']
// Части текстового токена → переменные Tailwind: text.title-lg.size → --text-title-lg, .weight → --text-title-lg--font-weight
const TEXT_PARTS = { 'size': '', 'line-height': '--line-height', 'weight': '--font-weight', 'tracking': '--letter-spacing' }
// Числа без единиц в этих частях — пиксели (Figma отдаёт размеры числами)
const PX_PATH = /(^|\.)(size|line-height|tracking|radius|spacing|width|height)(\.|$)/
const REF = /^\{([^{}]+)\}$/

/** Дерево файла → плоский список: путь → { value, type, description }. $type наследуется от группы. */
export function flatten(tree, path = [], inheritedType) {
  const out = new Map()
  for (const [name, node] of Object.entries(tree)) {
    if (name.startsWith('$') || !node || typeof node !== 'object') continue
    const key = [...path, name]
    const type = node.$type ?? inheritedType
    if ('$value' in node) out.set(key.join('.'), { value: node.$value, type, description: node.$description })
    else for (const [k, v] of flatten(node, key, type)) out.set(k, v)
  }
  return out
}

/**
 * Ссылка {color.orange.500} → значение; ищем по очереди в scopes (тема → base → примитивы). Токен не ссылается
 * сам на себя: duration.fast темы → duration.fast примитивов. Битая или круговая ссылка — ошибка с именем токена.
 */
function resolve(name, token, scopes, chain = [{ name, token }]) {
  const match = typeof token.value === 'string' ? REF.exec(token.value) : null
  if (!match) return token
  const target = match[1]
  const visited = new Set(chain.map(step => step.token))
  const found = scopes.map(scope => scope.get(target)).find(candidate => candidate && candidate !== token)
  if (!found) throw new Error(`Токен «${chain[0].name}» ссылается на «${target}», а такого токена нет`)
  if (visited.has(found)) throw new Error(`Токен «${chain[0].name}»: ссылки по кругу (${[...chain.map(step => step.name), target].join(' → ')})`)
  const resolved = resolve(target, found, scopes, [...chain, { name: target, token: found }])
  return { ...resolved, type: token.type ?? resolved.type, description: token.description ?? resolved.description }
}

/** Значение для CSS: числа-размеры — в px, вес шрифта и прочие числа — как есть. */
export function cssValue(path, { value, type }) {
  if (typeof value === 'number') {
    const px = type === 'dimension' || (type !== 'fontWeight' && type !== 'number' && PX_PATH.test(path))
    return px ? `${value}px` : String(value)
  }
  if (typeof value === 'string') return value
  throw new Error(`Токен «${path}»: значение ${JSON.stringify(value)} не превратить в CSS`)
}

/** Имя переменной Tailwind без префикса: color.cta.bg → --color-cta-bg, text.title-lg.line-height → --text-title-lg--line-height. */
export function themeVar(path) {
  const parts = path.split('.')
  if (parts[0] === 'text') {
    const suffix = TEXT_PARTS[parts.at(-1)]
    if (parts.length !== 3 || suffix === undefined) throw new Error(`Текстовый токен «${path}»: нужно text.<стиль>.(${Object.keys(TEXT_PARTS).join('|')})`)
    return `--text-${parts[1]}${suffix}`
  }
  return `--${parts.join('-')}`
}

const prefixed = name => `--${PREFIX}-${name.slice(2)}`

/** Только токены, которые есть в образце (base / small): тема или брейкпоинт не может завести новый. */
function assertKnown(kind, mode, tokens, reference) {
  for (const name of tokens.keys()) {
    if (!reference.has(name)) throw new Error(`${kind} «${mode}» задаёт «${name}», а в ${kind === 'Тема' ? 'base' : 'small'} такого токена нет`)
  }
}

/**
 * sources: { primitives, themes: { base, cars2, farm }, breakpoints: { small, medium, large } } — деревья JSON.
 * Результат: { theme: CSS для @theme, overrides: CSS тем и брейкпоинтов, list: токены для Storybook }.
 */
export function buildTokens(sources) {
  const primitives = flatten(sources.primitives)
  const themes = Object.fromEntries(THEMES.map(name => [name, flatten(sources.themes[name] ?? {})]))
  const breakpoints = Object.fromEntries(BREAKPOINTS.map(({ name }) => [name, flatten(sources.breakpoints[name] ?? {})]))
  const base = themes.base
  const small = breakpoints.small
  if (!base.size) throw new Error('Тема base пустая — нечего собирать')
  for (const name of THEMES.slice(1)) assertKnown('Тема', name, themes[name], base)
  for (const { name } of BREAKPOINTS.slice(1)) assertKnown('Брейкпоинт', name, breakpoints[name], small)

  // Значение токена в теме: своё или из base; ссылки — на свою тему, base и примитивы
  const themeValue = (theme, name) => {
    const own = themes[theme].get(name)
    const token = own ?? base.get(name)
    return cssValue(name, resolve(name, token, own ? [themes[theme], base, primitives] : [base, primitives]))
  }
  // Значение на брейкпоинте: своё или из small (не из соседнего размера — так задумано в источнике)
  const sizeValue = (bp, name) => {
    const token = breakpoints[bp].get(name) ?? small.get(name)
    return cssValue(name, resolve(name, token, [breakpoints[bp], small, primitives]))
  }

  const lines = [
    ...RESET.map(space => `  --${space}-*: initial;`),
    `  --spacing: ${SPACING};`,
    ...BREAKPOINTS.slice(1).map(({ name, min }) => `  --breakpoint-${name}: ${min}px;`),
    ...[...base.keys()].map(name => `  ${themeVar(name)}: ${themeValue('base', name)};`),
    ...[...small.keys()].map(name => `  ${themeVar(name)}: ${sizeValue('small', name)};`)
  ]
  const theme = `/* Собрано скриптом packages/tokens/scripts/build.mjs из src/ — не править руками */\n@theme static {\n${lines.join('\n')}\n}\n`

  const blocks = []
  for (const name of THEMES.slice(1)) {
    const changed = [...base.keys()].filter(token => themeValue(name, token) !== themeValue('base', token))
    if (changed.length) blocks.push(`[data-${PREFIX}-theme='${name}'] {\n${changed.map(token => `  ${prefixed(themeVar(token))}: ${themeValue(name, token)};`).join('\n')}\n}`)
  }
  // Каскад min-width: на large действует и блок medium, поэтому large пишет всё, что отличается от medium
  for (let i = 1; i < BREAKPOINTS.length; i++) {
    const { name, min } = BREAKPOINTS[i]
    const previous = BREAKPOINTS[i - 1].name
    const changed = [...small.keys()].filter(token => sizeValue(name, token) !== sizeValue(previous, token))
    if (changed.length) blocks.push(`@media (min-width: ${min}px) {\n  :root, :host {\n${changed.map(token => `    ${prefixed(themeVar(token))}: ${sizeValue(name, token)};`).join('\n')}\n  }\n}`)
  }
  const overrides = `/* Собрано скриптом packages/tokens/scripts/build.mjs из src/ — не править руками.\n   Вне слоёв: сильнее переменных @theme в @layer theme. */\n${blocks.join('\n\n')}\n`

  const list = {
    themes: THEMES,
    breakpoints: BREAKPOINTS,
    tokens: [
      ...[...base.keys()].map(name => ({
        name,
        cssVar: prefixed(themeVar(name)),
        type: resolve(name, base.get(name), [base, primitives]).type ?? null,
        description: base.get(name).description ?? null,
        values: Object.fromEntries(THEMES.map(theme => [theme, themeValue(theme, name)]))
      })),
      ...[...small.keys()].map(name => ({
        name,
        cssVar: prefixed(themeVar(name)),
        type: small.get(name).type ?? null,
        description: small.get(name).description ?? null,
        values: Object.fromEntries(BREAKPOINTS.map(({ name: bp }) => [bp, sizeValue(bp, name)]))
      }))
    ]
  }
  return { theme, overrides, list }
}
