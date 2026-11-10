import type { DropdownMenuItem } from '@nuxt/ui'

/**
 * Меню «Очередь перевода» над гридом: пункт на язык перевода со счётчиком — сколько строк ждёт с учётом раздела.
 * Считается при открытии меню (loadQueueCounts в @update:open), а не заранее: раздел мог поменяться.
 */
export function useQueueMenu(prefix: Ref<string>) {
  const { targets } = useLanguages()
  const counts = ref<Record<string, number> | null>(null)

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
      counts.value = {}
    }
  }

  const queueItems = computed<DropdownMenuItem[][]>(() => [
    [{ type: 'label', label: prefix.value ? `Раздел ${prefix.value}` : 'Все ключи' }],
    targets.value.map(l => ({
      label: `${l.code.toUpperCase()} — ${l.name}`,
      // Свой хвост со счётчиком (#queue-trailing) — и в кнопке очереди, и в подменю «Ещё»
      slot: 'queue',
      count: counts.value ? (counts.value[l.code] ?? 0) : undefined,
      onSelect: () => {
        navigateTo({ path: '/localizations/queue', query: { lang: l.code, ...(prefix.value ? { prefix: prefix.value } : {}) } })
      }
    }))
  ])

  // Хвост пункта языка: сколько ждёт перевода. unknown — тип пункта в своём слоте Nuxt UI выводит только для
  // литерала slot, а у пунктов, собранных в computed, он string
  const queueCount = (item: unknown) => {
    const count = (item as { count?: number }).count
    return count === undefined ? '…' : count || '✓'
  }

  return { queueItems, loadQueueCounts, queueCount }
}
