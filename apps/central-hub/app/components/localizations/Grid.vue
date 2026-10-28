<script setup lang="ts">
import type { CommitMove, Localization } from '~/composables/useLocalizations'

const props = defineProps<{
  rows: Localization[]
  languages: string[]
  selectedKeys: Set<string>
  loading: boolean
  initialLoading: boolean
  hasMore: boolean
  // Ключи, помеченные устаревшими: смотреть можно, править — только после «Вернуть»
  readonly?: boolean
}>()

const emit = defineEmits<{
  loadMore: []
  // expected — что было в ячейке до правки: сервер сверит, не изменил ли её кто-то ещё
  save: [key: string, lang: string, value: string, expected: string]
  toggle: [key: string, value: boolean]
  toggleAll: [value: boolean]
  undo: []
  redo: []
  // Открыть панель ключа (клик или Enter по колонке ключа)
  open: [key: string]
  // Активная строка сменилась — открытая панель следует за ней
  focusRow: [key: string]
  escape: []
}>()

const toast = useToast()

// Размеры должны совпадать с --loc-cols в стилях ниже
const ROW_H = 36
const HEADER_H = 36
const STICKY_W = 40 + 260
const LANG_W = 220
const OVERSCAN = 10

const scrollEl = ref<HTMLElement>()
const scrollTop = ref(0)
const { width: viewportW, height: viewportH } = useElementSize(scrollEl)

const onScroll = () => {
  scrollTop.value = scrollEl.value?.scrollTop ?? 0
}

// --- Виртуализация: рендерим только видимые строки ---
const windowRange = computed(() => {
  const first = Math.max(0, Math.floor(scrollTop.value / ROW_H) - OVERSCAN)
  const last = Math.min(props.rows.length, Math.ceil((scrollTop.value + viewportH.value) / ROW_H) + OVERSCAN)
  return { first, last }
})
const visibleRows = computed(() => props.rows.slice(windowRange.value.first, windowRange.value.last))

watch(
  [() => windowRange.value.last, () => props.rows.length, () => props.hasMore, () => props.loading],
  ([last, length, hasMore, loading]) => {
    if (hasMore && !loading && last >= length - 30) emit('loadMore')
  }
)

// --- Выделение строк (чекбоксы) ---
const selectedCount = computed(() => props.rows.reduce((n, r) => n + (props.selectedKeys.has(r.technical_key) ? 1 : 0), 0))
const allSelected = computed(() => props.rows.length > 0 && selectedCount.value === props.rows.length)

// --- Активная ячейка и редактирование ---
// col: 0 — ключ (только чтение), 1..N — языки
const active = ref<{ row: number, col: number } | null>(null)
// previous — значение ячейки на момент начала правки (initial может быть первым напечатанным символом)
const editing = ref<{ key: string, col: number, initial: string, previous: string } | null>(null)

watch(() => props.rows[active.value?.row ?? -1]?.technical_key, (key) => {
  if (key) emit('focusRow', key)
})
const maxCol = computed(() => props.languages.length)

const valueAt = (row: number, col: number) => {
  const r = props.rows[row]
  if (!r) return ''
  return col === 0 ? r.technical_key : (r.translations?.[props.languages[col - 1]!] ?? '')
}

const focusGrid = () => scrollEl.value?.focus({ preventScroll: true })

const ensureVisible = (row: number, col: number) => {
  const el = scrollEl.value
  if (!el) return
  const top = HEADER_H + row * ROW_H
  if (top < el.scrollTop + HEADER_H) el.scrollTop = top - HEADER_H
  else if (top + ROW_H > el.scrollTop + el.clientHeight) el.scrollTop = top + ROW_H - el.clientHeight

  if (col >= 1) {
    const left = STICKY_W + (col - 1) * LANG_W
    if (left < el.scrollLeft + STICKY_W) el.scrollLeft = left - STICKY_W
    else if (left + LANG_W > el.scrollLeft + el.clientWidth) el.scrollLeft = left + LANG_W - el.clientWidth
  }
}

const setActive = (row: number, col: number) => {
  if (!props.rows.length) return
  const r = Math.max(0, Math.min(props.rows.length - 1, row))
  const c = Math.max(0, Math.min(maxCol.value, col))
  active.value = { row: r, col: c }
  ensureVisible(r, c)
  if (row > props.rows.length - 1 && props.hasMore) emit('loadMore')
}

const blockEdit = () => {
  if (!props.readonly) return false
  // Один тост с постоянным id — печать по ячейке не плодит их
  toast.add({ id: 'grid-readonly', title: 'Ключ помечен устаревшим', description: 'Чтобы править, верните его: панель ключа → «Вернуть»', color: 'warning' })
  return true
}

const startEdit = (initial?: string) => {
  const a = active.value
  if (!a || a.col === 0 || blockEdit()) return
  const row = props.rows[a.row]
  if (!row) return
  ensureVisible(a.row, a.col)
  editing.value = {
    key: row.technical_key,
    col: a.col,
    initial: initial ?? valueAt(a.row, a.col),
    previous: valueAt(a.row, a.col)
  }
}

const onCommit = (value: string, move: CommitMove) => {
  const e = editing.value
  if (!e) return
  editing.value = null
  emit('save', e.key, props.languages[e.col - 1]!, value, e.previous)

  if (move === 'blur') return
  const a = active.value
  if (a) {
    if (move === 'down') setActive(a.row + 1, a.col)
    else if (move === 'right') setActive(a.row, a.col + 1)
    else if (move === 'left') setActive(a.row, a.col - 1)
  }
  focusGrid()
}

const onCancel = () => {
  editing.value = null
  focusGrid()
}

const notifyCopied = (text: string) => {
  toast.add({ title: 'Скопировано', description: text.length > 80 ? `${text.slice(0, 80)}…` : text, duration: 1200 })
}

const copy = async (text: string) => {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    notifyCopied(text)
  } catch (err) {
    console.error(err)
  }
}

const onCellDown = (row: number, col: number) => {
  active.value = { row, col }
  focusGrid()
  const key = props.rows[row]?.technical_key
  if (col === 0 && key) emit('open', key)
}

const onCellDblclick = (row: number, col: number) => {
  active.value = { row, col }
  if (col === 0) copy(valueAt(row, 0))
  else startEdit()
}

const pageRows = () => Math.max(1, Math.floor((viewportH.value - HEADER_H) / ROW_H) - 1)

const onKeydown = (e: KeyboardEvent) => {
  if (editing.value || e.isComposing) return
  const mod = e.metaKey || e.ctrlKey

  if (!active.value) {
    if (e.key.startsWith('Arrow') || e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      setActive(0, 1)
    }
    return
  }

  const { row, col } = active.value
  const last = props.rows.length - 1
  const moves: Record<string, [number, number]> = {
    ArrowDown: [mod ? last : row + 1, col],
    ArrowUp: [mod ? 0 : row - 1, col],
    ArrowRight: [row, mod ? maxCol.value : col + 1],
    ArrowLeft: [row, mod ? 0 : col - 1],
    Tab: [row, e.shiftKey ? col - 1 : col + 1],
    PageDown: [row + pageRows(), col],
    PageUp: [row - pageRows(), col],
    Home: [mod ? 0 : row, 0],
    End: [mod ? last : row, maxCol.value]
  }
  const target = moves[e.key]
  const rowKey = props.rows[row]?.technical_key

  if (target) {
    setActive(...target)
  } else if ((e.key === 'Enter' || e.key === 'F2') && col === 0 && rowKey) {
    emit('open', rowKey)
  } else if (e.key === 'Enter' || e.key === 'F2') {
    startEdit()
  } else if (e.key === 'Escape') {
    active.value = null
    emit('escape')
  } else if ((e.key === 'Backspace' || e.key === 'Delete') && col > 0 && rowKey) {
    if (!blockEdit()) emit('save', rowKey, props.languages[col - 1]!, '', valueAt(row, col))
  } else if (mod && e.code === 'KeyZ' && e.shiftKey) {
    emit('redo')
  } else if (mod && e.code === 'KeyZ') {
    emit('undo')
  } else if (mod && e.code === 'KeyY') {
    emit('redo')
  } else if (!mod && !e.altKey && e.key.length === 1 && col > 0) {
    // Начали печатать — открываем редактор с этим символом, как в Google Sheets
    startEdit(e.key)
  } else {
    // ⌘C / ⌘V сюда не попадают специально — их ловят обработчики copy / paste ниже
    return
  }

  e.preventDefault()
}

// copy/paste слушаем на document: на фокусированном div без contenteditable браузеры шлют их в body
const gridFocused = () => !!scrollEl.value && document.activeElement === scrollEl.value

useEventListener(document, 'copy', (e: ClipboardEvent) => {
  if (!gridFocused() || !active.value) return
  const text = valueAt(active.value.row, active.value.col)
  e.clipboardData?.setData('text/plain', text)
  e.preventDefault()
  if (text) notifyCopied(text)
})

useEventListener(document, 'paste', (e: ClipboardEvent) => {
  if (!gridFocused() || !active.value || active.value.col === 0) return
  const row = props.rows[active.value.row]
  const text = e.clipboardData?.getData('text/plain')
  if (!row || text === undefined) return
  e.preventDefault()
  if (blockEdit()) return
  // Google Sheets / Excel добавляют перевод строки в конце скопированной ячейки
  const { row: index, col } = active.value
  emit('save', row.technical_key, props.languages[col - 1]!, text.replace(/\r?\n$/, ''), valueAt(index, col))
})

const reset = () => {
  active.value = null
  editing.value = null
  if (scrollEl.value) {
    scrollEl.value.scrollTop = 0
    scrollEl.value.scrollLeft = 0
  }
}

defineExpose({ reset })
</script>

<template>
  <div
    ref="scrollEl"
    tabindex="0"
    class="loc-grid relative flex-1 overflow-auto overscroll-none bg-white text-gray-900 outline-none"
    :style="{ '--loc-langs': languages.length }"
    @scroll.passive="onScroll"
    @keydown="onKeydown"
  >
    <!-- Шапка -->
    <div class="loc-row loc-header sticky top-0 z-20">
      <div class="loc-cell loc-sticky left-0 justify-center">
        <input
          type="checkbox"
          class="size-3.5 cursor-pointer accent-gray-900"
          :checked="allSelected"
          :indeterminate="selectedCount > 0 && !allSelected"
          :disabled="!rows.length"
          @change="emit('toggleAll', ($event.target as HTMLInputElement).checked)"
        >
      </div>
      <div class="loc-cell loc-sticky left-[40px] border-r border-gray-200 px-3">
        Ключ
      </div>
      <div
        v-for="lang in languages"
        :key="lang"
        class="loc-cell px-3"
      >
        {{ lang.toUpperCase() }}
      </div>
      <div class="loc-cell px-3">
        Создан
      </div>
      <div class="loc-cell px-3">
        Изменён
      </div>
    </div>

    <!-- Скелетон первой загрузки -->
    <template v-if="initialLoading">
      <div
        v-for="i in 20"
        :key="i"
        class="loc-row"
        :class="{ 'is-odd': i % 2 === 0 }"
      >
        <div class="loc-cell loc-sticky left-0" />
        <div class="loc-cell loc-sticky left-[40px] border-r border-gray-200 px-3">
          <div class="h-3 w-40 animate-pulse rounded bg-gray-200" />
        </div>
        <div
          v-for="lang in languages"
          :key="lang"
          class="loc-cell px-3"
        >
          <div class="h-2.5 w-full animate-pulse rounded bg-gray-100" />
        </div>
        <div class="loc-cell" />
        <div class="loc-cell" />
      </div>
    </template>

    <div
      v-else-if="!rows.length"
      class="sticky left-0 py-20 text-center text-sm text-gray-400"
      :style="{ width: `${viewportW}px` }"
    >
      {{ loading ? 'Загрузка…' : 'Ничего не найдено' }}
    </div>

    <template v-else>
      <div :style="{ height: `${windowRange.first * ROW_H}px` }" />

      <LocalizationsGridRow
        v-for="(row, i) in visibleRows"
        :key="row.technical_key"
        :row="row"
        :index="windowRange.first + i"
        :languages="languages"
        :active-col="active?.row === windowRange.first + i ? active.col : -1"
        :editing-col="editing?.key === row.technical_key ? editing.col : -1"
        :edit-initial="editing?.key === row.technical_key ? editing.initial : ''"
        :selected="selectedKeys.has(row.technical_key)"
        @cell-down="onCellDown"
        @cell-dblclick="onCellDblclick"
        @toggle="(key, value) => emit('toggle', key, value)"
        @commit="onCommit"
        @cancel="onCancel"
      />

      <div :style="{ height: `${(rows.length - windowRange.last) * ROW_H}px` }" />

      <div
        v-if="loading"
        class="sticky left-0 flex h-10 items-center justify-center"
        :style="{ width: `${viewportW}px` }"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-4 animate-spin text-gray-400"
        />
      </div>
    </template>
  </div>
</template>

<style>
.loc-grid {
  --loc-cols: 40px 260px repeat(var(--loc-langs), 220px) 110px 110px;
}

.loc-row {
  display: grid;
  grid-template-columns: var(--loc-cols);
  width: max-content;
  min-width: 100%;
  height: 36px;
  background: #fff;
}

.loc-row.is-odd {
  background: #f9fafb;
}

.loc-row:not(.loc-header):hover {
  background: #f3f4f6;
}

.loc-row.is-selected {
  background: #eff6ff;
}

.loc-header {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  text-transform: none;
}

.loc-header .loc-cell {
  border-bottom-color: #e5e7eb;
}

.loc-cell {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;
  height: 36px;
  border-bottom: 1px solid #f3f4f6;
  border-right: 1px solid #f3f4f6;
  user-select: none;
  cursor: default;
}

.loc-sticky {
  position: sticky;
  z-index: 10;
  background: inherit;
}

.loc-cell.is-active {
  box-shadow: inset 0 0 0 2px #3b82f6;
  z-index: 1;
}

.loc-sticky.is-active {
  z-index: 11;
}

.loc-grid:not(:focus-within) .loc-cell.is-active {
  box-shadow: inset 0 0 0 2px #93c5fd;
}

.loc-grid::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.loc-grid::-webkit-scrollbar-track {
  background: #f9fafb;
}

.loc-grid::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border: 2px solid #f9fafb;
  border-radius: 5px;
}

.loc-grid::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
</style>
