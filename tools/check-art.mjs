// Арт без копий: один файл на все продукты. Запускается в lint пакета @amaya/art.
//   - два одинаковых файла — ошибка: общий арт лежит в packages/art, размер, который повторяет меньший, не нужен:
//     DsImage сам берёт меньший;
//   - PNG в лендинге — ошибка: браузеры лендинга понимают webp, а весит он в разы меньше.
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const LANDINGS = 'apps/landings/app'
const FOLDERS = [LANDINGS, 'apps/inapp-preview/src/variants', 'apps/storybook/rive', 'packages/art']
const ART = /\.(webp|png|riv|mp4|svg)$/

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path, out)
    else if (ART.test(entry.name)) out.push(path)
  }
  return out
}

const files = FOLDERS.map(folder => join(ROOT, folder)).filter(existsSync).flatMap(folder => walk(folder))
const seen = new Map()
const problems = []
for (const file of files) {
  const name = relative(ROOT, file).replaceAll('\\', '/')
  const hash = createHash('sha256').update(readFileSync(file)).digest('hex')
  if (seen.has(hash)) problems.push(`Одинаковые файлы: ${seen.get(hash)} и ${name}. Общий арт — в packages/art, лишний размер удалите`)
  else seen.set(hash, name)
  if (name.startsWith(LANDINGS) && name.endsWith('.png')) problems.push(`PNG в лендинге: ${name}. Лендингу нужен только webp`)
}

if (problems.length) {
  console.error(problems.join('\n'))
  process.exit(1)
}
console.log(`Арт: ${files.length} файлов, копий нет`)
