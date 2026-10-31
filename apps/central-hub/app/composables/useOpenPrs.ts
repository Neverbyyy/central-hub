export interface OpenPr {
  set: string
  number: number
  url: string
  // Кто выгрузил последним и когда — из журнала выгрузок
  actor: string | null
  at: string | null
}

const THIRTY_DAYS = 60 * 60 * 24 * 30

/**
 * Открытые PR выгрузки — для баджа на кнопке «Выгрузить в код». Обновляются у всех сразу: по событию
 * выгрузки или вебхука (useExportPrEvents) и при возврате на вкладку — так видно и мерж без вебхука.
 *
 * Последний ответ лежит в куке, поэтому бадж приходит уже в HTML страницы. Без неё он появлялся бы после
 * загрузки страницы и ответа GitHub (0,3–0,7 с). Свежий ответ сразу заменяет значение из куки.
 */
export function useOpenPrs() {
  const cached = useCookie<OpenPr[]>('hub-open-prs', { default: () => [], maxAge: THIRTY_DAYS, sameSite: 'lax' })
  const { data, refresh } = useFetch<OpenPr[]>('/api/export/open-prs', { key: 'open-prs', server: false, lazy: true })
  watch(data, (value) => {
    if (value) cached.value = value
  })
  // Кука приходит из браузера: не массив (правили руками, старый формат) — считаем, что PR нет
  const openPrs = computed(() => data.value ?? (Array.isArray(cached.value) ? cached.value : []))

  // Пачку событий — одним запросом
  const refreshSoon = useDebounceFn(() => refresh(), 200)
  const { listen, stop } = useExportPrEvents(() => refreshSoon())
  onMounted(listen)
  onBeforeUnmount(stop)

  const visibility = useDocumentVisibility()
  watch(visibility, (value) => {
    if (value === 'visible') refreshSoon()
  })

  return { openPrs, refresh }
}
