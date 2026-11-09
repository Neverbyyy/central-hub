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
  // Коллеги, которые сейчас правят ячейки этой строки: язык → имена
  editors?: Record<string, string[]>
}>()

const emit = defineEmits<{
  cellDown: [index: number, col: number]
  cellDblclick: [index: number, col: number]
  toggle: [key: string, value: boolean]
  commit: [value: string, move: CommitMove]
  cancel: []
}>()

// Утверждённые без отметки — их большинство, отметки только у того, что требует внимания
const STATUS_LABEL = { ai: 'Черновой перевод нейросети', draft: 'Черновик — ещё не утверждён' } as const

const cellTitle = (lang: string) => {
  const text = props.row.translations?.[lang]
  if (!text) return undefined
  const notes = [text]
  const status = props.row.status?.[lang]
  if (status === 'ai' || status === 'draft') notes.push(STATUS_LABEL[status])
  if (props.row.stale_langs?.includes(lang)) notes.push('Перевод устарел: английский поменяли после перевода')
  return notes.join('\n')
}
</script>

<template>
  <div
    class="loc-row"
    :class="{ 'is-odd': index % 2 === 1, 'is-selected': selected }"
  >
    <!-- Вся ячейка — label: пальцем в квадратик 14 px не попасть -->
    <label
      class="loc-cell loc-sticky left-0 justify-center"
      @mousedown.stop
    >
      <input
        type="checkbox"
        class="size-3.5 cursor-pointer accent-gray-900"
        :aria-label="`Выделить ${row.technical_key}`"
        :checked="selected"
        @change="emit('toggle', row.technical_key, ($event.target as HTMLInputElement).checked)"
      >
    </label>

    <div
      class="loc-cell loc-sticky left-[40px] border-r border-default px-3 font-mono text-[11px] font-semibold text-green-600 dark:text-green-400"
      :class="{ 'is-active': activeCol === 0 }"
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
      :class="{ 'is-active': activeCol === i + 1, 'has-presence': editors?.[lang]?.length }"
      :style="editors?.[lang]?.length ? { '--presence': presenceColor(editors[lang]![0]!) } : undefined"
      @mousedown="emit('cellDown', index, i + 1)"
      @dblclick="emit('cellDblclick', index, i + 1)"
    >
      <!-- Ячейку правит коллега: рамка его цвета и подпись. Править можно и самому — сервер не даст молча
           перетереть чужой текст (конфликт 409) -->
      <span
        v-if="editors?.[lang]?.length"
        class="loc-presence"
      >{{ presenceLabel(editors[lang]!, lang) }}</span>
      <span
        v-if="row.translations?.[lang]"
        class="truncate"
        :title="cellTitle(lang)"
      >{{ row.translations[lang] }}</span>
      <span
        v-else
        class="text-gray-300 dark:text-gray-600"
      >—</span>

      <span
        v-if="row._saving?.[lang]"
        class="absolute right-1.5 top-1.5 size-1.5 animate-pulse rounded-full bg-blue-500"
      />
      <template v-else-if="row.translations?.[lang]">
        <span
          v-if="row.status?.[lang] === 'ai'"
          class="absolute right-1 top-0.5 text-[9px] leading-none text-violet-500"
          aria-label="от ИИ"
        >✦</span>
        <span
          v-else-if="row.status?.[lang] === 'draft'"
          class="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-gray-400"
          aria-label="черновик"
        />
      </template>
      <span
        v-if="row.stale_langs?.includes(lang)"
        class="absolute left-1 top-1 size-1.5 rounded-full bg-orange-500"
        aria-label="перевод устарел"
      />

      <LocalizationsCellEditor
        v-if="editingCol === i + 1"
        :initial="editInitial"
        @commit="(value, move) => emit('commit', value, move)"
        @cancel="emit('cancel')"
      />
    </div>

    <div class="loc-cell px-3 text-[10px] text-muted">
      {{ formatDateTime(row.created_at) }}
    </div>
    <div class="loc-cell px-3 text-[10px] text-muted">
      {{ formatDateTime(row.updated_at) }}
    </div>
  </div>
</template>
