import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildPluginFiles, PLUGIN_FILES } from '../../apps/central-hub/server/lib/figma-plugin'

// Архив плагина под стенд собирается из настоящих исходников packages/figma-plugin/src
const SRC = join(import.meta.dirname, '../../packages/figma-plugin/src')
const sources = Object.fromEntries(PLUGIN_FILES.map(name => [name, readFileSync(join(SRC, name), 'utf8')])) as Record<(typeof PLUGIN_FILES)[number], string>

const ORIGIN = 'https://hub.example.com'
const SUPABASE = 'https://abc.supabase.co'

describe('сборка плагина Figma под стенд', () => {
  it('с Supabase: адрес сервиса и wss Supabase в манифесте, адрес и ключ — в коде, заглушек не остаётся', () => {
    const files = buildPluginFiles(sources, { origin: ORIGIN, supabaseUrl: SUPABASE, supabaseKey: 'sb_publishable_x' })
    for (const name of PLUGIN_FILES) expect(files[name], name).not.toMatch(/__[A-Z_]+__/)
    expect(JSON.parse(files['manifest.json']).networkAccess.allowedDomains).toEqual([ORIGIN, 'wss://abc.supabase.co'])
    expect(files['code.js']).toContain(`'${ORIGIN}'`)
    expect(files['code.js']).toContain(`'${SUPABASE}'`)
    expect(files['code.js']).toContain('\'sb_publishable_x\'')
    // Окно плагина без подстановок — каким лежит в исходниках
    expect(files['ui.html']).toBe(sources['ui.html'])
  })

  it('без адреса или ключа Supabase: только сервис, Realtime выключен пустыми строками', () => {
    for (const target of [{ supabaseUrl: '', supabaseKey: 'k' }, { supabaseUrl: SUPABASE, supabaseKey: '' }]) {
      const files = buildPluginFiles(sources, { origin: ORIGIN, ...target })
      expect(JSON.parse(files['manifest.json']).networkAccess.allowedDomains).toEqual([ORIGIN])
      expect(files['code.js']).not.toMatch(/__[A-Z_]+__/)
      expect(files['code.js']).not.toContain(SUPABASE)
      expect(files['code.js']).not.toContain('\'k\'')
    }
  })

  it('манифест — JSON с переводом строки в конце, остальные поля как в исходнике', () => {
    const { 'manifest.json': manifest } = buildPluginFiles(sources, { origin: ORIGIN, supabaseUrl: '', supabaseKey: '' })
    expect(manifest.endsWith('}\n')).toBe(true)
    const { networkAccess, ...rest } = JSON.parse(manifest)
    const { networkAccess: source, ...sourceRest } = JSON.parse(sources['manifest.json'])
    expect(rest).toEqual(sourceRest)
    expect(networkAccess.reasoning).toBe(source.reasoning)
  })
})
