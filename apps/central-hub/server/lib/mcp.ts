// MCP-сервер для нейросетей: искать и читать строки, находить похожие, смотреть дерево
// и справочник, создавать ключи с описанием, писать черновые переводы «от ИИ».
// Утверждать, удалять, переименовывать и перезаписывать тексты людей нельзя: таких инструментов нет,
// а перезапись человеческого перевода дополнительно запрещает база (set_ai_translation).
// Без Nuxt-глобалов: используется маршрутом /mcp и тестами.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { checkText } from '@amaya/l10n-core'
import { errorText, HubError } from './errors'
import {
  REGISTRY_KINDS,
  checkKeyText,
  createKey,
  findSimilar,
  getString,
  keyTree,
  listRegistry,
  listUntranslated,
  searchStrings,
  writeAiTranslation
} from './keys'

export const MCP_TOOLS = [
  'search_strings',
  'get_string',
  'find_similar',
  'get_key_tree',
  'list_registry',
  'create_key',
  'write_draft_translation',
  'list_untranslated',
  'check_text'
] as const

// С таким совпадением похожая строка — повод взять существующий ключ, а не плодить дубль
export const DUPLICATE_SCORE = 0.6

const INSTRUCTIONS = `Сервис локализации Amaya: все тексты продуктов в одном месте.
- Перед созданием ключа найдите похожие строки (find_similar). Если смысл тот же — используйте существующий ключ.
- Ключ по схеме: common. | app.<игра>. | web.<сайт>. | brand.<бренд>. | ds.<компонент>. | test.<тест>.<обычный ключ>.
  Части через точку, внутри snake_case; коды игр, сайтов, брендов и тестов — из list_registry. Языка и вёрстки в ключе нет.
- У нового ключа обязательно описание: где показывается и какие ограничения.
- Тексты: подстановки по имени ({price}), множественное число через |, без HTML, обычный регистр, @ экранируется как {'@'}.
- Ваши тексты сохраняются со статусом «от ИИ». Утверждать, удалять, переименовывать и перезаписывать тексты людей нельзя.`

const reply = (value: unknown) => ({
  content: [{ type: 'text' as const, text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }]
})

const refuse = (message: string) => ({ isError: true, content: [{ type: 'text' as const, text: message }] })

async function run(action: () => Promise<unknown>) {
  try {
    return reply(await action())
  } catch (error) {
    return refuse(errorText(error))
  }
}

export function createMcpServer(db: SupabaseClient, { actor = 'Нейросеть (MCP)' }: { actor?: string } = {}) {
  const server = new McpServer({ name: 'amaya-hub', version: '1.0.0' }, { instructions: INSTRUCTIONS })

  const lang = z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,4})?$/).describe('Код языка: en, ru, de, es, it, pt, fr, sv, nl')
  const key = z.string().min(3).max(200).describe('Ключ строки, например app.cars2.paywall.title')
  const readOnly = { readOnlyHint: true, openWorldHint: false }
  const writes = { readOnlyHint: false, destructiveHint: false, openWorldHint: false }

  server.registerTool('search_strings', {
    title: 'Найти строки',
    description: 'Поиск строк по тексту на любом языке или по части ключа. Можно сузить началом ключа и тегом.',
    inputSchema: {
      query: z.string().optional().describe('Текст или часть ключа'),
      prefix: z.string().optional().describe('Начало ключа, например app.cars2.'),
      tag: z.string().optional(),
      limit: z.number().int().min(1).max(50).optional()
    },
    annotations: readOnly
  }, args => run(() => searchStrings(db, args)))

  server.registerTool('get_string', {
    title: 'Строка целиком',
    description: 'Тексты на всех языках, статусы, описание, лимит длины, чего не хватает и что устарело после правки английского.',
    inputSchema: { key },
    annotations: readOnly
  }, args => run(() => getString(db, args.key)))

  server.registerTool('find_similar', {
    title: 'Похожие строки',
    description: 'Строки с похожим английским текстом или похожим ключом. Вызывайте перед созданием ключа.',
    inputSchema: {
      text: z.string().optional().describe('Английский текст'),
      key: z.string().optional().describe('Предполагаемый ключ'),
      limit: z.number().int().min(1).max(20).optional()
    },
    annotations: readOnly
  }, args => run(() => findSimilar(db, args)))

  server.registerTool('get_key_tree', {
    title: 'Дерево ключей',
    description: 'Разделы ключей от общего к частному и сколько строк внутри. Без prefix — верхний уровень.',
    inputSchema: {
      prefix: z.string().optional().describe('Раздел, например app.cars2'),
      depth: z.number().int().min(1).max(4).optional()
    },
    annotations: readOnly
  }, args => run(() => keyTree(db, args)))

  server.registerTool('list_registry', {
    title: 'Справочник',
    description: 'Коды игр, сайтов, брендов, тестов и проектов — из них составляются ключи.',
    inputSchema: { kind: z.enum(REGISTRY_KINDS as [string, ...string[]]).optional() },
    annotations: readOnly
  }, args => run(() => listRegistry(db, args.kind)))

  server.registerTool('create_key', {
    title: 'Создать ключ',
    description: 'Новый ключ с английским текстом и обязательным описанием. Если есть похожие строки, ключ не создаётся, '
      + 'пока в not_duplicate_reason не объяснено, чем новая строка отличается.',
    inputSchema: {
      key,
      description: z.string().min(10).describe('Где показывается строка и какие у неё ограничения'),
      en: z.string().min(1).describe('Текст на английском'),
      tags: z.array(z.string()).optional(),
      max_length: z.number().int().min(1).max(10_000).optional(),
      not_duplicate_reason: z.string().optional().describe('Почему нельзя взять похожую существующую строку')
    },
    annotations: writes
  }, args => run(async () => {
    const issues = checkText({ text: args.en, maxLength: args.max_length, isNew: true })
    const errors = issues.filter(i => i.level === 'error')
    if (errors.length) throw new HubError(`Текст не подходит: ${errors.map(e => e.message).join('; ')}`)

    const similar = await findSimilar(db, { text: args.en, key: args.key, limit: 5 })
    const close = similar.filter(s => s.score >= DUPLICATE_SCORE)
    if (close.length && !args.not_duplicate_reason?.trim()) {
      throw new HubError('Похожие строки уже есть. Возьмите существующий ключ или объясните в not_duplicate_reason, '
        + `чем новая строка отличается:\n${close.map(s => `- ${s.technical_key} (${Math.round(s.score * 100)}%): ${s.en ?? '—'}`).join('\n')}`)
    }

    const created = await createKey(db, {
      key: args.key,
      description: args.description,
      translations: { en: args.en },
      tags: args.tags,
      maxLength: args.max_length
    }, { actor, source: 'mcp', status: 'ai' })
    return { ...created, status: 'ai', warnings: issues.map(i => i.message) }
  }))

  server.registerTool('write_draft_translation', {
    title: 'Черновой перевод',
    description: 'Перевод строки на язык со статусом «от ИИ». Только пустые переводы или прежние черновики ИИ; '
      + 'тексты людей не перезаписываются. Подстановки и длина проверяются.',
    inputSchema: { key, lang, text: z.string().min(1) },
    annotations: writes
  }, args => run(() => writeAiTranslation(db, { ...args, actor })))

  server.registerTool('list_untranslated', {
    title: 'Что не переведено',
    description: 'Строки без перевода на язык или с переводом, устаревшим после правки английского.',
    inputSchema: {
      lang,
      prefix: z.string().optional().describe('Начало ключа, например app.cars2.'),
      limit: z.number().int().min(1).max(100).optional()
    },
    annotations: readOnly
  }, args => run(() => listUntranslated(db, args)))

  server.registerTool('check_text', {
    title: 'Проверить текст',
    description: 'Подстановки против английского, лимит длины, экранирование @ { } | $, HTML, капс. С key — по правилам этой строки.',
    inputSchema: { text: z.string(), key: key.optional(), lang: lang.optional() },
    annotations: readOnly
  }, args => run(() => checkKeyText(db, args)))

  return server
}
