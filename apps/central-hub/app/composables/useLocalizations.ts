import type { RealtimeChannel } from '@supabase/supabase-js'
import { escapeLike, type RegistryKind } from '@amaya/l10n-core'

export interface RegistryEntry {
  kind: RegistryKind
  code: string
  title: string
}

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
  // Версия исходного текста, с которой сделан перевод; меньше source_rev — перевод устарел
  based_on: Record<string, number>
  source_rev: number
  // Языки с переводом, устаревшим после правки английского (считает база)
  stale_langs: string[]
  deprecated_at: string | null
  created_at: string
  updated_at: string
  // Языки, которые сейчас сохраняются (оптимистичное обновление ещё не подтверждено)
  _saving?: Record<string, boolean>
}

// Куда сдвинуть курсор после сохранения ячейки; 'blur' — фокус ушёл наружу
export type CommitMove = 'down' | 'right' | 'left' | 'stay' | 'blur'

// pending — не утверждённые: черновики и тексты от ИИ вместе, то, что не уходит в выгрузку в код
export type StatusFilter = '' | TranslationStatus | 'pending'

/** Есть что утверждать на языке: текст есть, а статус не «утверждён» или перевод устарел — то же правило у сервера. */
export const canApproveLang = (row: Pick<Localization, 'translations' | 'status' | 'stale_langs'>, lang: string) =>
  !!row.translations?.[lang] && (row.status?.[lang] !== 'approved' || !!row.stale_langs?.includes(lang))

const PAGE_SIZE = 100
const SELECT = 'technical_key, translations, status, based_on, source_rev, stale_langs, deprecated_at, created_at, updated_at'
const WEEK = 7 * 24 * 60 * 60 * 1000

// Параметры адреса, которые описывают выборку; остальные (key, new) не трогаем
const FILTER_PARAMS = ['q', 'tags', 'status', 'stale', 'missing', 'recent', 'prefix', 'deprecated']

const asString = (value: unknown) => (typeof value === 'string' ? value : '')

interface Edit {
  key: string
  lang: string
  prev: string
  next: string
}

interface Conflict {
  current: string | null
  actor?: string
}

// Ответ 409 от PUT /api/translations: ячейку изменили, пока человек её правил
const conflictOf = (error: unknown): Conflict | null => {
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
  const registry = ref<RegistryEntry[]>([])

  const rows = ref<Localization[]>([])
  const total = ref<number | null>(null)
  const loading = ref(false)
  const initialLoading = ref(true)
  const hasMore = ref(true)

  // --- Выборка: поиск, теги и фильтры; всё лежит в адресе, ссылкой можно поделиться ---
  const q = ref('')
  const selectedTags = ref<string[]>([])
  const availableTags = ref<string[]>([])
  const filters = reactive({
    status: '' as StatusFilter,
    // Только с переводами, устаревшими после правки английского
    stale: false,
    // Код языка: нет перевода на него
    missing: '',
    // Изменённые за неделю
    recent: false,
    // Раздел из дерева, например app.cars2.
    prefix: '',
    // Вместо действующих ключей — помеченные устаревшими (их нет в выгрузках)
    deprecated: false
  })

  const readQuery = () => {
    const query = route.query
    q.value = asString(query.q)
    selectedTags.value = asString(query.tags).split(',').filter(Boolean)
    const status = asString(query.status)
    filters.status = (['ai', 'draft', 'approved', 'pending'].includes(status) ? status : '') as StatusFilter
    filters.stale = query.stale === '1'
    const missing = asString(query.missing)
    filters.missing = /^[a-z]{2,3}(-[A-Za-z0-9]{2,4})?$/.test(missing) ? missing : ''
    filters.recent = query.recent === '1'
    filters.prefix = asString(query.prefix)
    filters.deprecated = query.deprecated === '1'
  }

  const buildQuery = () => {
    const next: Record<string, string> = {}
    for (const [name, value] of Object.entries(route.query)) {
      if (!FILTER_PARAMS.includes(name) && typeof value === 'string') next[name] = value
    }
    if (q.value.trim()) next.q = q.value.trim()
    if (selectedTags.value.length) next.tags = selectedTags.value.join(',')
    if (filters.status) next.status = filters.status
    if (filters.stale) next.stale = '1'
    if (filters.missing) next.missing = filters.missing
    if (filters.recent) next.recent = '1'
    if (filters.prefix) next.prefix = filters.prefix
    if (filters.deprecated) next.deprecated = '1'
    return next
  }

  const sameQuery = (a: Record<string, unknown>, b: Record<string, unknown>) =>
    JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort())

  const syncUrl = () => {
    const next = buildQuery()
    if (!sameQuery(route.query, next)) router.replace({ query: next })
  }

  const hasFilters = computed(() =>
    !!(q.value.trim() || selectedTags.value.length || filters.status || filters.stale || filters.missing || filters.recent || filters.prefix || filters.deprecated)
  )

  const resetFilters = () => {
    q.value = ''
    selectedTags.value = []
    Object.assign(filters, { status: '', stale: false, missing: '', recent: false, prefix: '', deprecated: false })
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
    if (selectedTags.value.length) query = query.contains('tags', selectedTags.value)
    if (filters.status === 'pending') query = query.overlaps('status_values', ['draft', 'ai'])
    else if (filters.status) query = query.contains('status_values', [filters.status])
    if (filters.stale) query = query.neq('stale_langs', '{}')
    if (filters.missing) query = query.is(`translations->>${filters.missing}`, null)
    if (filters.recent) query = query.gte('updated_at', new Date(Date.now() - WEEK).toISOString())
    if (filters.prefix) query = query.like('technical_key', `${escapeLike(filters.prefix)}%`)
    return query
  }

  watch(languagesError, (error) => {
    if (error) toast.add({ title: 'Не загрузились языки', description: error.message, color: 'error' })
  })

  const loadRegistry = async () => {
    const { data, error } = await supabase.from('registry').select('kind, code, title').order('kind').order('code')
    if (!error) registry.value = (data ?? []) as RegistryEntry[]
  }

  const load = async (reset = false) => {
    if (!reset && (loading.value || !hasMore.value)) return

    const gen = reset ? ++generation : generation
    const from = reset ? 0 : rows.value.length
    loading.value = true

    const { data, error, count } = await applyFilters(
      supabase
        .from('localizations')
        .select(SELECT, from === 0 ? { count: 'exact' } : undefined)
        .order('technical_key', { ascending: true })
        .range(from, from + PAGE_SIZE - 1)
    )

    if (gen !== generation) return

    if (error) {
      toast.add({ title: 'Ошибка загрузки', description: error.message, color: 'error' })
      if (reset) rows.value = []
      hasMore.value = false
    } else {
      const page = (data ?? []) as Localization[]
      rows.value = reset ? page : rows.value.concat(page)
      hasMore.value = page.length === PAGE_SIZE
      if (count !== null && count !== undefined) total.value = count
    }

    loading.value = false
    initialLoading.value = false
  }

  const reload = () => load(true)

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

  // Пустой список тегов значит разное: ещё грузятся, не загрузились или их действительно нет
  const tagsState = ref<'loading' | 'ready' | 'error'>('loading')

  const fetchTags = async () => {
    const { data, error } = await supabase.rpc('get_unique_tags')
    if (!error && data) {
      availableTags.value = (data as { tag: unknown }[]).map(item => String(item.tag)).filter(Boolean)
      tagsState.value = 'ready'
    } else if (tagsState.value !== 'ready') {
      tagsState.value = 'error'
    }
  }

  // --- Сохранение одной ячейки ---
  const undoStack: Edit[] = []
  const redoStack: Edit[] = []

  const findRow = (key: string) => rows.value.find(r => r.technical_key === key)

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
          title: conflict.actor ? `Ячейку уже изменил(а) ${conflict.actor}` : 'Ячейку уже изменили',
          description: `${lang.toUpperCase()} сейчас: «${conflict.current ?? '—'}». Ваш вариант: «${value || '—'}».`,
          color: 'warning',
          duration: 15000,
          actions: [{
            label: 'Оставить мой',
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
      await notifyError('Не сохранилось', error)
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
      toast.add({ title: `Возвращено: ${keysCount(count)}`, color: 'success' })
      await reload()
    } catch (error) {
      await notifyError('Не удалось вернуть', error)
    }
  }

  const deprecateKeys = async (keys: string[]) => {
    let count: number
    try {
      count = (await $fetch('/api/keys/deprecate', { method: 'POST', body: { keys } })).count
    } catch (error) {
      await notifyError('Не удалось пометить устаревшими', error)
      return false
    }

    const removed = new Set(keys)
    rows.value = rows.value.filter(r => !removed.has(r.technical_key))
    if (total.value !== null) total.value -= count
    toast.add({
      title: `${count} ${plural(count, ['ключ помечен', 'ключа помечены', 'ключей помечены'])} устаревшими`,
      description: 'Они пропали из таблицы и выгрузок, история сохранена',
      color: 'success',
      actions: [{ label: 'Вернуть', color: 'neutral', variant: 'outline', onClick: () => restoreKeys(keys) }]
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
      all.push(...(data ?? []))
      if (!data || data.length < step) break
    }
    return all
  }

  // --- Live-обновления от коллег ---
  let channel: RealtimeChannel | null = null

  onMounted(() => {
    loadLanguages()
    loadRegistry()
    fetchTags()
    load(true)

    channel = supabase
      .channel('localizations-grid')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'localizations' }, (payload) => {
        const incoming = payload.new as Localization
        // Ключ пометили устаревшим или вернули — из текущей выборки (действующие / устаревшие) он уходит
        if (!!incoming.deprecated_at !== filters.deprecated) {
          rows.value = rows.value.filter(r => r.technical_key !== incoming.technical_key)
          return
        }

        const row = findRow(incoming.technical_key)
        if (!row) return

        // Языки, которые мы сами сейчас сохраняем, не трогаем — придёт наше же событие
        const merged = { ...incoming.translations }
        for (const lang of Object.keys(row._saving ?? {})) {
          if (row._saving?.[lang]) merged[lang] = row.translations?.[lang] ?? ''
        }
        row.translations = merged
        row.status = incoming.status
        row.based_on = incoming.based_on
        row.source_rev = incoming.source_rev
        row.stale_langs = incoming.stale_langs
        row.updated_at = incoming.updated_at
      })
      .subscribe()
  })

  onBeforeUnmount(() => {
    if (channel) supabase.removeChannel(channel)
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
    q,
    selectedTags,
    availableTags,
    tagsState,
    fetchTags,
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
    fetchAll
  }
}
