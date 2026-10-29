<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import JSZip from 'jszip'

definePageMeta({ title: 'Локализации' })

const toast = useToast()

const {
  languages,
  languageCodes,
  registry,
  loadRegistry,
  rows,
  total,
  loading,
  initialLoading,
  hasMore,
  q,
  selectedTags,
  availableTags,
  tagsState,
  fetchTags,
  filters,
  filtersKey,
  hasFilters,
  resetFilters,
  load,
  reload,
  setTranslation,
  undo,
  redo,
  deprecateKeys,
  restoreKeys,
  fetchAll
} = useLocalizations()

const route = useRoute()
const router = useRouter()
const grid = useTemplateRef('grid')

// --- Выделение строк ---
const selectedKeys = ref(new Set<string>())

const toggleRow = (key: string, value: boolean) => {
  const next = new Set(selectedKeys.value)
  if (value) next.add(key)
  else next.delete(key)
  selectedKeys.value = next
}

const toggleAll = (value: boolean) => {
  selectedKeys.value = value ? new Set(rows.value.map(r => r.technical_key)) : new Set()
}

// Новый поиск / фильтр — в начало таблицы, выделение сбрасываем
watch([q, filtersKey], () => {
  grid.value?.reset()
  selectedKeys.value = new Set()
})

// --- Дерево разделов слева; свёрнуто или нет — помним в браузере ---
const treeOpen = useLocalStorage('hub.localizations.tree', true, { initOnMounted: true })
// Растёт после создания ключа — дерево перечитывает счётчики
const treeVersion = ref(0)

// --- Панель ключа справа: ?key= в адресе, чтобы ссылкой можно было открыть конкретный ключ ---
const panelKey = ref<string | null>(null)
const panelRow = computed(() => rows.value.find(r => r.technical_key === panelKey.value))

const setKeyParam = (key: string | null) => {
  const query = { ...route.query }
  if (key) query.key = key
  else delete query.key
  if (query.key !== route.query.key) router.replace({ query })
}
// Стрелками по гриду ключ меняется часто — адрес обновляем с паузой
const setKeyParamLater = useDebounceFn((key: string) => {
  // За паузу панель могли закрыть — тогда ключ в адрес не возвращаем
  if (panelKey.value === key) setKeyParam(key)
}, 400)

const openPanel = (key: string) => {
  panelKey.value = key
  setKeyParam(key)
}

const closePanel = () => {
  panelKey.value = null
  setKeyParam(null)
}

// Открытая панель следует за активной строкой
const focusedKey = ref<string | null>(null)
watchDebounced(focusedKey, (key) => {
  if (key && panelKey.value && key !== panelKey.value) {
    panelKey.value = key
    setKeyParamLater(key)
  }
}, { debounce: 150 })

// --- Новый ключ: после создания показываем его поиском и в панели ---
const creating = ref(false)

const onKeyCreated = (key: string) => {
  q.value = key
  treeVersion.value++
  openPanel(key)
}

// Имя нового ключа уже занято — показываем существующий
const showExisting = (key: string) => {
  q.value = key
  openPanel(key)
}

// Адрес поменяли снаружи (⌘K, ссылка): ?new=1 открывает форму ключа, ?key= — панель
watch(() => [route.query.new, route.query.key], ([isNew, key]) => {
  if (isNew === '1') {
    creating.value = true
    const query = { ...route.query }
    delete query.new
    router.replace({ query })
  }
  if (typeof key === 'string' && key && key !== panelKey.value) panelKey.value = key
}, { immediate: true })

const onRestored = () => {
  reload()
  treeVersion.value++
}

const deprecateFromPanel = async (key: string) => {
  if (await deprecateKeys([key])) {
    closePanel()
    treeVersion.value++
  }
}

// Без подтверждения: действие обратимо — в тосте есть «Вернуть»
const deprecating = ref(false)

const deprecateSelected = async () => {
  const keys = [...selectedKeys.value]
  if (!keys.length) return

  deprecating.value = true
  if (await deprecateKeys(keys)) {
    selectedKeys.value = new Set()
    treeVersion.value++
  }
  deprecating.value = false
}

// В выборке «Ключ устарел» та же кнопка возвращает выделенные ключи
const restoreSelected = async () => {
  const keys = [...selectedKeys.value]
  if (!keys.length) return

  deprecating.value = true
  await restoreKeys(keys)
  selectedKeys.value = new Set()
  treeVersion.value++
  deprecating.value = false
}

// --- Очередь перевода: меню по языкам; сколько строк ждёт, считаем при открытии — с учётом раздела ---
const queueCounts = ref<Record<string, number> | null>(null)

const loadQueueCounts = async (open: boolean) => {
  if (!open) return
  queueCounts.value = null
  try {
    const counts = await $fetch<{ lang: string, missing: number, stale: number }[]>('/api/queue/counts', {
      query: { prefix: filters.prefix || undefined }
    })
    queueCounts.value = Object.fromEntries(counts.map(c => [c.lang, c.missing + c.stale]))
  } catch (error) {
    console.error(error)
    queueCounts.value = {}
  }
}

const queueItems = computed<DropdownMenuItem[][]>(() => [
  [{ type: 'label', label: filters.prefix ? `Раздел ${filters.prefix}` : 'Все ключи' }],
  languages.value.filter(l => !l.is_source).map(l => ({
    label: `${l.code.toUpperCase()} — ${l.name}`,
    count: queueCounts.value ? (queueCounts.value[l.code] ?? 0) : undefined,
    onSelect: () => {
      navigateTo({ path: '/localizations/queue', query: { lang: l.code, ...(filters.prefix ? { prefix: filters.prefix } : {}) } })
    }
  }))
])

// --- Экспорт: ZIP — всё под текущими фильтрами, Figma — выборка разделов в отдельном окне ---
const figmaOpen = ref(false)
const exporting = ref(false)

const exportZip = async () => {
  exporting.value = true
  try {
    const all = await fetchAll()
    const zip = new JSZip()
    for (const lang of languageCodes.value) {
      const file: Record<string, string> = {}
      for (const row of all) file[row.technical_key] = row.translations?.[lang] ?? ''
      zip.file(`${lang}.json`, JSON.stringify(file, null, 2))
    }
    downloadBlob(await zip.generateAsync({ type: 'blob' }), 'localizations.zip')
    toast.add({ title: 'Экспорт ZIP завершён', color: 'success' })
  } catch (error) {
    toast.add({ title: 'Ошибка экспорта', description: (error as Error).message, color: 'error' })
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="flex h-[calc(100dvh-64px)] flex-col overflow-hidden bg-white text-gray-900">
    <div class="flex shrink-0 items-center justify-between gap-4 border-b border-gray-200 p-4">
      <div class="flex w-full min-w-0 max-w-2xl items-center gap-3">
        <UButton
          :icon="treeOpen ? 'i-lucide-panel-left-close' : 'i-lucide-panel-left-open'"
          color="neutral"
          variant="ghost"
          :aria-label="treeOpen ? 'Скрыть разделы' : 'Показать разделы'"
          @click="treeOpen = !treeOpen"
        />
        <UInput
          v-model="q"
          icon="i-lucide-search"
          placeholder="Поиск по ключу или тексту…"
          class="w-full min-w-32 max-w-sm"
        />
        <USelectMenu
          v-model="selectedTags"
          :items="availableTags"
          multiple
          placeholder="Все теги"
          :search-input="{ placeholder: 'Найти тег…' }"
          class="w-48 shrink-0"
        >
          <template #empty="{ searchTerm }">
            <p class="text-center text-sm text-gray-500">
              <template v-if="searchTerm">
                Тега «{{ searchTerm }}» нет
              </template>
              <template v-else-if="tagsState === 'loading'">
                Загружаю теги…
              </template>
              <template v-else-if="tagsState === 'error'">
                Теги не загрузились — обновите страницу
              </template>
              <template v-else>
                Тегов нет
              </template>
            </p>
          </template>
        </USelectMenu>
      </div>

      <div class="flex shrink-0 items-center gap-3 whitespace-nowrap">
        <UButton
          v-if="selectedKeys.size && filters.deprecated"
          icon="i-lucide-archive-restore"
          color="warning"
          variant="soft"
          :loading="deprecating"
          @click="restoreSelected"
        >
          Вернуть ({{ selectedKeys.size }})
        </UButton>
        <UButton
          v-else-if="selectedKeys.size"
          icon="i-lucide-archive"
          color="warning"
          variant="soft"
          :loading="deprecating"
          @click="deprecateSelected"
        >
          Пометить устаревшими ({{ selectedKeys.size }})
        </UButton>

        <span class="whitespace-nowrap text-xs text-gray-400">
          {{ total === null ? '…' : `${total} ${plural(total, ['ключ', 'ключа', 'ключей'])}` }}
        </span>

        <UDropdownMenu
          :items="queueItems"
          :content="{ align: 'end' }"
          @update:open="loadQueueCounts"
        >
          <UButton
            icon="i-lucide-list-todo"
            color="neutral"
            variant="soft"
          >
            Очередь перевода
          </UButton>
          <template #item-trailing="{ item }">
            <span
              v-if="item.type !== 'label'"
              class="text-xs tabular-nums text-gray-400"
            >
              {{ item.count === undefined ? '…' : item.count || '✓' }}
            </span>
          </template>
        </UDropdownMenu>

        <UButton
          icon="i-lucide-figma"
          color="neutral"
          variant="soft"
          @click="figmaOpen = true"
        >
          Export Figma
        </UButton>

        <UButton
          icon="i-lucide-download"
          color="neutral"
          :loading="exporting"
          :disabled="exporting"
          @click="exportZip"
        >
          Export ZIP
        </UButton>

        <UButton
          icon="i-lucide-plus"
          @click="creating = true"
        >
          Новый ключ
        </UButton>
      </div>
    </div>

    <LocalizationsFigmaExport
      v-model:open="figmaOpen"
      :prefix="filters.prefix"
      :languages="languageCodes"
    />

    <LocalizationsCreateKey
      v-model:open="creating"
      :registry="registry"
      :languages="languageCodes"
      @created="onKeyCreated"
      @open="showExisting"
      @registry-changed="loadRegistry"
    />

    <LocalizationsFilters
      v-model:status="filters.status"
      v-model:stale="filters.stale"
      v-model:missing="filters.missing"
      v-model:recent="filters.recent"
      v-model:prefix="filters.prefix"
      v-model:deprecated="filters.deprecated"
      :languages="languageCodes"
      :has-filters="hasFilters"
      @reset="resetFilters"
    />

    <div class="flex min-h-0 flex-1">
      <LocalizationsKeyTree
        v-if="treeOpen"
        :prefix="filters.prefix"
        :version="treeVersion"
        @select="filters.prefix = $event"
      />

      <LocalizationsGrid
        ref="grid"
        :rows="rows"
        :languages="languageCodes"
        :selected-keys="selectedKeys"
        :loading="loading"
        :initial-loading="initialLoading"
        :has-more="hasMore"
        :readonly="filters.deprecated"
        @load-more="load()"
        @save="setTranslation"
        @toggle="toggleRow"
        @toggle-all="toggleAll"
        @undo="undo"
        @redo="redo"
        @open="openPanel"
        @focus-row="focusedKey = $event"
        @escape="closePanel"
      />

      <LocalizationsKeyPanel
        v-if="panelKey"
        :technical-key="panelKey"
        :languages="languageCodes"
        :row="panelRow"
        @close="closePanel"
        @deprecate="deprecateFromPanel"
        @restored="onRestored"
        @changed="fetchTags"
      />
    </div>

    <!-- Одна строка: что не влезло, прячется, а не переносится -->
    <div class="flex shrink-0 items-center gap-4 overflow-hidden whitespace-nowrap border-t border-gray-200 px-4 py-1.5 text-[11px] text-gray-400">
      <span><kbd>↑↓←→</kbd> навигация</span>
      <span><kbd>Enter</kbd> / печатай — правка · <kbd>Shift+Enter</kbd> перенос · <kbd>Esc</kbd> отмена</span>
      <span><kbd>⌘C</kbd> / <kbd>⌘V</kbd> · <kbd>Del</kbd> очистить · <kbd>⌘Z</kbd> отменить</span>
      <span><kbd>Enter</kbd> на ключе — панель</span>
      <span class="ml-auto"><kbd>Ctrl+K</kbd> поиск и команды</span>
    </div>
  </div>
</template>

<style scoped>
kbd {
  font-family: inherit;
  padding: 0 4px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background: #f9fafb;
  color: #6b7280;
}
</style>
