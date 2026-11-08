// Плагин «Amaya Hub — локализация» на поддельном figma: src/code.js выполняется как есть в node:vm.
import { readFileSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const HUB = 'https://hub.test'
const SUPABASE = { url: 'https://db.test', key: 'sb_publishable_test' }
const CODE = readFileSync(new URL('../src/code.js', import.meta.url), 'utf8').replaceAll('__HUB_ORIGIN__', HUB)
// Как архив из сервиса: с Realtime — адрес и ключ Supabase, без него — пустые строки
const source = (realtime: boolean) => CODE
  .replaceAll('__SUPABASE_URL__', realtime ? SUPABASE.url : '')
  .replaceAll('__SUPABASE_KEY__', realtime ? SUPABASE.key : '')

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

function setup({ command = 'open', token = 'secret', settings = null as object | null, maxModes = 10, realtime = false } = {}) {
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
    // Окно на экране: showUI({ visible: false }) и ui.hide() его прячут
    visible: false,
    notes: [] as { message: string, options?: { error?: boolean, button?: { text: string, action: () => void } } }[],
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
    showUI: (_html: string, options: { visible?: boolean } = {}) => {
      env.shown = true
      env.visible = options.visible !== false
    },
    ui: {
      postMessage: (message: unknown) => posted.push(message),
      onmessage: null as null | ((message: unknown) => void),
      hide: () => { env.visible = false },
      show: () => { env.visible = true }
    },
    on: () => {},
    notify: (message: string, options?: (typeof env.notes)[number]['options']) => { env.notes.push({ message, options }) },
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

  // Запросы текстов (без разделов)
  const textRequests = () => requests.filter(r => new URL(r.url).pathname.endsWith('/texts'))

  return {
    env, posted, requests, root, storage, variables, timers, ui, last, waitFor, pendingTimer, collection, byName, valueOf, textRequests,
    start: () => runInContext(source(realtime), context)
  }
}

// Загрузка выборки common в открытом окне: дальше живое обновление
async function loaded(options: Parameters<typeof setup>[0] = {}) {
  const t = setup(options)
  t.env.respond = () => ({ status: 200, body: texts([variable('common.a.one', 'One')], [], '2026-10-29T10:00:00.000Z') })
  t.start()
  await t.waitFor('sections')
  t.ui({ type: 'load', prefixes: ['common'], langs: ['en', 'ru'] })
  await t.waitFor('result')
  return t
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
    expect(t.env.relaunch).toEqual({ sync: 'Разделы: common, app.cars2', watch: '', open: '' })
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
    // Архив без адреса Supabase — подписку окну не заказывают
    expect(t.posted.some(m => m.type === 'realtime-start')).toBe(false)
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

describe('плагин Figma: мгновенное обновление через Realtime', () => {
  it('окно получает адрес Supabase; до подключения — опрос раз в 5 с, после — запрос сразу и страховка раз в минуту', async () => {
    const t = await loaded({ realtime: true })
    expect(t.last('realtime-start')).toEqual({ type: 'realtime-start', url: SUPABASE.url, key: SUPABASE.key })
    expect(t.pendingTimer()!.delay).toBe(5000)

    t.ui({ type: 'realtime', state: 'on' })
    // Правки, сделанные пока шло подключение, — одним запросом сразу
    expect(t.pendingTimer()!.delay).toBe(0)
    t.pendingTimer()!.fn()
    await t.waitFor('live')
    expect(t.pendingTimer()!.delay).toBe(60000)

    // Связь пропала — снова опрос
    t.ui({ type: 'realtime', state: 'offline' })
    expect(t.pendingTimer()!.delay).toBe(5000)

    // Новая выборка подписку не перезапускает: она одна на все ключи
    t.ui({ type: 'load', prefixes: ['common'], langs: ['en'] })
    await t.waitFor('result', 2)
    expect(t.posted.filter(m => m.type === 'realtime-start')).toHaveLength(1)
  })

  it('событие по ключу выборки — запрос через 300 мс; чужой раздел — ничего; пачка во время запроса — ещё ровно один', async () => {
    const t = await loaded({ realtime: true })
    t.ui({ type: 'realtime', state: 'on' })
    t.pendingTimer()!.fn()
    await t.waitFor('live')
    const before = t.textRequests().length

    // commonx — не раздел common
    t.ui({ type: 'changed', keys: ['app.farm.title', 'commonx.a'] })
    expect(t.pendingTimer()!.delay).toBe(60000)

    t.env.respond = () => ({ status: 200, body: texts([variable('common.a.one', 'One!')], [], '2026-10-29T10:01:00.000Z') })
    t.ui({ type: 'changed', keys: ['common.a.one'] })
    const nudge = t.pendingTimer()!
    expect(nudge.delay).toBe(300)
    // Следующие события запланированный запрос не откладывают
    t.ui({ type: 'changed', keys: ['common.a.two'] })
    expect(t.pendingTimer()).toBe(nudge)

    nudge.fn()
    // Запрос в пути — пришла ещё пачка: после него — ещё один, а не по запросу на событие
    t.ui({ type: 'changed', keys: ['common.a.one'] })
    t.ui({ type: 'changed', keys: ['common.a.one'] })
    const live = await t.waitFor('live', 2)
    expect(live.changed).toBe(1)
    expect(t.valueOf('common/a/one', 'English')).toBe('One!')
    expect(t.pendingTimer()!.delay).toBe(300)
    t.pendingTimer()!.fn()
    await t.waitFor('live', 3)
    expect(t.pendingTimer()!.delay).toBe(60000)
    expect(t.textRequests().length).toBe(before + 2)
  })

  it('галка «Живое обновление» снята — подписка и опрос остановлены, запоздалые сообщения окна их не оживляют', async () => {
    const t = await loaded({ realtime: true })
    t.ui({ type: 'live', on: false })
    expect(t.last('realtime-stop')).toBeDefined()
    expect(t.pendingTimer()).toBeUndefined()

    t.ui({ type: 'realtime', state: 'on' })
    t.ui({ type: 'changed', keys: ['common.a.one'] })
    expect(t.pendingTimer()).toBeUndefined()

    t.ui({ type: 'live', on: true })
    expect(t.posted.filter(m => m.type === 'realtime-start')).toHaveLength(2)
    expect(t.pendingTimer()!.delay).toBe(0)
  })

  it('неверный токен — подписка остановлена, события больше не запускают запросы', async () => {
    const t = await loaded({ realtime: true })
    t.ui({ type: 'realtime', state: 'on' })
    t.env.respond = () => ({ status: 401, body: { error: 'Неверный токен Figma' } })
    t.pendingTimer()!.fn()
    expect((await t.waitFor('auth')).message).toBe('Неверный токен Figma')
    expect(t.last('realtime-stop')).toBeDefined()

    const before = t.timers.length
    t.ui({ type: 'changed', keys: ['common.a.one'] })
    expect(t.timers.length).toBe(before)
  })
})

describe('плагин Figma: фоновый режим', () => {
  it('«Следить в фоне» из окна: окно скрыто, об изменениях — уведомление с кнопкой «Окно»', async () => {
    const t = await loaded({ realtime: true })
    expect(t.env.visible).toBe(true)
    t.ui({ type: 'background' })
    expect(t.env.visible).toBe(false)
    expect(t.env.notes.at(-1)!.message).toContain('в фоне')

    t.ui({ type: 'realtime', state: 'on' })
    t.env.respond = () => ({ status: 200, body: texts([variable('common.a.one', 'One!'), variable('common.a.two', 'Two')], [], '2026-10-29T10:01:00.000Z') })
    t.pendingTimer()!.fn()
    await t.waitFor('live')
    const note = t.env.notes.at(-1)!
    expect(note.message).toBe('Amaya Hub: обновлено 2 текста')
    // Без изменений уведомлений нет
    const count = t.env.notes.length
    t.pendingTimer()!.fn()
    await t.waitFor('live', 2)
    expect(t.env.notes).toHaveLength(count)

    note.options!.button!.action()
    expect(t.env.visible).toBe(true)
  })

  it('в фоне неверный токен — окно снова на экране и просит токен', async () => {
    const t = await loaded({ realtime: true })
    t.ui({ type: 'background' })
    t.ui({ type: 'realtime', state: 'on' })
    t.env.respond = () => ({ status: 401, body: { error: 'Неверный токен Figma' } })
    t.pendingTimer()!.fn()
    await t.waitFor('auth')
    expect(t.env.visible).toBe(true)
  })

  it('в фоне нет связи — одно уведомление на весь обрыв, окно остаётся скрытым', async () => {
    const t = await loaded({ realtime: true })
    t.ui({ type: 'background' })
    const notes = t.env.notes.length
    t.env.respond = () => ({ status: 503, body: { error: 'Сервис недоступен' } })
    t.pendingTimer()!.fn()
    await t.waitFor('live-error')
    t.pendingTimer()!.fn()
    await t.waitFor('live-error', 2)
    expect(t.env.notes.slice(notes)).toHaveLength(1)
    expect(t.env.notes.at(-1)).toMatchObject({ message: 'Amaya Hub: Сервис недоступен. Повторяю', options: { error: true } })
    expect(t.env.visible).toBe(false)
  })

  it('команда «Следить в фоне»: окно не показывается, итог — в уведомлении, подписка запущена', async () => {
    const t = setup({ command: 'watch', settings: SETTINGS, realtime: true })
    t.env.respond = () => ({ status: 200, body: texts([variable('common.a.one', 'One')]) })
    t.start()
    await vi.waitFor(() => expect(t.env.notes).toHaveLength(1))
    expect(t.env.notes[0]!.message).toBe('Тексты обновлены: создано 1 из 1 · слежу в фоне до закрытия файла')
    expect(t.env.shown).toBe(true)
    expect(t.env.visible).toBe(false)
    expect(t.env.closed).toBeUndefined()
    expect(t.last('init')).toMatchObject({ hasToken: true })
    expect(t.last('realtime-start')).toBeDefined()
    expect(t.pendingTimer()!.delay).toBe(5000)
  })

  it('команда «Следить в фоне» без выборки — обычное окно; со снятой галкой — живое обновление включается', async () => {
    const fresh = setup({ command: 'watch', realtime: true })
    fresh.start()
    await fresh.waitFor('init')
    expect(fresh.env.visible).toBe(true)

    const off = setup({ command: 'watch', settings: { ...SETTINGS, live: false }, realtime: true })
    off.env.respond = () => ({ status: 200, body: texts([variable('common.a.one', 'One')]) })
    off.start()
    await vi.waitFor(() => expect(off.env.notes).toHaveLength(1))
    expect(JSON.parse(off.root.get('settings')!).live).toBe(true)
    expect(off.env.visible).toBe(false)
  })

  it('загрузка в фоне не удалась — окно с причиной', async () => {
    const t = setup({ command: 'watch', settings: SETTINGS, realtime: true })
    t.env.respond = () => ({ status: 400, body: { error: 'Неизвестные языки: xx' } })
    t.start()
    expect((await t.waitFor('error')).message).toBe('Неизвестные языки: xx')
    expect(t.env.visible).toBe(true)
  })
})
