<script setup lang="ts">
// Дерево разделов ключей от общего к частному: app → cars2 → paywall.
// Выбор раздела ставит фильтр по началу ключа.
interface TreeNode {
  path: string
  label: string
  keys: number
  children: TreeNode[]
}

interface Item {
  label: string
  value: string
  keys: number
  children?: Item[]
}

const props = defineProps<{
  // Текущий фильтр, например app.cars2.
  prefix: string
  // Меняется — дерево перечитывается (после создания ключа)
  version: number
}>()

const emit = defineEmits<{ select: [prefix: string] }>()

const { data, refresh } = await useFetch<TreeNode[]>('/api/keys/tree', { server: false, lazy: true })
watch(() => props.version, () => refresh())

const toItems = (nodes: TreeNode[]): Item[] => nodes.map(node => ({
  label: node.label,
  value: node.path,
  keys: node.keys,
  children: node.children.length ? toItems(node.children) : undefined
}))

const items = computed(() => toItems(data.value ?? []))

// Раскрытые разделы. defaultExpanded у пунктов не подходит: UTree читает его один раз,
// а данные приходят позже. Верхний уровень и путь к выбранному разделу раскрываем сами.
const expanded = ref<string[]>([])

const ancestors = (path: string) => path.split('.').slice(0, -1).map((_, i, parts) => parts.slice(0, i + 1).join('.'))

let topExpanded = false

watch([items, () => props.prefix], ([list, prefix]) => {
  const open = new Set(expanded.value)
  if (!topExpanded && list.length) {
    topExpanded = true
    for (const item of list) open.add(item.value)
  }
  for (const path of ancestors(prefix.replace(/\.$/, ''))) open.add(path)
  if (open.size !== expanded.value.length) expanded.value = [...open]
}, { immediate: true })

const findItem = (list: Item[], value: string): Item | undefined => {
  for (const item of list) {
    if (item.value === value) return item
    const found = item.children && findItem(item.children, value)
    if (found) return found
  }
}

const selected = computed(() => findItem(items.value, props.prefix.replace(/\.$/, '')))

const onSelect = (item: Item | undefined) => {
  if (item) emit('select', `${item.value}.`)
}
</script>

<template>
  <aside class="flex w-60 shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white">
    <button
      type="button"
      class="mx-2 mt-2 mb-1 flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-gray-50"
      :class="!prefix ? 'font-semibold text-gray-900' : 'text-gray-600'"
      @click="emit('select', '')"
    >
      Все ключи
    </button>
    <div class="flex-1 overflow-auto px-1 pb-3">
      <UTree
        v-model:expanded="expanded"
        :items="items"
        :model-value="selected"
        :get-key="(item: Item) => item.value"
        size="sm"
        @update:model-value="onSelect"
      >
        <template #item-label="{ item }">
          <span class="font-mono text-xs">{{ item.label }}</span>
        </template>
        <!-- Свой хвост пункта: число ключей и стрелка, которую иначе рисует сам UTree -->
        <template #item-trailing="{ item, ui }">
          <span class="text-[10px] tabular-nums text-gray-400">{{ item.keys }}</span>
          <UIcon
            v-if="item.children?.length"
            name="i-lucide-chevron-down"
            :class="ui.linkTrailingIcon()"
          />
        </template>
      </UTree>
    </div>
  </aside>
</template>
