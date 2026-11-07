// Упаковка пакетов @amaya/* в .tgz для пилота доставки: как будущая публикация в приватный реестр, только файлами.
//   node tools/pack-pilot.mjs <папка для .tgz> [версия]
// Копирует пакет во временную папку, ставит версию, заменяет workspace:* на эту версию и вызывает npm pack.
// Рабочая область не меняется. Истории и node_modules в пакет не идут
import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const [dest, version = '0.1.0'] = process.argv.slice(2)
if (!dest) throw new Error('node tools/pack-pilot.mjs <папка для .tgz> [версия]')

// npm pack запускается из временной папки: путь должен быть абсолютным
const out = resolve(dest)
const root = fileURLToPath(new URL('..', import.meta.url))
const PACKAGES = ['tokens', 'icons', 'ui', 'locales', 'art', 'landing-kit', 'nuxt']

mkdirSync(out, { recursive: true })
const temp = mkdtempSync(join(tmpdir(), 'amaya-pack-'))
try {
  for (const name of PACKAGES) {
    const dir = join(temp, name)
    cpSync(join(root, 'packages', name), dir, {
      recursive: true,
      filter: source => !['node_modules', '.turbo', 'test'].includes(basename(source)) && !source.endsWith('.stories.ts')
    })
    const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    manifest.version = version
    delete manifest.private
    delete manifest.devDependencies
    delete manifest.scripts
    for (const field of ['dependencies', 'peerDependencies']) {
      for (const [dep, range] of Object.entries(manifest[field] ?? {})) {
        if (String(range).startsWith('workspace:')) manifest[field][dep] = version
      }
    }
    writeFileSync(join(dir, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`)
    const file = execFileSync('npm', ['pack', '--silent', '--pack-destination', out], { cwd: dir, encoding: 'utf8', shell: true }).trim().split('\n').pop()
    console.log(file)
  }
} finally {
  rmSync(temp, { recursive: true, force: true })
}
