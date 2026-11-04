// Сборка токенов: src/*.json → dist/theme.css, overrides.css, variants.css, tokens.json. Логика — в tokens.mjs.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { BREAKPOINTS, buildTokens, THEMES, variantsCss } from './tokens.mjs'

const root = join(import.meta.dirname, '..')
const read = path => JSON.parse(readFileSync(join(root, 'src', path), 'utf8'))
const optional = (path) => {
  try {
    return read(path)
  } catch (error) {
    if (error.code === 'ENOENT') return {}
    throw error
  }
}

try {
  const { theme, overrides, list } = buildTokens({
    primitives: read('primitives.json'),
    themes: Object.fromEntries(THEMES.map(name => [name, optional(`theme/${name}.json`)])),
    sizes: Object.fromEntries(THEMES.map(theme => [theme, Object.fromEntries(BREAKPOINTS.map(({ name }) => [name, optional(`size/${theme}/${name}.json`)]))]))
  })
  mkdirSync(join(root, 'dist'), { recursive: true })
  writeFileSync(join(root, 'dist/theme.css'), theme)
  writeFileSync(join(root, 'dist/overrides.css'), overrides)
  writeFileSync(join(root, 'dist/variants.css'), variantsCss())
  writeFileSync(join(root, 'dist/tokens.json'), `${JSON.stringify(list, null, 2)}\n`)
  console.log(`Токены: ${list.tokens.length}, темы: ${THEMES.join(', ')}`)
} catch (error) {
  console.error(`Токены не собрались: ${error.message}`)
  process.exit(1)
}
