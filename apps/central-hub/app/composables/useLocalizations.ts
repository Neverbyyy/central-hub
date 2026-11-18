import { escapeLike } from '@amaya/l10n-core'
import type { RegistryCode } from '~/utils/keySuggestions'

export interface Language {
  code: string
  name: string
  dir: 'ltr' | 'rtl'
  is_source: boolean
}

export type TranslationStatus = 'draft' | 'ai' | 'approved'

export interface Localization {
  technical_key: string
  translations: Record<string, string>
  status: Record<string, TranslationStatus>
  // Языки с переводом, устаревшим после правки английского (считает база)
  stale_langs: string[]
  deprecated_at: string | null
  created_at: string
  updated_at: string
  // Теги ключа — для меню правого клика и иконки с подсказкой у ключа
  tags: string[]
  // Языки, которые сейчас сохраняются (оптимистичное обновление ещё не подтверждено)
  _saving?: Record<string, boolean>
}

// Свойства ключа, сохранённые формой в панели (KeyMetaForm), — панель показывает их сразу, до перечитывания
export interface SavedKeyMeta {
  description: string | null
  tags: string[]
  maxLength: number | null
  figmaUrl: string | null
}

// Тег из меню уже виден в строках; сервер принял (confirm, updatedAt — время записи из ответа) или отказал (revert)
export interface TagChange {
  confirm: (updatedAt: string | null) => void
  revert: () => void
}

// Куда сдвинуть курсор после сохранения ячейки; 'blur' — фокус ушёл наружу
export type CommitMove = 'down' | 'right' | 'left' | 'stay' | 'blur'

// pending — не утверждённые: черновики и тексты от ИИ вместе, то, что не уходит в выгрузку в код
export type StatusFilter = '' | TranslationStatus | 'pending'

/** Есть что утверждать на языке: текст есть, а статус не «утверждён» или перевод устарел — то же правило у сервера. */
export const canApproveLang = (row: Pick<Localization, 'translations' | 'status' | 'stale_langs'>, lang: string) =>
  !!row.translations?.[lang] && (row.status?.[lang] !== 'approved' || !!row.stale_langs?.includes(lang))

const PAGE_SIZE = 100
// Устаревшие переводы база считает сама (stale_langs) — версии исходного текста интерфейсу не нужны
const SELECT = 'technical_key, translations, status, stale_langs, deprecated_at, created_at, updated_at, tags'
const WEEK = 7 * 24 * 60 * 60 * 1000

const asString = (value: unknown) => (typeof value === 'string' ? value : '')

// Фильтры выборки и как они лежат в адресе. Новый фильтр — строка здесь, условие в applyFilters (запрос к базе)
// и в matchesView (строки коллег из Realtime)
const flag = { read: (value: string) => value === '1', write: (value: boolean) => (value ? '1' : '') }
const text = { read: (value: string) => value, write: (value: string) => value }
const FILTERS = {
  status: {
    read: (value: string) => (['ai', 'draft', 'approved', 'pending'].includes(value) ? value : '') as StatusFilter,
    write: (value: StatusFilter) => value
  },
  // Только с переводами, устаревшими после правки английского
  stale: flag,
  // Код языка: нет перевода на него
  missing: { read: (value: string) => (/^[a-z]{2,3}(-[A-Za-z0-9]{2,4})?$/.test(value) ? value : ''), write: (value: string) => value },
  // Изменённые за неделю
  recent: flag,
  // Раздел из дерева, например app.cars2.
  prefix: text,
  // Вместо действующих ключей — помеченные устаревшими (их нет в выгрузках)
  deprecated: flag
}
type FilterName = keyof typeof FILTERS
type Filters = { [Name in FilterName]: ReturnType<(typeof FILTERS)[Name]['read']> }
const FILTER_NAMES = Object.keys(FILTERS) as FilterName[]
const emptyFilters = () => Object.fromEntries(FILTER_NAMES.map(name => [name, FILTERS[name].read('')])) as Filters

// Параметры адреса, которые описывают выборку; остальные (key, new) не трогаем
const FILTER_PARAMS = ['q', 'tags', ...FILTER_NAMES]

interface Edit {
  key: string
  lang: string
  prev: string
  next: string
}

export interface Conflict {
  current: string | null
  actor?: string
}

/** Ответ 409 от PUT /api/translations: ячейку изменили, пока человек её правил (грид и очередь перевода). */
export const conflictOf = (error: unknown): Conflict | null => {
  const { statusCode, data } = (error ?? {}) as { statusCode?: number, data?: { data?: Conflict } }
  return statusCode === 409 && data?.data && 'current' in data.data ? data.data : null
}

export function useLocalizations() {
  // Браузер только читает — публичному ключу запись закрыта; изменения идут через /api
  const supabase = useSupabaseClient()
  const toast = useToast()
  const notifyError = useNotifyError()
  const route = useRoute()
  const router = useRouter()

  // Языки — общие с очередью и палитрой Ctrl+K (useLanguages)
  const { languages, error: languagesError, load: loadLanguages } = useLanguages()
  const languageCodes = computed(() => languages.value.map(l => l.code))
  // Коды игр, сайтов, брендов, тестов — по ним проверяется имя нового ключа
  const registry = ref<RegistryCode[]>([])

  const rows = ref<Localization[]>([])
  const total = ref<number | null>(null)
  const loading = ref(false)
  const initialLoading = ref(true)
  const hasMore = ref(true)
  // Таблица (или следующая страница) не загрузилась — текст для грида рядом с «Повторить»
  const loadError = ref('')

  // --- Свежие данные после обрыва связи ---
  // Пока нет связи (сон ноутбука, смена сети), события Realtime теряются. Потом грид догоняет (catchUp): читает строки,
  // изменённые с последней известной ему правки, и проводит их тем же путём, что и события. Отметка — время базы
  // (updated_at), а не часов ноутбука: те могут врать на минуты
  let syncedAt = 0
  const noteSynced = (at: number) => {
    if (at > syncedAt) syncedAt = at
  }
  // Начальная отметка — последняя правка в базе. Нужна один раз: дальше её двигают события и догонялка
  const noteLatestChange = async () => {
    const { data } = await supabase.from('localizations').select('updated_at').order('updated_at', { ascending: false }).limit(1)
    noteSynced(dbTime(data?.[0]?.updated_at))
  }
  // Связи Realtime нет дольше OFFLINE_DELAY — метка в шапке (короткие обрывы её не мигают)
  const offline = ref(false)
  const OFFLINE_DELAY = 3000
  let offlineTimer: ReturnType<typeof setTimeout> | undefined
  // Пока не было связи, изменилось больше строк, чем догонялка читает за раз (массовый импорт): таблицу лучше
  // перечитать целиком — но по кнопке, а не сами: прокрутка и курсор при этом сбрасываются
  const tooManyChanges = ref(false)

  // --- Выборка: поиск, теги и фильтры; всё лежит в адресе, ссылкой можно поделиться ---
  const q = ref('')
  const selectedTags = ref<string[]>([])
  const filters = reactive(emptyFilters())

  const readQuery = () => {
    const query = route.query
    q.value = asString(query.q)
    selectedTags.value = asString(query.tags).split(',').filter(Boolean)
    for (const name of FILTER_NAMES) (filters as Record<FilterName, unknown>)[name] = FILTERS[name].read(asString(query[name]))
  }

  const buildQuery = () => {
    const next: Record<string, string> = {}
    for (const [name, value] of Object.entries(route.query)) {
      if (!FILTER_PARAMS.includes(name) && typeof value === 'string') next[name] = value
    }
    if (q.value.trim()) next.q = q.value.trim()
    if (selectedTags.value.length) next.tags = selectedTags.value.join(',')
    for (const name of FILTER_NAMES) {
      const value = (FILTERS[name].write as (value: unknown) => string)(filters[name])
      if (value) next[name] = value
    }
    return next
  }

  const sameQuery = (a: Record<string, unknown>, b: Record<string, unknown>) =>
    JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort())

  const syncUrl = () => {
    const next = buildQuery()
    if (!sameQuery(route.query, next)) router.replace({ query: next })
  }

  const hasFilters = computed(() => !!(q.value.trim() || selectedTags.value.length || FILTER_NAMES.some(name => filters[name])))

  const resetFilters = () => {
    q.value = ''
    selectedTags.value = []
    Object.assign(filters, emptyFilters())
  }

  // Каждый новый поиск/фильтр увеличивает поколение, ответы старых запросов выбрасываются
  let generation = 0

  interface Filterable<T> {
    is: (column: string, value: null) => T
    not: (column: string, operator: string, value: null) => T
    ilike: (column: string, pattern: string) => T
    like: (column: string, pattern: string) => T
    contains: (column: string, value: string[]) => T
    overlaps: (column: string, value: string[]) => T
    neq: (column: string, value: string) => T
    gte: (column: string, value: string) => T
  }

  const applyFilters = <T extends Filterable<T>>(query: T): T => {
    query = filters.deprecated ? query.not('deprecated_at', 'is', null) : query.is('deprecated_at', null)
    const term = q.value.trim().toLowerCase()
    if (term) {
      // search_text — ключ и переводы на всех языках, с trigram-индексом
      query = query.ilike('search_text', `%${escapeLike(term)}%`)
    }
    // Несколько тегов — ключи с любым из них (overlaps, &&), а не только со всеми сразу
    if (selectedTags.value.length) query = query.overlaps('tags', selectedTags.value)
    if (filters.status === 'pending') query = query.overlaps('status_values', ['draft', 'ai'])
    else if (filters.status) query = query.contains('status_values', [filters.status])
    if (filters.stale) query = query.neq('stale_langs', '{}')
    if (filters.missing) query = query.is(`translations->>${filters.missing}`, null)
    if (filters.recent) query = query.gte('updated_at', new Date(Date.now() - WEEK).toISOString())
    if (filters.prefix) query = query.like('technical_key', `${escapeLike(filters.prefix)}%`)
    return query
  }

  watch(languagesError, (error) => {
    if (error) toast.add({ title: hubT('grid.languagesFailed'), description: error.message, color: 'error' })
  })

  const loadRegistry = async () => {
    const { data, error } = await supabase.from('registry').select('kind, code, title').order('kind').order('code')
    if (!error) registry.value = (data ?? []) as RegistryCode[]
  }

  const load = async (reset = false) => {
    if (!reset && (loading.value || !hasMore.value)) return

    const gen = reset ? ++generation : generation
    const from = reset ? 0 : rows.value.length
    loading.value = true
    loadError.value = ''
    // С какой правки догонять после обрыва связи. Параллельно и без ожидания: строки показываем, не дожидаясь его
    if (!syncedAt) noteLatestChange()

    const { data, error, count } = await applyFilters(
      supabase
        .from('localizations')
        .select(SELECT, from === 0 ? { count: 'exact' } : undefined)
        .order('technical_key', { ascending: true })
        .range(from, from + PAGE_SIZE - 1)
    )

    if (gen !== generation) return

    if (error) {
      // Не «Ничего не найдено»: грид показывает, что таблица не загрузилась, и даёт повторить (retryLoad)
      loadError.value = error.message
      if (reset) rows.value = []
      hasMore.value = false
    } else {
      const page = (data ?? []) as Localization[]
      // Запрос мог уйти раньше, чем дошли последние галочки тегов
      for (const row of page) row.tags = serverTags(row.technical_key, row.tags ?? [], row.updated_at)
      // Коллега добавил ключ в уже загруженную часть, пока шёл запрос: страница сдвинулась на строку, и её первая
      // строка у нас уже есть — второй раз не добавляем
      const present = new Set(reset ? [] : rows.value.map(r => r.technical_key))
      rows.value = reset ? page : rows.value.concat(page.filter(r => !present.has(r.technical_key)))
      hasMore.value = page.length === PAGE_SIZE
      if (count !== null && count !== undefined) total.value = count
    }

    loading.value = false
    initialLoading.value = false
  }

  const reload = () => {
    tooManyChanges.value = false
    return load(true)
  }

  // «Повторить» в гриде: не загрузилась первая страница — заново, сорвалась дозагрузка — следующая страница
  const retryLoad = () => {
    if (!rows.value.length) return reload()
    hasMore.value = true
    return load()
  }

  // Ключ выборки без поиска: меняется — адрес и данные обновляются сразу, поиск — с паузой
  const filtersKey = computed(() => JSON.stringify([selectedTags.value, filters]))

  readQuery()
  watch(filtersKey, () => {
    syncUrl()
    reload()
  })
  watchDebounced(q, () => {
    syncUrl()
    reload()
  }, { debounce: 300 })
  // Адрес поменяли снаружи — ⌘K, «назад», ссылка от коллеги. Смотрим только на параметры выборки:
  // смена ?key= не должна перечитывать поиск, который ещё не успел попасть в адрес (он с паузой)
  const filterPart = (query: Record<string, unknown>) => JSON.stringify(FILTER_PARAMS.map(name => query[name] ?? null))
  watch(() => filterPart(route.query), (part) => {
    if (part !== filterPart(buildQuery())) readQuery()
  })

  // --- Сохранение одной ячейки ---
  const undoStack: Edit[] = []
  const redoStack: Edit[] = []

  // Строка по ключу — без перебора: findRow зовут на каждое событие Realtime и для каждого выделенного ключа в меню
  // тегов (после «выделить всё» перебор был бы тысячи × тысячи). Список строк меняется только целиком (загрузка,
  // пачка Realtime), тогда и пересобирается индекс; правки внутри строк его не трогают
  const rowIndex = computed(() => new Map(rows.value.map(row => [row.technical_key, row])))
  const findRow = (key: string) => rowIndex.value.get(key)

  // --- Теги из меню правого клика: галочка видна сразу и не мигает ---
  // Галочки ставят быстрее, чем доходят события Realtime: событие о первой несёт теги без второй, которая ещё в пути, —
  // и вторая пропадала бы на мгновение. Поэтому правки из меню лежат здесь и накладываются поверх тегов из событий и
  // загрузки, пока не придёт событие, которое уже знает о правке: его updated_at не раньше времени записи из ответа
  // сервера (after). Совпадение тегов не годится: старое событие могло совпасть случайно. Если события не будет (у
  // ключа ничего не поменялось) или время записи неизвестно — правка уходит через TAG_OP_TTL после ответа
  interface TagOp { on: boolean, seq: number, after?: number }
  const tagOps = new Map<string, Map<string, TagOp>>() // ключ → тег → последняя правка
  let tagSeq = 0
  const TAG_OP_TTL = 5000

  const dropTagOp = (key: string, tag: string, seq: number) => {
    const ops = tagOps.get(key)
    if (ops?.get(tag)?.seq !== seq) return
    ops.delete(tag)
    if (!ops.size) tagOps.delete(key)
  }

  // Теги ключа с сервера (событие или загрузка) → что показать: правки, о которых эти данные уже знают, уходят,
  // остальные — поверх
  const serverTags = (key: string, tags: string[], updatedAt: string) => {
    const ops = tagOps.get(key)
    if (!ops) return tags
    const at = dbTime(updatedAt)
    for (const [tag, op] of ops) {
      if (op.after !== undefined && at >= op.after) dropTagOp(key, tag, op.seq)
    }
    return overlayTags(tags, ops)
  }

  // Тег поставили или сняли из меню — строки меняются сразу, не дожидаясь события от базы.
  // confirm — сервер принял (updatedAt — время записи из ответа); revert — отказал: тег у этих ключей как был (если его
  // не успели переключить ещё раз)
  const applyTag = (keys: string[], tag: string, on: boolean): TagChange => {
    const seq = ++tagSeq
    const touched = keys.flatMap((key) => {
      const row = findRow(key)
      if (!row || row.deprecated_at) return []
      const had = row.tags?.includes(tag) ?? false
      let ops = tagOps.get(key)
      if (!ops) tagOps.set(key, (ops = new Map()))
      ops.set(tag, { on, seq })
      row.tags = withTag(row.tags ?? [], tag, on)
      return [{ key, had }]
    })
    return {
      confirm: (updatedAt) => {
        // Время неизвестно — события правку не снимают, только TAG_OP_TTL
        const after = dbTime(updatedAt)
        for (const { key } of touched) {
          const op = tagOps.get(key)?.get(tag)
          if (op?.seq === seq) op.after = Number.isNaN(after) ? Number.POSITIVE_INFINITY : after
        }
        setTimeout(() => {
          for (const { key } of touched) dropTagOp(key, tag, seq)
        }, TAG_OP_TTL)
      },
      revert: () => {
        for (const { key, had } of touched) {
          if (tagOps.get(key)?.get(tag)?.seq !== seq) continue
          dropTagOp(key, tag, seq)
          const row = findRow(key)
          if (row) row.tags = withTag(row.tags ?? [], tag, had)
        }
      }
    }
  }

  const setCell = (row: Localization, lang: string, value: string | null) => {
    const { [lang]: _, ...rest } = row.translations ?? {}
    row.translations = value ? { ...rest, [lang]: value } : rest
  }

  /**
   * expected — что было в ячейке, когда человек начал правку. Если её успели изменить,
   * сервер отвечает 409: показываем текущий текст и даём выбрать, чей вариант оставить.
   */
  const writeCell = async (key: string, lang: string, value: string, expected: string): Promise<boolean> => {
    const row = findRow(key)
    if (!row) return false

    const prev = row.translations?.[lang] ?? ''
    setCell(row, lang, value)
    row._saving = { ...row._saving, [lang]: true }

    try {
      // Сервер меняет только этот язык — чужие правки соседних языков не затираются
      const { updated_at } = await $fetch('/api/translations', { method: 'PUT', body: { key, lang, value, expected } })
      const target = findRow(key) ?? row
      target._saving = { ...target._saving, [lang]: false }
      target.updated_at = updated_at
      return true
    } catch (error) {
      const target = findRow(key) ?? row
      target._saving = { ...target._saving, [lang]: false }

      const conflict = conflictOf(error)
      if (conflict) {
        setCell(target, lang, conflict.current)
        toast.add({
          title: conflict.actor ? hubT('grid.conflictBy', { actor: conflict.actor }) : hubT('grid.conflict'),
          description: hubT('grid.conflictText', { lang: lang.toUpperCase(), current: conflict.current ?? '—', mine: value || '—' }),
          color: 'warning',
          duration: 15000,
          actions: [{
            label: hubT('grid.keepMine'),
            color: 'neutral',
            variant: 'outline',
            onClick: () => {
              setTranslation(key, lang, value, conflict.current ?? '')
            }
          }]
        })
        return false
      }

      // Откатываем, только если за это время ячейку не поменяли ещё раз
      if ((target.translations?.[lang] ?? '') === value) setCell(target, lang, prev)
      await notifyError(hubT('grid.notSaved'), error)
      return false
    }
  }

  const setTranslation = async (key: string, lang: string, value: string, expected?: string) => {
    const row = findRow(key)
    if (!row) return
    const before = expected ?? row.translations?.[lang] ?? ''
    if (before === value) return

    if (await writeCell(key, lang, value, before)) {
      undoStack.push({ key, lang, prev: before, next: value })
      if (undoStack.length > 100) undoStack.shift()
      redoStack.length = 0
    }
  }

  // Отмена ждёт в ячейке именно наш текст: если коллега успел его поменять — конфликт, а не перезапись
  const undo = async () => {
    const edit = undoStack.pop()
    if (!edit) return null
    if (await writeCell(edit.key, edit.lang, edit.prev, edit.next)) redoStack.push(edit)
    return edit
  }

  const redo = async () => {
    const edit = redoStack.pop()
    if (!edit) return null
    if (await writeCell(edit.key, edit.lang, edit.next, edit.prev)) undoStack.push(edit)
    return edit
  }

  // --- Устаревшие: строки не удаляются, а пропадают из грида и выгрузок ---
  const restoreKeys = async (keys: string[]) => {
    try {
      const { count } = await $fetch('/api/keys/restore', { method: 'POST', body: { keys } })
      toast.add({ title: hubT('grid.restored', { keys: hubT('common.keys', { count }) }), color: 'success' })
      await reload()
    } catch (error) {
      await notifyError(hubT('grid.restoreFailed'), error)
    }
  }

  const deprecateKeys = async (keys: string[]) => {
    let count: number
    try {
      count = (await $fetch('/api/keys/deprecate', { method: 'POST', body: { keys } })).count
    } catch (error) {
      await notifyError(hubT('grid.deprecateFailed'), error)
      return false
    }

    const removed = new Set(keys)
    rows.value = rows.value.filter(r => !removed.has(r.technical_key))
    if (total.value !== null) total.value -= count
    toast.add({
      title: hubT('grid.deprecated', { count }),
      description: hubT('grid.deprecatedText'),
      color: 'success',
      actions: [{ label: hubT('selection.restore'), color: 'neutral', variant: 'outline', onClick: () => restoreKeys(keys) }]
    })
    return true
  }

  // --- Все строки под текущими фильтрами (для экспорта) ---
  const fetchAll = async () => {
    const all: Pick<Localization, 'technical_key' | 'translations'>[] = []
    const step = 1000
    for (let from = 0; ; from += step) {
      const { data, error } = await applyFilters(
        supabase
          .from('localizations')
          .select('technical_key, translations')
          // Стабильный порядок обязателен, иначе страницы могут пересекаться
          .order('technical_key', { ascending: true })
          .range(from, from + step - 1)
      )
      if (error) throw error
      // translations в базе — JSON: в интерфейсе это тексты по языкам
      all.push(...((data ?? []) as Pick<Localization, 'technical_key' | 'translations'>[]))
      if (!data || data.length < step) break
    }
    return all
  }

  // --- Ключи коллег: новые, помеченные устаревшими и вернувшиеся появляются и пропадают сразу ---
  // Порядок как у базы (order by technical_key): её правила сравнения совпадают с en, а не с кодами символов —
  // проверено на всех ключах
  const collator = new Intl.Collator('en')

  type Incoming = Localization

  // Подходит ли строка под текущую выборку — те же условия, что applyFilters в запросе к базе
  const matchesView = (row: Incoming) => {
    if (!!row.deprecated_at !== filters.deprecated) return false
    const term = q.value.trim().toLowerCase()
    // search_text в базе — ключ и все переводы через пробел, в нижнем регистре
    if (term && !`${row.technical_key} ${Object.values(row.translations ?? {}).join(' ')}`.toLowerCase().includes(term)) return false
    if (selectedTags.value.length && !selectedTags.value.some(tag => row.tags?.includes(tag))) return false
    const statuses = Object.values(row.status ?? {})
    if (filters.status === 'pending' && !statuses.some(s => s === 'draft' || s === 'ai')) return false
    if (filters.status && filters.status !== 'pending' && !statuses.includes(filters.status)) return false
    if (filters.stale && !row.stale_langs?.length) return false
    if (filters.missing && row.translations?.[filters.missing] != null) return false
    if (filters.recent && Date.parse(row.updated_at) < Date.now() - WEEK) return false
    if (filters.prefix && !row.technical_key.startsWith(filters.prefix)) return false
    return true
  }

  // Растёт, когда ключи появились или пропали: страница по нему обновляет дерево разделов и теги
  const keysVersion = ref(0)
  const bumpKeys = useDebounceFn(() => keysVersion.value++, 1000)

  // Импорт, «Утвердить всё», пометка многих ключей — сотни событий подряд: список перестраивается раз на пачку
  const pending = new Map<string, { row: Incoming, inserted: boolean }>()
  let flushTimer: ReturnType<typeof setTimeout> | undefined

  const flushPending = () => {
    flushTimer = undefined
    let list = rows.value
    let changed = false
    let structure = false
    for (const { row, inserted } of pending.values()) {
      // Есть ли строка в таблице — по индексу, без прохода по списку: в пачке (догонялка — до тысячи строк) почти все
      // строки не из таблицы. Ключ в пачке один раз, поэтому прежние шаги цикла ответ не меняют
      if (findRow(row.technical_key)) {
        // Ключ пометили устаревшим или вернули — из этой выборки (действующие / устаревшие) он уходит.
        // Остальные правки уже на месте; строка, переставшая подходить под фильтр после правки, остаётся до
        // перезагрузки — иначе она пропадала бы из-под курсора у того, кто её правит
        if (!!row.deprecated_at === filters.deprecated) continue
        list = list.filter(r => r.technical_key !== row.technical_key)
        if (total.value !== null) total.value -= 1
        changed = structure = true
        continue
      }
      if (inserted) structure = true
      if (!matchesView(row)) continue
      // Строка дальше загруженной части придёт со следующей страницей. Новый ключ там всё равно прибавляет к счётчику,
      // а изменённый — нет: он и раньше мог подходить под выборку, просто не был загружен
      const last = list[list.length - 1]
      if (hasMore.value && last && collator.compare(row.technical_key, last.technical_key) > 0) {
        if (inserted && total.value !== null) total.value += 1
        continue
      }
      const at = list.findIndex(r => collator.compare(r.technical_key, row.technical_key) > 0)
      list = [...list.slice(0, at < 0 ? list.length : at), row, ...list.slice(at < 0 ? list.length : at)]
      if (total.value !== null) total.value += 1
      changed = structure = true
    }
    pending.clear()
    if (changed) rows.value = list
    if (structure) bumpKeys()
  }

  const queueRow = (row: Incoming, inserted: boolean) => {
    const previous = pending.get(row.technical_key)
    pending.set(row.technical_key, { row, inserted: inserted || !!previous?.inserted })
    flushTimer ??= setTimeout(flushPending, 100)
  }

  // --- Live-обновления от коллег ---

  // Правка из базы — событие Realtime или строка догонялки. inserted — ключ новый (прибавляет к счётчику)
  const applyIncoming = (incoming: Incoming, inserted: boolean) => {
    const at = dbTime(incoming.updated_at)
    noteSynced(at)
    const row = findRow(incoming.technical_key)
    // Строки нет в таблице (новый ключ, ключ вернули, пометили устаревшим при просмотре устаревших, он стал
    // подходить под фильтр) или она уходит из выборки — решает пачка изменений
    if (!row || !!incoming.deprecated_at !== filters.deprecated) {
      queueRow(incoming, inserted)
      return
    }
    // Догонялка могла принести то, что старее строки
    if (at < dbTime(row.updated_at)) return

    // Языки, которые мы сами сейчас сохраняем, не трогаем — придёт наше же событие
    const merged = { ...incoming.translations }
    for (const lang of Object.keys(row._saving ?? {})) {
      if (row._saving?.[lang]) merged[lang] = row.translations?.[lang] ?? ''
    }
    row.translations = merged
    row.status = incoming.status
    row.stale_langs = incoming.stale_langs
    row.tags = serverTags(incoming.technical_key, incoming.tags ?? [], incoming.updated_at)
    row.updated_at = incoming.updated_at
  }

  // Догнать правки, пропущенные без связи: строки, изменённые с последней известной правки (с запасом в минуту —
  // события приходят не строго по порядку), тем же путём, что и события: прокрутка, курсор и открытая правка остаются
  const CATCH_UP_MARGIN = 60_000
  const CATCH_UP_LIMIT = 1000
  let catchingUp = false
  const catchUp = async () => {
    if (catchingUp || !syncedAt) return
    catchingUp = true
    try {
      // Новые — ключи, созданные позже последней известной правки; созданные в запасную минуту грид уже видел
      const seen = syncedAt
      const since = seen - CATCH_UP_MARGIN
      const { data, error } = await supabase
        .from('localizations')
        .select(SELECT)
        .gte('updated_at', new Date(since).toISOString())
        .order('updated_at', { ascending: true })
        .limit(CATCH_UP_LIMIT)
      // Не вышло — догонит следующий повод (переподключение, возврат во вкладку)
      if (error) return
      if (data.length >= CATCH_UP_LIMIT) {
        tooManyChanges.value = true
        return
      }
      for (const row of data as Incoming[]) {
        // Запас в минуту приносит и то, что грид уже видел: такие строки не трогаем, чтобы не перерисовывать
        const known = findRow(row.technical_key)
        if (known && dbTime(known.updated_at) >= dbTime(row.updated_at)) continue
        applyIncoming(row, dbTime(row.created_at) > seen)
      }
    } finally {
      catchingUp = false
    }
  }

  // Канал — на каждую попытку подключения: после обрыва subscribeWithRetry подключается снова
  const buildChannel = () => supabase
    .channel('localizations-grid')
    // Новый ключ — из сервиса, нейросетью, CLI или импортом: появляется, если подходит под выборку
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'localizations' }, (payload) => {
      applyIncoming(payload.new as Incoming, true)
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'localizations' }, (payload) => {
      applyIncoming(payload.new as Incoming, false)
    })
  let stopChannel: (() => void) | undefined

  // Вкладка вернулась из фона, где была дольше минуты (сон ноутбука): сокет мог ещё не заметить обрыв — догоняем сразу
  const AWAY = 60_000
  const visibility = useDocumentVisibility()
  let hiddenAt = 0
  watch(visibility, (value) => {
    if (value === 'hidden') {
      hiddenAt = Date.now()
      return
    }
    if (hiddenAt && Date.now() - hiddenAt > AWAY) catchUp()
    hiddenAt = 0
  })

  onMounted(() => {
    loadLanguages()
    loadRegistry()
    load(true)
    stopChannel = subscribeWithRetry(supabase, buildChannel, {
      onUp: () => {
        clearTimeout(offlineTimer)
        offline.value = false
        // Снова на связи (или впервые — между загрузкой и подпиской тоже могли быть правки) — догнать
        catchUp()
      },
      onDown: () => {
        clearTimeout(offlineTimer)
        offlineTimer = setTimeout(() => (offline.value = true), OFFLINE_DELAY)
      }
    })
  })

  onBeforeUnmount(() => {
    stopChannel?.()
    clearTimeout(flushTimer)
    clearTimeout(offlineTimer)
  })

  return {
    languages,
    languageCodes,
    registry,
    loadRegistry,
    rows,
    total,
    loading,
    initialLoading,
    hasMore,
    loadError,
    retryLoad,
    offline,
    tooManyChanges,
    q,
    selectedTags,
    applyTag,
    filters,
    filtersKey,
    hasFilters,
    resetFilters,
    load,
    reload,
    setTranslation,
    undo,
    redo,
    deprecateKeys,
    restoreKeys,
    fetchAll,
    findRow,
    keysVersion
  }
}
