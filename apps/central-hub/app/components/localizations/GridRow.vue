<script setup lang="ts">
import type { CommitMove, Localization } from '~/composables/useLocalizations'

// Строка — отдельный компонент: смена активной ячейки или выделения
// перерисовывает только затронутые строки, а не всю таблицу.
const props = defineProps<{
  row: Localization
  index: number
  languages: string[]
  // -1 — в этой строке нет активной / редактируемой ячейки
  activeCol: number
  editingCol: number
  editInitial: string
  selected: boolean
}>()

const emit = defineEmits<{
  cellDown: [index: number, col: number]
  cellDblclick: [index: number, col: number]
  toggle: [key: string, value: boolean]
  commit: [value: string, move: CommitMove]
  cancel: []
}>()

const THREE_DAYS = 3 * 24 * 60 * 60 * 1000
const isNew = computed(() => !!props.row.created_at && Date.now() - new Date(props.row.created_at).getTime() <= THREE_DAYS)

const formatDate = (value?: string) => value
  ? new Date(value).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
  : '—'
</script>

<template>
  <div
    class="loc-row"
    :class="{ 'is-odd': index % 2 === 1, 'is-selected': selected }"
  >
    <div
      class="loc-cell loc-sticky left-0 justify-center"
      @mousedown.stop
    >
      <input
        type="checkbox"
        class="size-3.5 cursor-pointer accent-gray-900"
        :checked="selected"
        @change="emit('toggle', row.technical_key, ($event.target as HTMLInputElement).checked)"
      >
    </div>

    <div
      class="loc-cell loc-sticky left-[40px] border-r border-gray-200 px-3 font-mono text-[11px] font-semibold"
      :class="[isNew ? 'text-green-600' : 'text-blue-600', { 'is-active': activeCol === 0 }]"
      @mousedown="emit('cellDown', index, 0)"
      @dblclick="emit('cellDblclick', index, 0)"
    >
      <span
        class="truncate"
        :title="row.technical_key"
      >{{ row.technical_key }}</span>
    </div>

    <div
      v-for="(lang, i) in languages"
      :key="lang"
      class="loc-cell px-3 text-xs"
      :class="{ 'is-active': activeCol === i + 1 }"
      @mousedown="emit('cellDown', index, i + 1)"
      @dblclick="emit('cellDblclick', index, i + 1)"
    >
      <span
        v-if="row.translations?.[lang]"
        class="truncate"
        :title="row.translations[lang]"
      >{{ row.translations[lang] }}</span>
      <span
        v-else
        class="text-gray-300"
      >—</span>
      <span
        v-if="row._saving?.[lang]"
        class="absolute right-1.5 top-1.5 size-1.5 animate-pulse rounded-full bg-blue-500"
      />

      <LocalizationsCellEditor
        v-if="editingCol === i + 1"
        :initial="editInitial"
        @commit="(value, move) => emit('commit', value, move)"
        @cancel="emit('cancel')"
      />
    </div>

    <div class="loc-cell px-3 text-[10px] text-gray-400">
      {{ formatDate(row.created_at) }}
    </div>
    <div class="loc-cell px-3 text-[10px] text-gray-400">
      {{ formatDate(row.updated_at) }}
    </div>
  </div>
</template>
