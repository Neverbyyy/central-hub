import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// Middleware пропускает часть путей без входа в сервис (PUBLIC_PREFIXES). Каждый такой маршрут обязан сам
// проверить токен или подпись — иначе новый файл в /api/cli/ или /api/figma/plugin/ окажется открытым всем.

const SERVER = join(import.meta.dirname, '../../apps/central-hub/server')

const middleware = readFileSync(join(SERVER, 'middleware/auth.ts'), 'utf8')
const PUBLIC = [...middleware.match(/const PUBLIC_PREFIXES = \[([\s\S]*?)\]/)![1]!.matchAll(/'([^']+)'/g)].map(m => m[1]!)

// Чем защищён каждый публичный префикс приложения; null — открыт намеренно (вход в сервис)
const GUARDS: Record<string, RegExp | null> = {
  '/api/auth/': null,
  '/api/cli/': /defineTokenHandler\('cli',/,
  '/api/figma/plugin/': /defineFigmaPluginHandler\(/,
  '/api/github/webhook': /verifyGithubSignature\(/,
  '/mcp': /requireToken\(event, 'mcp'\)/
}
// Пути самого Nuxt — в них нет маршрутов приложения
const FRAMEWORK = ['/api/_nuxt_icon/', '/_nuxt/', '/__nuxt', '/favicon.ico', '/robots.txt']

const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true })
  .flatMap(entry => (entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]))

// server/api/cli/export/[set].get.ts → /api/cli/export/[set]; server/routes/mcp.ts → /mcp
const routeOf = (file: string) => {
  const path = relative(SERVER, file).replaceAll('\\', '/').replace(/\.ts$/, '').replace(/\.(get|post|put|delete|patch)$/, '').replace(/\/index$/, '')
  return path.startsWith('api/') ? `/${path}` : path.replace(/^routes/, '')
}
const ROUTES = [...files(join(SERVER, 'api')), ...files(join(SERVER, 'routes'))].map(file => ({ file, route: routeOf(file) }))

describe('публичные маршруты защищены сами', () => {
  it('список префиксов прочитан из middleware', () => {
    expect(PUBLIC).toContain('/api/cli/')
    expect(PUBLIC).toContain('/mcp')
  })

  it('у каждого публичного префикса приложения — известная защита', () => {
    for (const prefix of PUBLIC) {
      expect(prefix in GUARDS || FRAMEWORK.includes(prefix), `${prefix}: чем он защищён? Добавьте в GUARDS`).toBe(true)
    }
  })

  it('каждый файл под публичным префиксом проверяет токен или подпись', () => {
    const open = ROUTES.filter(({ route }) => PUBLIC.some(prefix => route.startsWith(prefix)))
    expect(open.length).toBeGreaterThan(5)
    for (const { file, route } of open) {
      const prefix = Object.keys(GUARDS).find(p => route.startsWith(p))
      expect(prefix, `${route}: под публичным путём, но защиты для него нет`).toBeDefined()
      const guard = GUARDS[prefix!]
      if (guard) expect(readFileSync(file, 'utf8'), `${route} должен проверять доступ (${guard})`).toMatch(guard)
    }
  })
})
