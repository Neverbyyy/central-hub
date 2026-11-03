// Выгрузка из Figma для сборки экрана (REST, FIGMA_ACCESS_TOKEN из .env):
//   node tools/figma/export.mjs <ссылка или fileKey> <папка> render <nodeId>... — PNG узлов (эталон и векторный арт), scale 2
//   node tools/figma/export.mjs <ссылка или fileKey> <папка> fills <nodeId>      — исходники картинок-заливок внутри узла
// render — кадр как в макете (с фоном и градиентом под артом), fills — исходная картинка без фона и обрезки.
// Дальше арт режется по конвенции (tools/figma/image-set.mjs) и кладётся в папку экрана. 429 — повтор сам.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { figma, figmaFetch, parseTarget } from './node.mjs'

const [target, out, mode, ...ids] = process.argv.slice(2)
const { key } = parseTarget(target)
if (!key || !out || !['render', 'fills'].includes(mode) || !ids.length) {
  throw new Error('node tools/figma/export.mjs <ссылка> <папка> render|fills <nodeId>...')
}
mkdirSync(out, { recursive: true })
const nodes = ids.map(id => id.replace('-', ':'))
const save = async (url, file) => {
  if (!url) throw new Error(`${file}: Figma не отдала картинку (узел пустой или невидимый)`)
  const res = await figmaFetch(url)
  if (!res.ok) throw new Error(`${file}: ${res.status}`)
  writeFileSync(join(out, file), Buffer.from(await res.arrayBuffer()))
  console.log(join(out, file))
}

if (mode === 'render') {
  const images = await figma(`images/${key}?ids=${encodeURIComponent(nodes.join(','))}&format=png&scale=2`)
  for (const id of nodes) await save(images.images[id], `${id.replace(':', '-')}@2x.png`)
} else {
  const data = await figma(`files/${key}/nodes?ids=${encodeURIComponent(nodes.join(','))}`)
  const refs = new Map()
  const walk = (n) => {
    for (const f of n.fills ?? []) if (f.type === 'IMAGE' && f.imageRef) refs.set(f.imageRef, n.name)
    n.children?.forEach(walk)
  }
  nodes.forEach(id => walk(data.nodes[id].document))
  const fills = await figma(`files/${key}/images`)
  for (const [ref, name] of refs) await save(fills.meta.images[ref], `${name.replace(/[^\w-]+/g, '_')}-${ref.slice(0, 8)}.png`)
}
