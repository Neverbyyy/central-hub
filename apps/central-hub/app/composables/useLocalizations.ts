import type { RealtimeChannel } from '@supabase/supabase-js'

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
  deprecated_at: string | null
  created_at: string
  updated_at: string
  // Языки, которые сейчас сохраняются (оптимистичное обновление ещё не подтверждено)
  _saving?: Record<string, boolean>
}

// Куда сдвинуть курсор после сохранения ячейки; 'blur' — фокус ушёл наружу
export type CommitMove = 'down' | 'right' | 'left' | 'stay' | 'blur'

const PAGE_SIZE = 100
const SELECT = 'technical_key, translations, status, based_on, source_rev, deprecated_at, created_at, updated_at'

// % и _ в поиске — обычные символы, а не шаблоны LIKE
const escapeLike = (value: string) => value.replace(/[\\%_]/g, char => `\\${char}`)

interface Edit {
  key: string
  lang: string
  prev: string
  next: string
}

export function useLocalizations() {
  // Браузер только читает — публичному ключу запись закрыта; изменения идут через /api
  const supabase = useSupabaseClient()
  const toast = useToast()
  const authRedirect = useAuthRedirect()

  const languages = ref<Language[]>([])
  const languageCodes = computed(() => languages.value.map(l => l.code))

  const rows = ref<Localization[]>([])
  const total = ref<number | null>(null)
  const loading = ref(false)
  const initialLoading = ref(true)
  const hasMore = ref(true)

  const q = ref('')
  const selectedTags = ref<string[]>([])
  const availableTags = ref<string[]>([])

  // Каждый новый поиск/фильтр увеличивает поколение, ответы старых запросов выбрасываются
  let generation = 0

  interface Filterable<T> {
    is: (column: string, value: null) => T
    ilike: (column: string, pattern: string) => T
    contains: (column: string, value: string[]) => T
  }

  const applyFilters = <T extends Filterable<T>>(query: T): T => {
    query = query.is('deprecated_at', null)
    const term = q.value.trim().toLowerCase()
    if (term) {
      // search_text — ключ и переводы на всех языках, с trigram-индексом
      query = query.ilike('search_text', `%${escapeLike(term)}%`)
    }
    if (selectedTags.value.length) {
      query = query.contains('tags', selectedTags.value)
    }
    return query
  }

  const loadLanguages = async () => {
    const { data, error } = await supabase
      .from('languages')
      .select('code, name, dir, is_source')
      .eq('in_editor', true)
      .order('position')
    if (error) {
      toast.add({ title: 'Не загрузились языки', description: error.message, color: 'error' })
      return
    }
    languages.value = (data ?? []) as Language[]
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

  watchDebounced(q, reload, { debounce: 300 })
  watch(selectedTags, reload, { deep: true })

  const fetchTags = async () => {
    const { data, error } = await supabase.rpc('get_unique_tags')
    if (!error && data) {
      availableTags.value = (data as { tag: unknown }[]).map(item => String(item.tag)).filter(Boolean)
    }
  }

  // --- Сохранение одной ячейки ---
  const undoStack: Edit[] = []
  const redoStack: Edit[] = []

  const findRow = (key: string) => rows.value.find(r => r.technical_key === key)

  const writeCell = async (key: string, lang: string, value: string) => {
    const row = findRow(key)
    if (!row) return false

    const prev = row.translations?.[lang] ?? ''
    row.translations = { ...row.translations, [lang]: value }
    row._saving = { ...row._saving, [lang]: true }

    try {
      // Сервер меняет только этот язык — чужие правки соседних языков не затираются
      const { updated_at } = await $fetch('/api/translations', { method: 'PUT', body: { key, lang, value } })
      const target = findRow(key) ?? row
      target._saving = { ...target._saving, [lang]: false }
      target.updated_at = updated_at
      return true
    } catch (error) {
      const target = findRow(key) ?? row
      target._saving = { ...target._saving, [lang]: false }
      // Откатываем, только если за это время ячейку не поменяли ещё раз
      if ((target.translations?.[lang] ?? '') === value) {
        target.translations = { ...target.translations, [lang]: prev }
      }
      if (!(await authRedirect(error))) {
        toast.add({ title: 'Не сохранилось', description: errorMessage(error), color: 'error' })
      }
      return false
    }
  }

  const setTranslation = async (key: string, lang: string, value: string) => {
    const row = findRow(key)
    if (!row) return
    const prev = row.translations?.[lang] ?? ''
    if (prev === value) return

    if (await writeCell(key, lang, value)) {
      undoStack.push({ key, lang, prev, next: value })
      if (undoStack.length > 100) undoStack.shift()
      redoStack.length = 0
    }
  }

  const undo = async () => {
    const edit = undoStack.pop()
    if (!edit) return null
    if (await writeCell(edit.key, edit.lang, edit.prev)) redoStack.push(edit)
    return edit
  }

  const redo = async () => {
    const edit = redoStack.pop()
    if (!edit) return null
    if (await writeCell(edit.key, edit.lang, edit.next)) undoStack.push(edit)
    return edit
  }

  // --- Устаревшие: строки не удаляются, а пропадают из грида и выгрузок ---
  const restoreKeys = async (keys: string[]) => {
    try {
      const { count } = await $fetch('/api/keys/restore', { method: 'POST', body: { keys } })
      toast.add({ title: `Возвращено: ${count} ${plural(count, ['ключ', 'ключа', 'ключей'])}`, color: 'success' })
      await reload()
    } catch (error) {
      if (!(await authRedirect(error))) {
        toast.add({ title: 'Не удалось вернуть', description: errorMessage(error), color: 'error' })
      }
    }
  }

  const deprecateKeys = async (keys: string[]) => {
    let count: number
    try {
      count = (await $fetch('/api/keys/deprecate', { method: 'POST', body: { keys } })).count
    } catch (error) {
      if (!(await authRedirect(error))) {
        toast.add({ title: 'Не удалось пометить устаревшими', description: errorMessage(error), color: 'error' })
      }
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
    fetchTags()
    load(true)

    channel = supabase
      .channel('localizations-grid')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'localizations' }, (payload) => {
        const incoming = payload.new as Localization
        if (incoming.deprecated_at) {
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
    rows,
    total,
    loading,
    initialLoading,
    hasMore,
    q,
    selectedTags,
    availableTags,
    load,
    reload,
    setTranslation,
    undo,
    redo,
    deprecateKeys,
    fetchAll
  }
}
