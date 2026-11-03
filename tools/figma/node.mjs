// Дерево узла Figma для сборки экрана: кадры, размеры и положение, автолейаут, тексты со стилем, заливки, тени.
// Figma MCP на тарифе Starter — 6 вызовов в месяц, поэтому — REST API с личным токеном FIGMA_ACCESS_TOKEN из .env.
//   node tools/figma/node.mjs <ссылка на фрейм или fileKey> [nodeId] [--depth 12]
//   node tools/figma/node.mjs "https://www.figma.com/design/Nu52yK50BBS8zhwXMQAjjx/Untitled?node-id=8-1368"
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export function figmaToken() {
  const env = readFileSync(fileURLToPath(new URL('../../.env', import.meta.url)), 'utf8').split(/\r?\n/)
  const line = env.find(item => item.startsWith('FIGMA_ACCESS_TOKEN='))
  if (!line) throw new Error('Нет FIGMA_ACCESS_TOKEN в .env (личный токен Figma, File content: read-only)')
  return line.slice('FIGMA_ACCESS_TOKEN='.length).replace(/^["']|["']$/g, '')
}

/** Ссылка на фрейм → { key, node }: node-id=8-1368 → 8:1368. */
export function parseTarget(target, node) {
  const url = /figma\.com\/(?:design|file)\/([^/]+)\/[^?]*(?:\?.*node-id=([\d-:]+))?/.exec(target)
  if (url) return { key: url[1], node: (node ?? url[2] ?? '').replace('-', ':') }
  return { key: target, node: (node ?? '').replace('-', ':') }
}

/**
 * Запрос с повтором при 429 и 5xx: Figma ограничивает частоту, ждём Retry-After (или 2, 4, 8 с).
 * Retry-After дольше минуты — исчерпан лимит тарифа (бывают дни): не ждём, а сразу говорим, когда можно снова.
 */
export async function figmaFetch(url, init) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, init)
    if ((res.status !== 429 && res.status < 500) || attempt === 3) return res
    const wait = Number(res.headers.get('retry-after')) || 2 ** (attempt + 1)
    if (wait > 60) {
      throw new Error(`Figma: лимит запросов исчерпан, снова — через ${Math.ceil(wait / 3600)} ч. Возьми сохранённые эталоны или выгрузи кадры из Figma руками`)
    }
    console.error(`${res.status}, повтор через ${wait} с`)
    await new Promise(resolve => setTimeout(resolve, wait * 1000))
  }
}

export async function figma(path) {
  const res = await figmaFetch(`https://api.figma.com/v1/${path}`, { headers: { 'X-Figma-Token': figmaToken() } })
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`)
  return res.json()
}

const hex = c => `#${[c.r, c.g, c.b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('').toUpperCase()}${c.a !== undefined && c.a < 1 ? Math.round(c.a * 255).toString(16).padStart(2, '0').toUpperCase() : ''}`
const paint = f => f.type === 'SOLID'
  ? hex({ ...f.color, a: (f.color.a ?? 1) * (f.opacity ?? 1) })
  : f.type === 'IMAGE' ? `IMG:${f.imageRef?.slice(0, 8)}:${f.scaleMode}` : `${f.type.replace('GRADIENT_', '')}(${(f.gradientStops ?? []).map(s => `${hex(s.color)} ${Math.round(s.position * 100)}%`).join(', ')})`
const effect = e => `${e.type === 'INNER_SHADOW' ? 'inset ' : ''}${e.offset?.x ?? 0} ${e.offset?.y ?? 0} ${e.radius}${e.spread ? ` ${e.spread}` : ''} ${e.color ? hex(e.color) : ''}`

/** Строки дерева: одна строка — один узел. Невидимые узлы пропускаются. */
export function describeTree(root, maxDepth = 12) {
  const base = root.absoluteBoundingBox
  const lines = []
  const walk = (n, depth) => {
    if (n.visible === false) return
    const b = n.absoluteBoundingBox
    const parts = [`${n.type.slice(0, 5)} ${n.id} «${n.name}»`]
    if (b) parts.push(`${Math.round(b.width)}×${Math.round(b.height)} @${Math.round(b.x - base.x)},${Math.round(b.y - base.y)}`)
    if (n.layoutMode) parts.push(`[${n.layoutMode === 'HORIZONTAL' ? 'H' : 'V'} gap${n.itemSpacing ?? 0} p${n.paddingTop ?? 0}/${n.paddingRight ?? 0}/${n.paddingBottom ?? 0}/${n.paddingLeft ?? 0} ${n.primaryAxisAlignItems ?? ''}/${n.counterAxisAlignItems ?? ''}]`)
    const fills = (n.fills ?? []).filter(f => f.visible !== false).map(paint)
    if (fills.length && n.type !== 'TEXT') parts.push(`bg ${fills.join(' ')}`)
    const strokes = (n.strokes ?? []).filter(f => f.visible !== false).map(paint)
    if (strokes.length) parts.push(`stroke ${strokes.join(' ')}/${n.strokeWeight}`)
    if (n.cornerRadius) parts.push(`r${n.cornerRadius}`)
    const effects = (n.effects ?? []).filter(e => e.visible !== false).map(effect)
    if (effects.length) parts.push(`fx ${effects.join(', ')}`)
    if (n.type === 'TEXT') {
      const s = n.style
      parts.push(`${s.fontFamily} ${s.fontWeight} ${s.fontSize}/${Math.round(s.lineHeightPx)}${s.textCase ? ` ${s.textCase}` : ''} ${fills.join(' ')} «${n.characters.replace(/\s+/g, ' ').slice(0, 120)}»`)
    }
    lines.push(`${'  '.repeat(depth)}${parts.join('  ')}`)
    if (n.children && n.type !== 'INSTANCE' && depth < maxDepth) n.children.forEach(child => walk(child, depth + 1))
    if (n.type === 'INSTANCE') lines.push(`${'  '.repeat(depth + 1)}(экземпляр компонента ${n.componentId ?? ''})`)
  }
  walk(root, 0)
  return lines
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2)
  const depthAt = args.indexOf('--depth')
  const depth = depthAt >= 0 ? Number(args.splice(depthAt, 2)[1]) : 12
  const { key, node } = parseTarget(args[0], args[1])
  if (!key || !node) throw new Error('Нужна ссылка на фрейм (с node-id) или fileKey и nodeId')
  const data = await figma(`files/${key}/nodes?ids=${encodeURIComponent(node)}`)
  console.log(describeTree(data.nodes[node].document, depth).join('\n'))
}
