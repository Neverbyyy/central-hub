// Манифест компонентов дизайн-системы — генерируется из кода, руками не правится:
// какие компоненты есть (Ds* в ui, шаблоны Pw* в paywall-kit, блоки Lk* в landing-kit), что это и когда использовать
// (JSDoc в начале <script setup>), пропсы с типами, значениями по умолчанию и пояснениями, события и слоты.
// Его читает Claude Code перед сборкой экрана (CLAUDE.md, скиллы). В Figma компонент называется так же без Ds/Pw/Lk.
//   node scripts/manifest.mjs           — записать manifest.json и manifest.md
//   node scripts/manifest.mjs --check   — упасть, если манифест устарел (запускается в lint)
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'vue/compiler-sfc'

const UI = fileURLToPath(new URL('..', import.meta.url))
const ROOT = join(UI, '../..')
const SOURCES = [
  { package: '@amaya/ui', dir: join(ROOT, 'packages/ui/src/components'), prefix: 'Ds', group: 'Компоненты' },
  { package: '@amaya/paywall-kit', dir: join(ROOT, 'packages/paywall-kit/src/templates'), prefix: 'Pw', group: 'Шаблоны пейволлов' },
  { package: '@amaya/landing-kit', dir: join(ROOT, 'packages/landing-kit/src/blocks'), prefix: 'Lk', group: 'Блоки лендинга' }
]

/** Текст между парными скобками, начиная с открывающей: «{ a: { b } }» → « a: { b } ». */
function balanced(text, start) {
  const open = text[start]
  const close = { '{': '}', '<': '>', '(': ')', '[': ']' }[open]
  let depth = 0
  for (let i = start; i < text.length; i++) {
    if (text[i] === open) depth++
    else if (text[i] === close && --depth === 0) return text.slice(start + 1, i)
  }
  return ''
}

/** Записи тела объекта или типа верхнего уровня: по переводу строки, «;» и «,» вне скобок; комментарии // — к записи ниже. */
function entries(body) {
  const out = []
  let depth = 0
  let current = ''
  let comment = []
  const flush = () => {
    const text = current.trim().replace(/[;,]$/, '').trim()
    if (text.startsWith('//')) comment.push(text.replace(/^\/\/\s*/, ''))
    else if (text) {
      out.push({ text, comment: comment.join(' ') })
      comment = []
    }
    current = ''
  }
  for (let i = 0; i < body.length; i++) {
    const char = body[i]
    if ('{<(['.includes(char)) depth++
    if ('}>)]'.includes(char) && body[i - 1] !== '=') depth--
    if (depth === 0 && (char === '\n' || char === ';' || char === ',')) flush()
    else current += char
  }
  flush()
  return out
}

/** «name?: Type» → { name, type, required }. */
function member(text) {
  const match = /^([\w$'-]+)(\?)?\s*:\s*([\s\S]+)$/.exec(text)
  if (!match) return null
  return { name: match[1].replace(/'/g, ''), required: !match[2], type: match[3].replace(/\s+/g, ' ').trim() }
}

/** Пропсы из тела объекта или типа: записи, которые читаются как «имя: тип». */
const propsOf = body => entries(body)
  .map(({ text, comment }) => ({ ...member(text), comment }))
  .filter(prop => prop.name)

/** Общие пропсы экранов: шаблоны пишут defineProps<ScreenProps & { … }>, а объявлены они в config.ts paywall-kit. */
function screenProps() {
  const config = readFileSync(join(ROOT, 'packages/paywall-kit/src/config.ts'), 'utf8')
  return propsOf(balanced(config, config.indexOf('{', config.indexOf('interface ScreenProps'))))
}

function describe(file, source) {
  const { descriptor } = parse(readFileSync(file, 'utf8'), { filename: file })
  const script = descriptor.scriptSetup?.content ?? ''
  const name = file.split(/[\\/]/).pop().replace(/\.vue$/, '')
  const doc = /\/\*\*([\s\S]*?)\*\//.exec(script)?.[1]
    .split('\n').map(line => line.replace(/^\s*\*\s?/, '').trim()).filter(Boolean).join(' ') ?? ''

  const propsAt = script.indexOf('defineProps<')
  const props = propsAt < 0
    ? []
    : [
        ...(script.startsWith('ScreenProps', propsAt + 'defineProps<'.length) ? screenProps() : []),
        ...propsOf(balanced(script, script.indexOf('{', propsAt)))
      ]
  const defaultsAt = script.indexOf('withDefaults(')
  if (defaultsAt >= 0) {
    // Второй аргумент withDefaults: после закрытия defineProps<…>()
    const after = script.indexOf('>(),', propsAt)
    const objectStart = script.indexOf('{', after)
    for (const { text } of entries(balanced(script, objectStart))) {
      const match = /^([\w$'-]+)\s*:\s*([\s\S]+)$/.exec(text)
      const prop = match && props.find(item => item.name === match[1].replace(/'/g, ''))
      if (prop) prop.default = match[2].trim()
    }
  }

  const emitsAt = script.indexOf('defineEmits<')
  const emits = emitsAt < 0
    ? []
    : entries(balanced(script, script.indexOf('{', emitsAt)))
        .map(({ text, comment }) => {
          const match = /^([\w$'-:]+)\s*:\s*\[([\s\S]*)\]$/.exec(text)
          return match ? { name: match[1].replace(/'/g, ''), args: match[2].trim(), comment } : null
        })
        .filter(Boolean)

  const template = descriptor.template?.content ?? ''
  const slots = [...new Set([...template.matchAll(/<slot\b([^>]*)>/g)].map(match => /\bname="([^"]+)"/.exec(match[1])?.[1] ?? 'default'))]

  return {
    name,
    figma: name.slice(source.prefix.length),
    package: source.package,
    group: source.group,
    file: relative(ROOT, file).replaceAll('\\', '/'),
    description: doc,
    props,
    emits,
    slots
  }
}

function build() {
  const components = []
  for (const source of SOURCES) {
    if (!existsSync(source.dir)) continue
    for (const file of readdirSync(source.dir).filter(item => item.startsWith(source.prefix) && item.endsWith('.vue')).sort()) {
      components.push(describe(join(source.dir, file), source))
    }
  }
  return components
}

const cell = text => String(text ?? '').replaceAll('|', '\\|').replace(/\s+/g, ' ')

function markdown(components) {
  const lines = [
    '# Манифест компонентов',
    '',
    'Собран скриптом `packages/ui/scripts/manifest.mjs` из кода — руками не правится (`pnpm --filter @amaya/ui manifest`).',
    'Экран собирается только из этих компонентов. В Figma компонент называется так же без префикса: `PlanCard` ↔ `DsPlanCard`.',
    'Тексты — ключами из сервиса, в компоненты приходят уже переведёнными (пропсы и слоты); цвета и размеры — только токены.',
    ''
  ]
  for (const group of [...new Set(components.map(item => item.group))]) {
    lines.push(`## ${group}`, '')
    for (const item of components.filter(component => component.group === group)) {
      lines.push(`### ${item.name}`, '', `\`${item.package}\` · Figma: ${item.figma} · \`${item.file}\``, '', item.description || '—', '')
      if (item.props.length) {
        lines.push('| Проп | Тип | По умолчанию | Пояснение |', '| --- | --- | --- | --- |')
        for (const prop of item.props) lines.push(`| \`${prop.name}\`${prop.required ? '' : '?'} | \`${cell(prop.type)}\` | ${prop.default ? `\`${cell(prop.default)}\`` : ''} | ${cell(prop.comment)} |`)
        lines.push('')
      }
      if (item.emits.length) lines.push(`События: ${item.emits.map(emit => `\`${emit.name}(${emit.args})\`${emit.comment ? ` — ${emit.comment}` : ''}`).join('; ')}`, '')
      if (item.slots.length) lines.push(`Слоты: ${item.slots.map(slot => `\`${slot}\``).join(', ')}`, '')
    }
  }
  return `${lines.join('\n').trimEnd()}\n`
}

const components = build()
const json = `${JSON.stringify({ generated: 'packages/ui/scripts/manifest.mjs', components }, null, 2)}\n`
const md = markdown(components)
const files = { [join(UI, 'manifest.json')]: json, [join(UI, 'manifest.md')]: md }

if (process.argv.includes('--check')) {
  const stale = Object.entries(files).filter(([file, content]) => !existsSync(file) || readFileSync(file, 'utf8').replace(/\r\n/g, '\n') !== content)
  if (stale.length) {
    console.error(`Манифест компонентов устарел: ${stale.map(([file]) => relative(ROOT, file)).join(', ')}. Запустите pnpm --filter @amaya/ui manifest`)
    process.exit(1)
  }
  console.log(`Манифест свежий: ${components.length} компонентов`)
} else {
  for (const [file, content] of Object.entries(files)) writeFileSync(file, content)
  console.log(`Манифест: ${components.length} компонентов → packages/ui/manifest.json, manifest.md`)
}
