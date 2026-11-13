// Теги — свой список: один на вкладку для фильтра «Все теги» (там же создать, переименовать, удалить), меню правого
// клика и форм ключа. Браузер читает публичным ключом, пишет — через сервер. Ошибки записи ловит вызывающий
// (useNotifyError): у каждого места свой заголовок
const byName = (a: string, b: string) => a.toLowerCase().localeCompare(b.toLowerCase())

// Галочки ставят быстрее, чем отвечает сервер: запросы уходят по одному, в порядке кликов. Иначе «поставить» и «снять»
// один тег могли бы дойти до базы в обратном порядке, и в базе остался бы не последний клик. Только в браузере
// (на сервере теги не ставятся), в цепочке нет данных пользователя
let tagQueue: Promise<unknown> = Promise.resolve()

export function useTags() {
  const supabase = useSupabaseClient()
  const tags = useState<string[]>('tags', () => [])
  // Сколько действующих ключей с тегом: в фильтре и в подтверждении удаления
  const counts = useState<Record<string, number>>('tag-counts', () => ({}))
  // Пустой список значит разное: ещё грузится, не загрузился или тегов действительно нет
  const state = useState<'loading' | 'ready' | 'error'>('tags-state', () => 'loading')

  // Коллега мог создать или удалить тег — список перечитывается, когда его открывают (фильтр, меню)
  const load = async () => {
    const { data, error } = await supabase.rpc('get_tags')
    if (!error && data) {
      tags.value = data.map(row => row.name)
      counts.value = Object.fromEntries(data.map(row => [row.name, Number(row.keys)]))
      state.value = 'ready'
    } else if (state.value !== 'ready') {
      state.value = 'error'
    }
  }

  /** Новый тег; возвращает имя, как его сохранил сервер (без пробелов по краям). */
  const create = async (name: string) => {
    const created = await $fetch<{ name: string }>('/api/tags', { method: 'POST', body: { name } })
    if (!tags.value.includes(created.name)) tags.value = [...tags.value, created.name].sort(byName)
    counts.value = { ...counts.value, [created.name]: counts.value[created.name] ?? 0 }
    return created.name
  }

  /** Переименовать у всех ключей; count — у скольких ключей поменялся. */
  const rename = async (from: string, to: string) => {
    const result = await $fetch<{ count: number }>('/api/tags/rename', { method: 'POST', body: { from, to } })
    const name = to.trim()
    tags.value = tags.value.map(tag => (tag === from ? name : tag)).sort(byName)
    const { [from]: keys = 0, ...rest } = counts.value
    counts.value = { ...rest, [name]: keys }
    return result
  }

  /** Удалить тег: снимается со всех ключей; count — со скольких. */
  const remove = async (name: string) => {
    const result = await $fetch<{ count: number }>('/api/tags/delete', { method: 'POST', body: { name } })
    tags.value = tags.value.filter(tag => tag !== name)
    const { [name]: _, ...rest } = counts.value
    counts.value = rest
    return result
  }

  /**
   * Поставить (on) или снять тег у ключей — после предыдущих таких же запросов; count — у скольких что-то поменялось,
   * updatedAt — время записи в базе (события Realtime раньше него о правке не знают).
   */
  const setForKeys = (keys: string[], tag: string, on: boolean) => {
    const request = tagQueue.then(() => $fetch<{ count: number, updatedAt: string | null }>('/api/keys/tag', { method: 'POST', body: { keys, tag, on } }))
    // Отказ одного запроса не останавливает следующие — его ловит вызывающий
    tagQueue = request.catch(() => {})
    return request
  }

  return { tags, counts, state, load, create, rename, remove, setForKeys }
}
