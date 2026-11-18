import type { DropdownMenuItem } from '@nuxt/ui'

/**
 * Меню «Очередь перевода» над гридом: пункт на язык перевода со счётчиком — сколько строк ждёт с учётом раздела.
 * Считается при открытии меню (loadQueueCounts в @update:open), а не заранее: раздел мог поменяться.
 * Не посчиталось — у языков прочерк и строка об этом, а не «✓»: галочка значила бы «переводить нечего».
 */
export function useQueueMenu(prefix: Ref<string>) {
  const { targets } = useLanguages()
  // null — считаются; 'error' — не посчитались
  const counts = ref<Record<string, number> | 'error' | null>(null)

  const loadQueueCounts = async (open: boolean) => {
    if (!open) return
    counts.value = null
    try {
      const list = await $fetch<{ lang: string, missing: number, stale: number }[]>('/api/queue/counts', {
        query: { prefix: prefix.value || undefined }
      })
      counts.value = Object.fromEntries(list.map(c => [c.lang, c.missing + c.stale]))
    } catch (error) {
      console.error(error)
      counts.value = 'error'
    }
  }

  // Хвост пункта языка: сколько ждёт перевода; «…» — считается, «—» — не посчиталось, «✓» — ждать нечего
  const trailing = (code: string) => {
    const all = counts.value
    if (all === 'error') return '—'
    return all ? String(all[code] || '✓') : '…'
  }

  const queueItems = computed<DropdownMenuItem[][]>(() => [
    [
      { type: 'label', label: prefix.value ? hubT('queueMenu.section', { prefix: prefix.value }) : hubT('tree.allKeys') },
      ...(counts.value === 'error'
        ? [{ type: 'label' as const, label: hubT('queueMenu.failed'), class: 'font-normal text-red-600 dark:text-red-400' }]
        : [])
    ],
    targets.value.map(l => ({
      label: `${l.code.toUpperCase()} — ${languageName(l.code)}`,
      // Свой хвост со счётчиком (#queue-trailing) — и в кнопке очереди, и в подменю «Ещё»
      slot: 'queue',
      count: trailing(l.code),
      onSelect: () => {
        navigateTo({ path: '/localizations/queue', query: { lang: l.code, ...(prefix.value ? { prefix: prefix.value } : {}) } })
      }
    }))
  ])

  // unknown — тип пункта в своём слоте Nuxt UI выводит только для литерала slot, а у пунктов, собранных в computed, он string
  const queueCount = (item: unknown) => (item as { count: string }).count

  return { queueItems, loadQueueCounts, queueCount }
}
