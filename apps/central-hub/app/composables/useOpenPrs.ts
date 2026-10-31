export interface OpenPr {
  set: string
  number: number
  url: string
  // Кто выгрузил последним и когда — из журнала выгрузок
  actor: string | null
  at: string | null
}

/**
 * Открытые PR выгрузки — для баджа на кнопке «Выгрузить в код». Обновляются у всех сразу: по событию
 * выгрузки или вебхука (useExportPrEvents) и при возврате на вкладку — так видно и мерж без вебхука.
 */
export function useOpenPrs() {
  const { data: openPrs, refresh } = useFetch<OpenPr[]>('/api/export/open-prs', { key: 'open-prs', server: false, lazy: true, default: () => [] })

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
