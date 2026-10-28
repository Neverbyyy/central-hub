import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { placeholders } from '../../packages/l10n-core/src'
import { createMcpServer, MCP_TOOLS } from '../../apps/central-hub/server/lib/mcp'
import { ACTOR, service } from './clients'

// Сервер MCP с настоящей базой, клиент — в том же процессе
const KEY = 'common.selftest.mcp_created.default'
const HUMAN_KEY = 'legacy.pages_hub.a.gift_card.common.gift_card_code'

const client = new Client({ name: 'selftest', version: '1.0.0' })

const call = async (name: string, args: Record<string, unknown>) => {
  const result = await client.callTool({ name, arguments: args }) as { isError?: boolean, content: { type: string, text: string }[] }
  return { isError: !!result.isError, text: result.content.map(c => c.text).join('\n') }
}

beforeAll(async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await createMcpServer(service, { actor: 'Автотест MCP' }).connect(serverTransport)
  await client.connect(clientTransport)
})

afterAll(async () => {
  await service.rpc('deprecate_keys', { p_keys: [KEY], p_actor: ACTOR, p_source: 'test' })
  await client.close()
})

describe('MCP', () => {
  it('инструменты — ровно разрешённые: утверждать, удалять и переименовывать нечем', async () => {
    const { tools } = await client.listTools()
    expect(tools.map(t => t.name).sort()).toEqual([...MCP_TOOLS].sort())
    expect(tools.every(t => t.description)).toBe(true)
  })

  it('поиск, строка целиком и похожие', async () => {
    const search = await call('search_strings', { query: 'continue', limit: 3 })
    expect(search.isError).toBe(false)
    expect(JSON.parse(search.text)).toHaveLength(3)

    const string = await call('get_string', { key: HUMAN_KEY })
    expect(JSON.parse(string.text)).toMatchObject({ key: HUMAN_KEY, missing: [] })

    const similar = await call('find_similar', { text: 'Continue' })
    expect(JSON.parse(similar.text)[0].score).toBe(1)
  })

  it('дубль без объяснения не создаётся', async () => {
    const result = await call('create_key', {
      key: 'common.selftest.mcp_duplicate.default',
      description: 'Проверка: дубль существующей строки Continue',
      en: 'Continue'
    })
    expect(result.isError).toBe(true)
    expect(result.text).toContain('Похожие строки уже есть')
  })

  it('неправильный ключ и текст с HTML не создаются', async () => {
    const badName = await call('create_key', { key: 'common.Selftest.mcp', description: 'Проверка правил имени из MCP', en: 'Selftest zqx unique' })
    expect(badName.text).toContain('латиница')

    const html = await call('create_key', { key: 'common.selftest.mcp_html.default', description: 'Проверка HTML из MCP', en: 'Line<br/>break zqx' })
    expect(html.text).toContain('HTML')
  })

  it('создаёт ключ «от ИИ» с описанием; второй раз — «уже есть»', async () => {
    const args = { key: KEY, description: 'Служебный ключ автотестов MCP', en: 'Selftest MCP zqxv phrase' }
    const first = await call('create_key', args)
    if (first.isError) expect(first.text).toContain('уже есть')
    expect((await call('create_key', args)).text).toContain('уже есть')
    await service.rpc('restore_keys', { p_keys: [KEY], p_actor: ACTOR, p_source: 'test' })

    const string = JSON.parse((await call('get_string', { key: KEY })).text)
    expect(string.status.en).toBe('ai')
    const { data: created } = await service.from('history').select('source, actor').eq('technical_key', KEY).eq('field', 'created').single()
    expect(created).toMatchObject({ source: 'mcp' })
  })

  it('черновой перевод: проверка подстановок и запрет перезаписи текстов людей', async () => {
    const extra = await call('write_draft_translation', { key: KEY, lang: 'de', text: 'Selbsttest {name}' })
    expect(extra.isError).toBe(true)
    expect(extra.text).toContain('Подстановок нет в английском')

    expect((await call('write_draft_translation', { key: KEY, lang: 'de', text: 'Selbsttest MCP' })).isError).toBe(false)

    // Подстановки как в английском — чтобы отказ был именно из-за текста человека
    const { en } = JSON.parse((await call('get_string', { key: HUMAN_KEY })).text).translations
    const text = ['KI überschreibt', ...placeholders(en).map(p => `{${p}}`)].join(' ')
    const human = await call('write_draft_translation', { key: HUMAN_KEY, lang: 'de', text })
    expect(human.isError).toBe(true)
    expect(human.text).toContain('написал человек')
  })

  it('что не переведено и проверка текста', async () => {
    const untranslated = await call('list_untranslated', { lang: 'de', prefix: 'legacy.inapp.', limit: 5 })
    expect(JSON.parse(untranslated.text).length).toBeGreaterThan(0)

    const check = JSON.parse((await call('check_text', { text: 'support@example.com' })).text)
    expect(check[0].message).toContain('«@»')
  })
})
