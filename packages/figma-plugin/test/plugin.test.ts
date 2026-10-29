// Плагин «Amaya Hub — тексты» на поддельном figma: src/code.js выполняется как есть в node:vm.
import { readFileSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const HUB = 'https://hub.test'
const SOURCE = readFileSync(new URL('../src/code.js', import.meta.url), 'utf8').replaceAll('__HUB_ORIGIN__', HUB)

const MODES = [['en', 'English'], ['ru', 'Russian'], ['de', 'German']].map(([code, name]) => ({ code, name }))
const SETTINGS = { prefixes: ['common', 'app.cars2'], langs: ['en', 'ru', 'de'], live: true }

interface Payload {
  now: string
  modes: typeof MODES
  variables: { key: string, name: string, description: string, values: Record<string, string> }[]
  removed: string[]
}

const variable = (key: string, en: string, extra: Record<string, string> = {}) =>
  ({ key, name: key.split('.').join('/'), description: `Описание ${key}`, values: { en, ru: '', de: '', ...extra } })

const texts = (variables: Payload['variables'], removed: string[] = [], now = '2026-10-29T10:00:00.000Z'): Payload =>
  ({ now, modes: MODES, variables, removed })

class FakeVariable {
  description = ''
  scopes = ['ALL_SCOPES']
  valuesByMode: Record<string, string> = {}
  writes = 0
  private data = new Map<string, string>()
  constructor(readonly id: string, public name: string, readonly variableCollectionId: string, readonly resolvedType: string) {}
  setValueForMode(modeId: string, value: string) {
    this.valuesByMode[modeId] = value
    this.writes++
  }
  getPluginData(key: string) { return this.data.get(key) ?? '' }
  setPluginData(key: string, value: string) { this.data.set(key, value) }
}

class FakeCollection {
  modes = [{ modeId: `${this.id}/0`, name: 'Mode 1' }]
  removed = false
  constructor(readonly id: string, public name: string, private maxModes: number) {}
  // Как в Figma: удалённая коллекция пропадает из локальных, но по id всё ещё находится
  remove() { this.removed = true }
  renameMode(modeId: string, name: string) { this.modes.find(m => m.modeId === modeId)!.name = name }
  addMode(name: string) {
    if (this.modes.length >= this.maxModes) throw new Error(`in addMode: Limited to ${this.maxModes} modes only`)
    const modeId = `${this.id}/${this.modes.length}`
    this.modes.push({ modeId, name })
    return modeId
  }
}

function setup({ command = 'open', token = 'secret', settings = null as object | null, maxModes = 10 } = {}) {
  let ids = 0
  const collections = new Map<string, FakeCollection>()
  const variables = new Map<string, FakeVariable>()
  const root = new Map<string, string>(settings ? [['settings', JSON.stringify(settings)]] : [])
  const storage = new Map<string, string>([['token', token]])
  const posted: any[] = []
  const requests: { url: string, auth: string }[] = []
  const timers: { fn: () => void, delay: number, cleared?: boolean }[] = []
  const env = {
    closed: undefined as string | undefined,
    shown: false,
    relaunch: null as Record<string, string> | null,
    // Ответ сервиса на следующий запрос текстов
    respond: (_url: string): { status: number, body: unknown } => ({ status: 500, body: {} })
  }

  const figma = {
    command,
    root: {
      getPluginData: (key: string) => root.get(key) ?? '',
      setPluginData: (key: string, value: string) => root.set(key, value),
      setRelaunchData: (data: Record<string, string>) => { env.relaunch = data }
    },
    clientStorage: {
      getAsync: async (key: string) => storage.get(key),
      setAsync: async (key: string, value: string) => { storage.set(key, value) }
    },
    showUI: () => { env.shown = true },
    ui: { postMessage: (message: unknown) => posted.push(message), onmessage: null as null | ((message: unknown) => void) },
    on: () => {},
    closePlugin: (message?: string) => { env.closed = message ?? '' },
    variables: {
      getVariableCollectionByIdAsync: async (id: string) => collections.get(id) ?? null,
      getLocalVariableCollectionsAsync: async () => [...collections.values()].filter(c => !c.removed),
      createVariableCollection: (name: string) => {
        const collection = new FakeCollection(`collection:${++ids}`, name, maxModes)
        collections.set(collection.id, collection)
        return collection
      },
      getLocalVariablesAsync: async (type: string) =>
        [...variables.values()].filter(v => v.resolvedType === type && !collections.get(v.variableCollectionId)!.removed),
      createVariable: (name: string, collection: FakeCollection, type: string) => {
        if ([...variables.values()].some(v => v.variableCollectionId === collection.id && v.name === name)) throw new Error(`duplicate ${name}`)
        const created = new FakeVariable(`variable:${++ids}`, name, collection.id, type)
        variables.set(created.id, created)
        return created
      }
    }
  }

  const fetch = async (url: string, init: { headers: Record<string, string> }) => {
    requests.push({ url, auth: init.headers.Authorization! })
    const path = new URL(url).pathname
    const { status, body } = path.endsWith('/sections')
      ? { status: 200, body: { sections: [{ path: 'common', label: 'common', keys: 2, children: [] }], modes: MODES } }
      : env.respond(url)
    return { ok: status < 400, status, json: async () => body }
  }

  const context = createContext({
    figma,
    fetch,
    console,
    __html__: '<html></html>',
    // Таймеры не идут сами: тест запускает опрос живого обновления вручную
    setTimeout: (fn: () => void, delay: number) => timers.push({ fn, delay }),
    clearTimeout: (id: number) => { if (timers[id - 1]) timers[id - 1]!.cleared = true }
  })

  const ui = (message: unknown) => figma.ui.onmessage!(message)
  const last = (type: string) => posted.filter(m => m.type === type).at(-1)
  const waitFor = (type: string, count = 1) => vi.waitFor(() => {
    if (posted.filter(m => m.type === type).length < count) throw new Error(`нет сообщения ${type}`)
    return last(type)
  })
  // Следующий запланированный и не отменённый опрос живого обновления
  const pendingTimer = () => timers.filter(t => !t.cleared).at(-1)
  const collection = () => [...collections.values()].filter(c => !c.removed)[0]!
  const byName = (name: string) => [...variables.values()].find(v => v.name === name && !collections.get(v.variableCollectionId)!.removed)!
  const valueOf = (name: string, mode: string) => {
    const modeId = collection().modes.find(m => m.name === mode)!.modeId
    return byName(name).valuesByMode[modeId]
  }

  return {
    env, posted, requests, root, storage, variables, timers, ui, last, waitFor, pendingTimer, collection, byName, valueOf,
    start: () => runInContext(SOURCE, context)
  }
}

describe('плагин Figma: загрузка выборки', () => {
  it('первая загрузка: коллекция, режимы-языки, переменные деревом через /, только для текста', async () => {
    const t = setup()
    t.env.respond = () => ({ status: 200, body: texts([
      variable('common.button.continue.default', 'Continue', { ru: 'Продолжить' }),
      variable('app.cars2.paywall.title', 'Unlock all cars!')
    ]) })
    t.start()
    await t.waitFor('sections')
    expect(t.requests[0]).toEqual({ url: `${HUB}/api/figma/plugin/sections?`, auth: 'Bearer secret' })

    t.ui({ type: 'load', prefixes: ['common', 'app.cars2'], langs: ['en', 'ru', 'de'] })
    const result = await t.waitFor('result')
    expect(result.stats).toMatchObject({ collection: 'Amaya Hub', total: 2, created: 2, updated: 0, unchanged: 0, extra: [] })
    expect(result.text).toBe('Тексты обновлены: создано 2 из 2')
    expect(t.requests[1]!.url).toBe(`${HUB}/api/figma/plugin/texts?prefixes=common%2Capp.cars2&langs=en%2Cru%2Cde`)

    expect(t.collection().modes.map(m => m.name)).toEqual(['English', 'Russian', 'German'])
    const title = t.byName('app/cars2/paywall/title')
    expect(title.scopes).toEqual(['TEXT_CONTENT'])
    expect(title.getPluginData('key')).toBe('app.cars2.paywall.title')
    expect(title.description).toBe('Описание app.cars2.paywall.title')
    expect(t.valueOf('common/button/continue/default', 'Russian')).toBe('Продолжить')
    // Нет перевода — пустая строка
    expect(t.valueOf('app/cars2/paywall/title', 'German')).toBe('')
    // Служебная переменная: в каждом режиме его название
    expect(['English', 'Russian', 'German'].map(mode => t.valueOf('language', mode))).toEqual(['English', 'Russian', 'German'])

    const saved = JSON.parse(t.root.get('settings')!)
    expect(saved).toMatchObject({ prefixes: ['common', 'app.cars2'], langs: ['en', 'ru', 'de'], live: true, collectionId: t.collection().id })
    expect(t.env.relaunch).toEqual({ sync: 'Разделы: common, app.cars2', open: '' })
  })

  it('повторная загрузка меняет только изменённое, переменные те же — привязки слоёв живы', async () => {
    const t = setup()
    const first = [variable('common.a.one', 'One'), variable('common.a.two', 'Two')]
    t.env.respond = () => ({ status: 200, body: texts(first) })
    t.start()
    await t.waitFor('sections')
    t.ui({ type: 'load', prefixes: ['common'], langs: ['en', 'ru', 'de'] })
    await t.waitFor('result')
    const ids = [...t.variables.values()].map(v => v.id)
    const writes = t.byName('common/a/one').writes

    t.env.respond = () => ({ status: 200, body: texts([variable('common.a.one', 'One'), variable('common.a.two', 'Two!', { de: 'Zwei' })]) })
    t.ui({ type: 'load', prefixes: ['common'], langs: ['en', 'ru', 'de'] })
    const result = await t.waitFor('result', 2)
    expect(result.stats).toMatchObject({ created: 0, updated: 1, unchanged: 1 })
    expect([...t.variables.values()].map(v => v.id)).toEqual(ids)
    expect(t.byName('common/a/one').writes).toBe(writes)
    expect(t.valueOf('common/a/two', 'English')).toBe('Two!')
    expect(t.valueOf('common/a/two', 'German')).toBe('Zwei')
  })

  it('ключ, которого больше нет в выборке, не удаляется, а попадает в список', async () => {
    const t = setup()
    t.env.respond = () => ({ status: 200, body: texts([variable('common.a.one', 'One'), variable('common.a.two', 'Two')]) })
    t.start()
    await t.waitFor('sections')
    t.ui({ type: 'load', prefixes: ['common'], langs: ['en'] })
    await t.waitFor('result')

    t.env.respond = () => ({ status: 200, body: texts([variable('common.a.one', 'One')]) })
    t.ui({ type: 'load', prefixes: ['common'], langs: ['en'] })
    const result = await t.waitFor('result', 2)
    expect(result.stats.extra).toEqual(['common/a/two'])
    expect(t.byName('common/a/two')).toBeDefined()
  })

  it('коллекцию удалили в Figma — следующая загрузка создаёт новую, а не пишет в удалённую', async () => {
    const t = setup()
    t.env.respond = () => ({ status: 200, body: texts([variable('common.a.one', 'One')]) })
    t.start()
    await t.waitFor('sections')
    t.ui({ type: 'load', prefixes: ['common'], langs: ['en', 'ru'] })
    await t.waitFor('result')
    const deleted = t.collection()
    deleted.remove()

    t.ui({ type: 'load', prefixes: ['common'], langs: ['en', 'ru'] })
    const result = await t.waitFor('result', 2)
    const fresh = t.collection()
    expect(fresh.id).not.toBe(deleted.id)
    expect(result.stats).toMatchObject({ created: 1, total: 1 })
    expect(t.byName('common/a/one').variableCollectionId).toBe(fresh.id)
    expect(fresh.modes.map(m => m.name)).toEqual(['English', 'Russian', 'German'])
    expect(JSON.parse(t.root.get('settings')!).collectionId).toBe(fresh.id)
  })

  it('переменная, созданная раньше вручную с тем же именем, подхватывается, а не дублируется', async () => {
    const t = setup()
    t.env.respond = () => ({ status: 200, body: texts([variable('common.a.one', 'One')]) })
    t.start()
    await t.waitFor('sections')
    t.ui({ type: 'load', prefixes: ['common'], langs: ['en'] })
    await t.waitFor('result')
    t.byName('common/a/one').setPluginData('key', '')

    t.ui({ type: 'load', prefixes: ['common'], langs: ['en'] })
    const result = await t.waitFor('result', 2)
    expect(result.stats).toMatchObject({ created: 0, unchanged: 1 })
    expect(t.byName('common/a/one').getPluginData('key')).toBe('common.a.one')
  })

  it('режимов больше, чем позволяет тариф, — понятная ошибка', async () => {
    const t = setup({ maxModes: 2 })
    t.env.respond = () => ({ status: 200, body: texts([variable('common.a.one', 'One')]) })
    t.start()
    await t.waitFor('sections')
    t.ui({ type: 'load', prefixes: ['common'], langs: ['en', 'ru', 'de'] })
    const error = await t.waitFor('error')
    expect(error.message).toContain('Figma не добавила режим «German»')
    expect(error.message).toContain('ограничено тарифом')
  })
})

describe('плагин Figma: живое обновление', () => {
  it('после загрузки раз в 5 с просит изменения с прошлого ответа и применяет их', async () => {
    const t = setup()
    t.env.respond = () => ({ status: 200, body: texts([variable('common.a.one', 'One'), variable('common.a.two', 'Two')], [], '2026-10-29T10:00:00.000Z') })
    t.start()
    await t.waitFor('sections')
    t.ui({ type: 'load', prefixes: ['common'], langs: ['en', 'ru', 'de'] })
    await t.waitFor('result')
    expect(t.pendingTimer()!.delay).toBe(5000)

    t.env.respond = () => ({ status: 200, body: texts([variable('common.a.one', 'One', { ru: 'Один' })], ['common.a.two'], '2026-10-29T10:00:05.000Z') })
    t.pendingTimer()!.fn()
    const live = await t.waitFor('live')
    expect(t.requests.at(-1)!.url).toContain('since=2026-10-29T10%3A00%3A00.000Z')
    expect(live).toMatchObject({ changed: 1, extra: ['common/a/two'] })
    expect(t.valueOf('common/a/one', 'Russian')).toBe('Один')

    // Следующий опрос — с now последнего ответа
    t.env.respond = () => ({ status: 200, body: texts([], [], '2026-10-29T10:00:10.000Z') })
    t.pendingTimer()!.fn()
    await t.waitFor('live', 2)
    expect(t.requests.at(-1)!.url).toContain('since=2026-10-29T10%3A00%3A05.000Z')
  })

  it('нет связи — повтор реже; неверный токен — опрос останавливается, окно просит токен', async () => {
    const t = setup()
    t.env.respond = () => ({ status: 200, body: texts([variable('common.a.one', 'One')]) })
    t.start()
    await t.waitFor('sections')
    t.ui({ type: 'load', prefixes: ['common'], langs: ['en'] })
    await t.waitFor('result')

    t.env.respond = () => ({ status: 503, body: { error: 'NUXT_FIGMA_TOKEN не задан на сервере' } })
    t.pendingTimer()!.fn()
    const failed = await t.waitFor('live-error')
    expect(failed).toMatchObject({ message: 'NUXT_FIGMA_TOKEN не задан на сервере', retryIn: 10000 })
    expect(t.pendingTimer()!.delay).toBe(10000)

    t.env.respond = () => ({ status: 401, body: { error: 'Неверный токен Figma' } })
    const before = t.timers.length
    t.pendingTimer()!.fn()
    expect((await t.waitFor('auth')).message).toBe('Неверный токен Figma')
    expect(t.timers.length).toBe(before)
  })
})

describe('плагин Figma: «Обновить тексты» без окна', () => {
  it('настроенный файл обновляется без окна, итог — во всплывающем сообщении', async () => {
    const t = setup({ command: 'sync', settings: SETTINGS })
    t.env.respond = () => ({ status: 200, body: texts([variable('common.a.one', 'One')]) })
    t.start()
    await vi.waitFor(() => expect(t.env.closed).toBeDefined())
    expect(t.env.closed).toBe('Тексты обновлены: создано 1 из 1')
    expect(t.env.shown).toBe(false)
  })

  it('без токена или выборки открывается окно', async () => {
    const t = setup({ command: 'sync', token: '', settings: SETTINGS })
    t.start()
    const init = await t.waitFor('init')
    expect(init).toMatchObject({ hub: HUB, hasToken: false })
    expect(t.env.shown).toBe(true)
    expect(t.env.closed).toBeUndefined()
  })

  it('ошибка сервиса — сообщение с причиной', async () => {
    const t = setup({ command: 'sync', settings: SETTINGS })
    t.env.respond = () => ({ status: 400, body: { error: 'Неизвестные языки: xx' } })
    t.start()
    await vi.waitFor(() => expect(t.env.closed).toBeDefined())
    expect(t.env.closed).toBe('Тексты не обновились: Неизвестные языки: xx')
  })
})
