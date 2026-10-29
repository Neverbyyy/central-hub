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

const { data, status, refresh } = await useFetch<TreeNode[]>('/api/keys/tree', { server: false, lazy: true })

// Заглушка на время загрузки: уровень вложенности и ширина подписи, как у common → button, legacy → inapp
const SKELETON = [
  { level: 0, width: 56 },
  { level: 1, width: 44 },
  { level: 0, width: 48 },
  { level: 1, width: 40 },
  { level: 1, width: 64 },
  { level: 0, width: 36 }
]
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

// Повторный клик по выбранному разделу снимает выбор — вместе с ним снимается и фильтр
const onSelect = (item: Item | undefined) => {
  emit('select', item ? `${item.value}.` : '')
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
      <div
        v-if="status === 'error' && !data"
        class="px-2 py-1 text-xs text-gray-500"
      >
        Разделы не загрузились.
        <button
          type="button"
          class="font-medium text-gray-700 underline underline-offset-2"
          @click="refresh()"
        >
          Повторить
        </button>
      </div>
      <!-- Скелетон по форме настоящего дерева, пока разделы грузятся -->
      <div
        v-else-if="!data"
        class="px-2"
        aria-busy="true"
        aria-label="Загрузка разделов"
      >
        <div
          v-for="(row, i) in SKELETON"
          :key="i"
          class="flex h-7 items-center gap-2"
          :style="{ paddingLeft: `${row.level * 16}px` }"
        >
          <!-- Тон как у полосок скелетона в гриде, иначе на белом фоне их не видно -->
          <USkeleton class="size-4 rounded bg-gray-200" />
          <USkeleton
            class="h-3 rounded bg-gray-200"
            :style="{ width: `${row.width}px` }"
          />
          <USkeleton class="ml-auto h-2.5 w-6 rounded bg-gray-100" />
        </div>
      </div>
      <UTree
        v-else
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
