// Токены дизайн-системы: JSON в формате W3C Design Tokens (так Figma экспортирует переменные) → CSS для Tailwind 4
// и список для Storybook. Чистые функции без файловой системы — их проверяет packages/tokens/test.
//
// Источник — «коллекция → режим», как переменные у Антона в Figma:
//   primitives               палитра, градиенты, тени, шрифты — компоненты их не видят, только через смысловые токены;
//   theme/<тема>             как выглядит: цвета, заливки, тени, шрифты, регистр — base целиком, темы игр — отличия;
//   size/<тема>/<размер>     величины: текст, отступы, радиусы, толщины линий. base/small — целиком, остальное — отличия.
// Размеры зависят и от темы: заголовок Cars 2 на 667 — 26 px Nunito 900, у Farm — 16 px Open Sans 700.
// Значение темы T на размере B: T/B → T/small → base/B → base/small. Если тема задала токен, его лесенку
// по размерам задаёт она сама: Cars 2 на 844 берёт свой small (в макетах 667 и 844 — одни стили SM/*).

import breakpoints from '../src/breakpoints.json' with { type: 'json' }

// Tailwind собирается с prefix(ds): переменные темы у него --ds-*, переопределения пишем в те же имена
const PREFIX = 'ds'
export const THEMES = ['base', 'cars2', 'farm', 'cars2-go', 'babycare']
// Брейкпоинты — один источник на токены, варианты Tailwind и картинки (src/breakpoints.json).
// Размеры как в макетах и в InApp: 667 (по умолчанию) / 844 / 1024. Телефон в альбомной ниже 600 px, поэтому
// размеры iPad (large) — на экране от 600 px в высоту и от 844 px в ширину: так их получают и Android-планшеты
// (960×600) и высокое окно 900×860, которым телефонные 18 px малы, а арт телефона растягивается. Широкое,
// но низкое окно (вебвью в половину экрана, окно браузера) получает размеры телефона — иначе макет iPad не помещается.
// layout — брейкпоинты раскладки, размеры токенов от них не меняются: wide — лендинг в две колонки от 640 px
export const BREAKPOINTS = breakpoints.sizes

/** Условие @media брейкпоинта: «(min-width: 844px) and (min-height: 600px)». */
const mediaQuery = ({ min, minHeight }) => `(min-width: ${min}px)${minHeight ? ` and (min-height: ${minHeight}px)` : ''}`

/**
 * Варианты Tailwind, которые нельзя задать переменной темы: у large есть высота, wide не меняет токены.
 * ds:medium: — обычный брейкпоинт темы.
 */
export const variantsCss = () => {
  const variants = [...BREAKPOINTS.filter(bp => bp.minHeight), ...breakpoints.layout]
  return `/* Собрано скриптом packages/tokens/scripts/build.mjs из src/breakpoints.json — не править руками. */\n${variants.map(bp => `@custom-variant ${bp.name} (@media ${mediaQuery(bp)});`).join('\n')}\n`
}
// Шаг отступов: ds:p-4 = 16px — сетка 4 px, без произвольных пикселей
const SPACING = '4px'
// Стандартные значения Tailwind в этих пространствах выключены: остаются только наши токены
const RESET = ['color', 'font', 'radius', 'text', 'breakpoint', 'ease', 'shadow']
// Части текстового токена → переменные Tailwind: text.title-lg.size → --text-title-lg, .weight → --text-title-lg--font-weight
const TEXT_PARTS = { 'size': '', 'line-height': '--line-height', 'weight': '--font-weight', 'tracking': '--letter-spacing' }
// Числа без единиц в этих частях — пиксели (Figma отдаёт размеры числами)
const PX_PATH = /(^|\.)(size|line-height|tracking|radius|spacing|width|height)(\.|$)/
const REF = /^\{([^{}]+)\}$/

/**
 * Дерево файла → плоский список: путь → { value, type, description }. $type и $description наследуются от группы:
 * описание стиля text.title-lg достаётся его size, line-height и weight.
 */
export function flatten(tree, path = [], inheritedType, inheritedDescription) {
  const out = new Map()
  for (const [name, node] of Object.entries(tree)) {
    if (name.startsWith('$') || !node || typeof node !== 'object') continue
    const key = [...path, name]
    const type = node.$type ?? inheritedType
    const description = node.$description ?? inheritedDescription
    if ('$value' in node) out.set(key.join('.'), { value: node.$value, type, description })
    else for (const [k, v] of flatten(node, key, type, description)) out.set(k, v)
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

/** Только токены, которые есть в образце (base или base/small): тема или размер не может завести новый. */
function assertKnown(kind, mode, tokens, reference, referenceName) {
  for (const name of tokens.keys()) {
    if (!reference.has(name)) throw new Error(`${kind} «${mode}» задаёт «${name}», а в ${referenceName} такого токена нет`)
  }
}

const block = (selector, entries, indent = '') => `${indent}${selector} {\n${entries.map(([name, value]) => `${indent}  ${prefixed(themeVar(name))}: ${value};`).join('\n')}\n${indent}}`
const media = (breakpoint, inner) => `@media ${mediaQuery(breakpoint)} {\n${inner}\n}`

/**
 * sources: { primitives, themes: { base, cars2, farm }, sizes: { base: { small, medium, large }, cars2: {…}, farm: {…} } }
 * — деревья JSON. Результат: { theme: CSS для @theme, overrides: CSS тем и размеров, list: токены для Storybook }.
 */
export function buildTokens(sources) {
  const primitives = flatten(sources.primitives)
  const themes = Object.fromEntries(THEMES.map(name => [name, flatten(sources.themes[name] ?? {})]))
  const sizes = Object.fromEntries(THEMES.map(theme => [theme, Object.fromEntries(BREAKPOINTS.map(({ name }) => [name, flatten(sources.sizes?.[theme]?.[name] ?? {})]))]))
  const base = themes.base
  const small = sizes.base.small
  if (!base.size) throw new Error('Тема base пустая — нечего собирать')
  if (!small.size) throw new Error('Размеры base/small пустые — нечего собирать')
  for (const name of THEMES.slice(1)) assertKnown('Тема', name, themes[name], base, 'base')
  for (const theme of THEMES) {
    for (const { name } of BREAKPOINTS) {
      if (theme !== 'base' || name !== 'small') assertKnown('Файл размеров', `${theme}/${name}`, sizes[theme][name], small, 'base/small')
    }
  }

  // Значение токена в теме: своё или из base; ссылки — на свою тему, base и примитивы
  const themeValue = (theme, name) => {
    const own = themes[theme].get(name)
    const token = own ?? base.get(name)
    return cssValue(name, resolve(name, token, own ? [themes[theme], base, primitives] : [base, primitives]))
  }
  // Значение размера в теме на брейкпоинте: T/B → T/small → base/B → base/small (не из соседнего размера —
  // так задумано в источнике); ссылки ищутся по той же цепочке и в примитивах
  const sizeValue = (theme, bp, name) => {
    const chain = [sizes[theme][bp], sizes[theme].small, sizes.base[bp], small]
    const token = chain.map(scope => scope.get(name)).find(Boolean)
    return cssValue(name, resolve(name, token, [...chain, primitives]))
  }
  const ladder = (theme, name) => BREAKPOINTS.map(({ name: bp }) => sizeValue(theme, bp, name))

  const lines = [
    ...RESET.map(space => `  --${space}-*: initial;`),
    `  --spacing: ${SPACING};`,
    // Вариант ds:large: с условием по высоте объявлен в пресете (@custom-variant) — переменная брейкпоинта
    // Tailwind знает только ширину
    ...BREAKPOINTS.slice(1).filter(bp => !bp.minHeight).map(({ name, min }) => `  --breakpoint-${name}: ${min}px;`),
    ...[...base.keys()].map(name => `  ${themeVar(name)}: ${themeValue('base', name)};`),
    ...[...small.keys()].map(name => `  ${themeVar(name)}: ${sizeValue('base', 'small', name)};`)
  ]
  const theme = `/* Собрано скриптом packages/tokens/scripts/build.mjs из src/ — не править руками */\n@theme static {\n${lines.join('\n')}\n}\n`

  const blocks = []
  const themeSelector = name => `[data-${PREFIX}-theme='${name}']`
  for (const name of THEMES.slice(1)) {
    const changed = [...base.keys()].filter(token => themeValue(name, token) !== themeValue('base', token))
    if (changed.length) blocks.push(block(themeSelector(name), changed.map(token => [token, themeValue(name, token)])))
  }
  // Каскад min-width: на large действует и блок medium, поэтому large пишет всё, что отличается от medium
  for (let i = 1; i < BREAKPOINTS.length; i++) {
    const changed = [...small.keys()].filter(token => sizeValue('base', BREAKPOINTS[i].name, token) !== sizeValue('base', BREAKPOINTS[i - 1].name, token))
    if (changed.length) blocks.push(media(BREAKPOINTS[i], block(':root, :host', changed.map(token => [token, sizeValue('base', BREAKPOINTS[i].name, token)]), '  ')))
  }
  // Размеры темы: если лесенка токена у темы своя, тема пишет её целиком на корне экрана — значения :root
  // до него не доходят, поэтому на small пишем всегда, а дальше — только изменения, тем же каскадом
  for (const name of THEMES.slice(1)) {
    const own = [...small.keys()].filter(token => ladder(name, token).join() !== ladder('base', token).join())
    if (!own.length) continue
    blocks.push(block(themeSelector(name), own.map(token => [token, sizeValue(name, 'small', token)])))
    for (let i = 1; i < BREAKPOINTS.length; i++) {
      const changed = own.filter(token => sizeValue(name, BREAKPOINTS[i].name, token) !== sizeValue(name, BREAKPOINTS[i - 1].name, token))
      if (changed.length) blocks.push(media(BREAKPOINTS[i], block(themeSelector(name), changed.map(token => [token, sizeValue(name, BREAKPOINTS[i].name, token)]), '  ')))
    }
  }
  const overrides = `/* Собрано скриптом packages/tokens/scripts/build.mjs из src/ — не править руками.\n   Вне слоёв: сильнее переменных @theme в @layer theme. */\n${blocks.join('\n\n')}\n`

  const list = {
    themes: THEMES,
    breakpoints: BREAKPOINTS,
    tokens: [
      // Тема: значение по темам
      ...[...base.keys()].map(name => ({
        name,
        kind: 'theme',
        cssVar: prefixed(themeVar(name)),
        type: resolve(name, base.get(name), [base, primitives]).type ?? null,
        description: base.get(name).description ?? null,
        values: Object.fromEntries(THEMES.map(theme => [theme, themeValue(theme, name)]))
      })),
      // Размер: значение по темам и брейкпоинтам
      ...[...small.keys()].map(name => ({
        name,
        kind: 'size',
        cssVar: prefixed(themeVar(name)),
        type: resolve(name, small.get(name), [small, primitives]).type ?? null,
        description: small.get(name).description ?? null,
        values: Object.fromEntries(THEMES.map(theme => [theme, Object.fromEntries(BREAKPOINTS.map(({ name: bp }) => [bp, sizeValue(theme, bp, name)]))]))
      }))
    ]
  }
  return { theme, overrides, list }
}
