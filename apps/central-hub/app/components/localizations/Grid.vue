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
  // Кто из коллег что правит: ключ → язык → имена (метки на ячейках)
  editors?: Record<string, Record<string, string[]>>
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
  // На касании правка — в шторке страницы, а не в ячейке
  edit: [key: string, lang: string]
  // Какую ячейку человек сейчас правит (null — никакую): коллеги видят метку на ней
  editing: [cell: { key: string, lang: string } | null]
}>()

const toast = useToast()
const { touch } = useScreen()

const HEADER_H = 36
const CHECK_W = 40
const OVERSCAN = 10

const scrollEl = ref<HTMLElement>()
const scrollTop = ref(0)
const { width: viewportW, height: viewportH } = useElementSize(scrollEl)

// Высота строки и ширины колонок — из CSS-переменных грида (стили внизу): на телефоне колонки уже, на касании
// строки выше. CSS видит ширину и касание сразу, ещё до скриптов, а виртуализация берёт числа оттуда же
const sizes = reactive({ rowH: 36, keyW: 260, langW: 220 })
const readSizes = () => {
  if (!scrollEl.value) return
  const css = getComputedStyle(scrollEl.value)
  const px = (name: string, fallback: number) => Number.parseFloat(css.getPropertyValue(name)) || fallback
  sizes.rowH = px('--loc-row-h', 36)
  sizes.keyW = px('--loc-key-w', 260)
  sizes.langW = px('--loc-lang-w', 220)
}
onMounted(readSizes)
// Поменялась ширина — мог смениться брейкпоинт
watch([viewportW, touch], readSizes)

const onScroll = () => {
  scrollTop.value = scrollEl.value?.scrollTop ?? 0
}

// --- Виртуализация: рендерим только видимые строки ---
const windowRange = computed(() => {
  const first = Math.max(0, Math.floor(scrollTop.value / sizes.rowH) - OVERSCAN)
  const last = Math.min(props.rows.length, Math.ceil((scrollTop.value + viewportH.value) / sizes.rowH) + OVERSCAN)
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

// Ключи коллег появляются и пропадают на лету: курсор и прокрутка держатся за ключ, а не за номер строки.
// Синхронно, до наблюдателя ниже: иначе открытая панель успела бы перескочить на соседний ключ
watch(() => props.rows, (next, prev) => {
  if (!prev?.length || !next.length || next === prev) return
  const indexOf = (key: string | undefined) => (key ? next.findIndex(r => r.technical_key === key) : -1)
  const a = active.value
  const moved = a ? indexOf(prev[a.row]?.technical_key) : -1
  if (a && moved >= 0 && moved !== a.row) active.value = { row: moved, col: a.col }
  // Строку добавили или убрали выше видимой части — сдвигаем прокрутку на столько же, и таблица не дёргается
  const el = scrollEl.value
  if (!el) return
  const top = Math.floor(el.scrollTop / sizes.rowH)
  const from = indexOf(prev[top]?.technical_key)
  if (from >= 0 && from !== top) {
    nextTick(() => {
      el.scrollTop += (from - top) * sizes.rowH
    })
  }
}, { flush: 'sync' })

watch(editing, (e) => {
  emit('editing', e ? { key: e.key, lang: props.languages[e.col - 1]! } : null)
})

watch(() => props.rows[active.value?.row ?? -1]?.technical_key, (key) => {
  if (key) emit('focusRow', key)
})
const maxCol = computed(() => props.languages.length)

// Колонки: чекбокс, ключ, языки, даты. Собираем строкой, а не repeat(var(...)) в CSS:
// пока языки не загрузились, repeat(0, …) — недопустимое значение, и шапка разваливается в столбик
const columns = computed(() => [`${CHECK_W}px`, 'var(--loc-key-w)', ...props.languages.map(() => 'var(--loc-lang-w)'), '110px', '110px'].join(' '))

const valueAt = (row: number, col: number) => {
  const r = props.rows[row]
  if (!r) return ''
  return col === 0 ? r.technical_key : (r.translations?.[props.languages[col - 1]!] ?? '')
}

const focusGrid = () => scrollEl.value?.focus({ preventScroll: true })

const ensureVisible = (row: number, col: number) => {
  const el = scrollEl.value
  if (!el) return
  const { rowH, langW } = sizes
  const top = HEADER_H + row * rowH
  if (top < el.scrollTop + HEADER_H) el.scrollTop = top - HEADER_H
  else if (top + rowH > el.scrollTop + el.clientHeight) el.scrollTop = top + rowH - el.clientHeight

  if (col >= 1) {
    const sticky = CHECK_W + sizes.keyW
    const left = sticky + (col - 1) * langW
    if (left < el.scrollLeft + sticky) el.scrollLeft = left - sticky
    else if (left + langW > el.scrollLeft + el.clientWidth) el.scrollLeft = left + langW - el.clientWidth
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
  // Пальцем в узкой ячейке не попечатаешь — правка в шторке снизу
  if (touch.value) {
    emit('edit', row.technical_key, props.languages[a.col - 1]!)
    return
  }
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

const { copy, notifyCopied } = useCopy()

const onCellDown = (row: number, col: number, button = 0) => {
  // Пальцем: первый тап выделяет ячейку, второй — правка, как в таблицах на телефоне. Двойного тапа
  // для этого мало: в iOS он не всегда доходит как dblclick
  const again = touch.value && active.value?.row === row && active.value?.col === col
  active.value = { row, col }
  focusGrid()
  // Правая и средняя кнопки — только выбрать строку: правая открывает меню тегов, а не панель и правку
  if (button !== 0) return
  const key = props.rows[row]?.technical_key
  // Панель и правку — после нажатия целиком: сразу после mousedown браузер ставит фокус на грид, и только что
  // открытая шторка (панель уже 1280 px, правка на касании) приняла бы это за уход фокуса и закрылась
  if (col === 0 && key) setTimeout(() => emit('open', key))
  else if (again) setTimeout(startEdit)
}

const onCellDblclick = (row: number, col: number) => {
  active.value = { row, col }
  if (col === 0) copy(valueAt(row, 0))
  else startEdit()
}

const pageRows = () => Math.max(1, Math.floor((viewportH.value - HEADER_H) / sizes.rowH) - 1)

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
    class="loc-grid relative flex-1 overflow-auto overscroll-none bg-default text-highlighted outline-none"
    :style="{ '--loc-cols': columns }"
    @scroll.passive="onScroll"
    @keydown="onKeydown"
  >
    <!-- Шапка -->
    <div class="loc-row loc-header sticky top-0 z-20">
      <!-- Вся ячейка — label: пальцем в квадратик 14 px не попасть -->
      <label class="loc-cell loc-sticky left-0 justify-center">
        <input
          type="checkbox"
          class="size-3.5 cursor-pointer accent-gray-900"
          aria-label="Выделить все"
          :checked="allSelected"
          :indeterminate="selectedCount > 0 && !allSelected"
          :disabled="!rows.length"
          @change="emit('toggleAll', ($event.target as HTMLInputElement).checked)"
        >
      </label>
      <div class="loc-cell loc-sticky left-[40px] border-r border-default px-3">
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
        <div class="loc-cell loc-sticky left-[40px] border-r border-default px-3">
          <div class="h-3 w-40 animate-pulse rounded bg-accented" />
        </div>
        <div
          v-for="lang in languages"
          :key="lang"
          class="loc-cell px-3"
        >
          <div class="h-2.5 w-full animate-pulse rounded bg-elevated" />
        </div>
        <div class="loc-cell" />
        <div class="loc-cell" />
      </div>
    </template>

    <div
      v-else-if="!rows.length"
      class="sticky left-0 py-20 text-center text-sm text-muted"
      :style="{ width: `${viewportW}px` }"
    >
      {{ loading ? 'Загрузка…' : 'Ничего не найдено' }}
    </div>

    <template v-else>
      <div :style="{ height: `${windowRange.first * sizes.rowH}px` }" />

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
        :editors="editors?.[row.technical_key]"
        @cell-down="onCellDown"
        @cell-dblclick="onCellDblclick"
        @toggle="(key, value) => emit('toggle', key, value)"
        @commit="onCommit"
        @cancel="onCancel"
      />

      <div :style="{ height: `${(rows.length - windowRange.last) * sizes.rowH}px` }" />

      <div
        v-if="loading"
        class="sticky left-0 flex h-10 items-center justify-center"
        :style="{ width: `${viewportW}px` }"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-4 animate-spin text-muted"
        />
      </div>
    </template>
  </div>
</template>

<style>
/* Цвета грида: светлые — от смысловых токенов (серый фон темы, assets/css/main.css), тёмные — из нейтральной шкалы */
:root {
  --loc-bg: var(--ui-bg);
  --loc-bg-odd: color-mix(in oklab, var(--ui-color-neutral-200) 35%, var(--ui-bg));
  --loc-bg-hover: var(--ui-bg-elevated);
  --loc-bg-selected: color-mix(in oklab, #3b82f6 12%, var(--ui-bg));
  --loc-header-text: var(--ui-text-muted);
  --loc-header-line: var(--ui-border);
  --loc-line: var(--ui-border-muted);
  --loc-active: #3b82f6;
  --loc-active-blur: #93c5fd;
  --loc-scroll-track: var(--ui-bg);
  --loc-scroll-thumb: var(--ui-color-neutral-300);
  --loc-scroll-thumb-hover: var(--ui-color-neutral-400);
}

.dark {
  --loc-bg: var(--ui-bg);
  --loc-bg-odd: color-mix(in oklab, var(--ui-color-neutral-800) 40%, var(--ui-bg));
  --loc-bg-hover: var(--ui-color-neutral-800);
  --loc-bg-selected: color-mix(in oklab, #3b82f6 20%, var(--ui-bg));
  --loc-header-text: var(--ui-color-neutral-400);
  --loc-header-line: var(--ui-color-neutral-700);
  --loc-line: var(--ui-color-neutral-800);
  --loc-active: #3b82f6;
  --loc-active-blur: #1e40af;
  --loc-scroll-track: var(--ui-bg);
  --loc-scroll-thumb: var(--ui-color-neutral-700);
  --loc-scroll-thumb-hover: var(--ui-color-neutral-600);
}

/* Размеры грида; скрипт виртуализации читает их отсюда же */
.loc-grid {
  /* Строку коллеги выше видимой части компенсирует сам грид (наблюдатель rows): браузерная привязка прокрутки
     есть не везде (Safari), а в Chrome она сдвинула бы таблицу второй раз */
  overflow-anchor: none;
  --loc-row-h: 36px;
  --loc-key-w: 260px;
  --loc-lang-w: 220px;
  /* Без зума по двойному тапу в iOS: второй тап по ячейке — правка */
  touch-action: manipulation;
}

/* Пальцем — строка не ниже 44 px, иначе промахиваешься мимо строки */
@media (pointer: coarse) {
  .loc-grid {
    --loc-row-h: 44px;
  }
}

/* Телефон: ключ уже, чтобы рядом был виден хотя бы один язык */
@media (max-width: 639px) {
  .loc-grid {
    --loc-key-w: 150px;
    --loc-lang-w: 200px;
  }
}

.loc-row {
  display: grid;
  grid-template-columns: var(--loc-cols);
  width: max-content;
  min-width: 100%;
  height: var(--loc-row-h);
  background: var(--loc-bg);
}

.loc-row.is-odd {
  background: var(--loc-bg-odd);
}

/* Только для мыши: после тапа на телефоне подсветка «залипает» на строке */
@media (hover: hover) {
  .loc-row:not(.loc-header):hover {
    background: var(--loc-bg-hover);
  }
}

.loc-row.is-selected {
  background: var(--loc-bg-selected);
}

.loc-header {
  font-size: 11px;
  font-weight: 600;
  color: var(--loc-header-text);
  text-transform: none;
}

.loc-header .loc-cell {
  border-bottom-color: var(--loc-header-line);
}

/* Шапка всегда 36 px — её нажимают редко */
.loc-header,
.loc-header .loc-cell {
  height: 36px;
}

/* Ячейку правит коллега: рамка его цвета (outline — не спорит с рамкой своего курсора) и подпись в углу */
.loc-cell.has-presence {
  outline: 2px solid var(--presence);
  outline-offset: -2px;
}

.loc-presence {
  position: absolute;
  right: 2px;
  bottom: 2px;
  z-index: 1;
  max-width: calc(100% - 4px);
  overflow: hidden;
  border-radius: 4px;
  background: var(--presence);
  padding: 0 4px;
  color: #fff;
  font-size: 9px;
  font-weight: 600;
  line-height: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
  pointer-events: none;
}

/* Иконка тегов у ключа: приглушённая, при наведении на неё — подсказка с тегами */
.loc-tags-icon {
  display: flex;
  flex-shrink: 0;
  margin-left: auto;
  padding: 4px 0 4px 8px;
  color: var(--ui-text-dimmed);
}

.loc-tags-icon:hover {
  color: var(--ui-text-toned);
}

/* Метка тега в подсказке */
.loc-tag {
  border-radius: 4px;
  padding: 0 6px;
  font-size: 11px;
  font-weight: 500;
  line-height: 18px;
  background: var(--ui-bg-accented);
  color: var(--ui-text-toned);
}

.loc-cell {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;
  height: var(--loc-row-h);
  border-bottom: 1px solid var(--loc-line);
  border-right: 1px solid var(--loc-line);
  user-select: none;
  cursor: default;
}

/* Ячейка с чекбоксом нажимается целиком */
label.loc-cell {
  cursor: pointer;
}

.loc-sticky {
  position: sticky;
  z-index: 10;
  background: inherit;
}

.loc-cell.is-active {
  box-shadow: inset 0 0 0 2px var(--loc-active);
  z-index: 1;
}

.loc-sticky.is-active {
  z-index: 11;
}

.loc-grid:not(:focus-within) .loc-cell.is-active {
  box-shadow: inset 0 0 0 2px var(--loc-active-blur);
}

.loc-grid::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.loc-grid::-webkit-scrollbar-track {
  background: var(--loc-scroll-track);
}

.loc-grid::-webkit-scrollbar-thumb {
  background: var(--loc-scroll-thumb);
  border: 2px solid var(--loc-scroll-track);
  border-radius: 5px;
}

.loc-grid::-webkit-scrollbar-thumb:hover {
  background: var(--loc-scroll-thumb-hover);
}
</style>
