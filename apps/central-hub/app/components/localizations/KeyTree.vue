<script setup lang="ts">
// Дерево разделов ключей от общего к частному: app → cars2 → paywall.
// Выбор раздела ставит фильтр по началу ключа.
import type { KeyTreeNode } from '~/utils/keySuggestions'

interface Item {
  label: string
  value: string
  keys: number
  children?: Item[]
}

const props = defineProps<{
  // Текущий фильтр, например app.cars2.
  prefix: string
  // Меняется — дерево перечитывается: ключ создали, пометили устаревшим, вернули или так сделал коллега
  version: number
  // В шторке узкого экрана: пункты крупнее — под палец
  drawer?: boolean
}>()

// done — выбор окончательный: раздел без вложенных или «Все ключи». Папку с вложенными выбирают и по пути
// глубже — шторка на ней не закрывается
const emit = defineEmits<{ select: [prefix: string, done: boolean] }>()

// Те же данные читает форма «Новый ключ» для подсказок — один запрос на страницу
const { tree: data, status, refresh } = useKeyTree()

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

const toItems = (nodes: KeyTreeNode[]): Item[] => nodes.map(node => ({
  label: node.label,
  value: node.path,
  keys: node.keys,
  children: node.children.length ? toItems(node.children) : undefined
}))

const items = computed(() => toItems(data.value ?? []))

// Раскрытые разделы. defaultExpanded у пунктов не подходит: UTree читает его один раз,
// а данные приходят позже. Верхний уровень и путь к выбранному разделу раскрываем сами.
const expanded = ref<string[]>([])

let topExpanded = false

watch([items, () => props.prefix], ([list, prefix]) => {
  const open = new Set(expanded.value)
  if (!topExpanded && list.length) {
    topExpanded = true
    for (const item of list) open.add(item.value)
  }
  for (const path of sectionAncestors(sectionPath(prefix))) open.add(path)
  if (open.size !== expanded.value.length) expanded.value = [...open]
}, { immediate: true })

// Фильтр сняли (×, «Все ключи», повторный клик) — сворачивается только раздел, из которого ушли.
// Поднялись выше по хлебным крошкам — ещё и разделы между ними: новый уровень выглядит так же,
// как если бы его выбрали в дереве. Верхний уровень остаётся раскрытым
watch(() => props.prefix, (prefix, previous) => {
  if (!previous || prefix === previous || !previous.startsWith(prefix)) return
  const left = sectionPath(previous)
  const close = new Set(prefix ? [...sectionAncestors(left), left].filter(path => path.startsWith(prefix)) : [left])
  for (const item of items.value) close.delete(item.value)
  expanded.value = expanded.value.filter(path => !close.has(path))
})

// Клик по раскрытой, но не выбранной папке выбирает её и не сворачивает — иначе выбор прятал бы содержимое.
// Клик по выбранной снимает выбор и сворачивает; стрелки клавиатуры работают как обычно
const onToggle = (event: { detail: { originalEvent: Event, isExpanded: boolean }, preventDefault: () => void }, item: Item) => {
  if (event.detail.originalEvent.type !== 'click') return
  const wasSelected = sectionPath(props.prefix) === item.value
  if (!wasSelected && event.detail.isExpanded) event.preventDefault()
}

const findItem = (list: Item[], value: string): Item | undefined => {
  for (const item of list) {
    if (item.value === value) return item
    const found = item.children && findItem(item.children, value)
    if (found) return found
  }
}

const selected = computed(() => findItem(items.value, sectionPath(props.prefix)))

// Повторный клик по выбранному разделу снимает выбор — вместе с ним снимается и фильтр
const onSelect = (item: Item | undefined) => {
  emit('select', item ? `${item.value}.` : '', !!item && !item.children?.length)
}
</script>

<template>
  <!-- Ширину и рамку задаёт место: колонка слева от грида или шторка на узком экране -->
  <aside class="flex shrink-0 flex-col overflow-hidden bg-default">
    <button
      type="button"
      class="mx-2 mt-2 mb-1 flex items-center justify-between rounded-md px-2 text-left text-sm"
      :class="[!prefix ? 'bg-elevated font-semibold text-primary' : 'text-toned hover:bg-muted', drawer ? 'py-3' : 'py-1.5']"
      :aria-current="!prefix ? 'true' : undefined"
      @click="emit('select', '', true)"
    >
      Все ключи
    </button>
    <div class="flex-1 overflow-auto px-1 pb-3">
      <div
        v-if="status === 'error' && !data"
        class="px-2 py-1 text-xs text-muted"
      >
        Разделы не загрузились.
        <button
          type="button"
          class="font-medium text-default underline underline-offset-2"
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
          <USkeleton class="size-4 rounded bg-accented" />
          <USkeleton
            class="h-3 rounded bg-accented"
            :style="{ width: `${row.width}px` }"
          />
          <USkeleton class="ml-auto h-2.5 w-6 rounded bg-elevated" />
        </div>
      </div>
      <UTree
        v-else
        v-model:expanded="expanded"
        :items="items"
        :model-value="selected"
        :get-key="(item: Item) => item.value"
        :size="drawer ? 'lg' : 'sm'"
        :ui="drawer ? { link: 'py-3' } : undefined"
        @update:model-value="onSelect"
        @toggle="onToggle"
      >
        <template #item-label="{ item }">
          <span
            class="font-mono"
            :class="drawer ? 'text-sm' : 'text-xs'"
          >{{ item.label }}</span>
        </template>
        <!-- Свой хвост пункта: число ключей и стрелка, которую иначе рисует сам UTree -->
        <template #item-trailing="{ item, ui }">
          <span
            class="tabular-nums text-muted"
            :class="drawer ? 'text-xs' : 'text-[10px]'"
          >{{ item.keys }}</span>
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
