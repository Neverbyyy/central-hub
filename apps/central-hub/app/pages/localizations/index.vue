<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Localization } from '~/composables/useLocalizations'

definePageMeta({ title: 'Локализации' })

const toast = useToast()
const notifyError = useNotifyError()

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
const searchInput = useTemplateRef('searchInput')

// Крестик в поиске: стереть запрос и остаться в поле
const clearSearch = () => {
  q.value = ''
  searchInput.value?.inputRef?.focus()
}

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

// --- Новый ключ: после создания показываем его раздел поиском, а сам ключ — в панели ---
const creating = ref(false)

const onKeyCreated = (key: string) => {
  // Весь раздел, а не один ключ: app.farm.banner.title_1 → app.farm.banner. — видно и соседей, title, title_2…
  // Точка в конце — чтобы не цеплять app.farm.banner_promo
  const section = `${key.slice(0, key.lastIndexOf('.'))}.`
  // Второй ключ подряд в том же разделе: поиск не меняется, и сам грид бы не перечитался
  if (q.value === section) reload()
  else q.value = section
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

// Выделенные ключи целиком: все языки с текстом становятся утверждёнными и уходят в выгрузку в проекты
const approving = ref(false)

// Есть что утверждать хотя бы на одном языке — то же правило, что в панели ключа и на сервере
const canApprove = (row: Localization) => Object.keys(row.translations ?? {}).some(lang => canApproveLang(row, lang))

// Статусы строк приходят в реальном времени — кнопка сама прячется, если всё выделенное утвердили
const keysToApprove = computed(() => rows.value
  .filter(row => selectedKeys.value.has(row.technical_key) && canApprove(row))
  .map(row => row.technical_key))

const approveSelected = async () => {
  const keys = keysToApprove.value
  if (!keys.length) return

  approving.value = true
  try {
    const { count } = await $fetch<{ count: number }>('/api/keys/approve', { method: 'POST', body: { keys } })
    toast.add(count
      ? { title: `Утверждено: ${count} ${plural(count, ['перевод', 'перевода', 'переводов'])}`, color: 'success' }
      : { title: 'Всё выделенное уже утверждено', color: 'neutral' })
    selectedKeys.value = new Set()
  } catch (error) {
    await notifyError('Не утвердилось', error)
  } finally {
    approving.value = false
  }
}

// --- «Выгрузить в код»: PR с утверждёнными текстами в репозитории InApp и Pages Hub ---
const projectsOpen = ref(false)

// Строка из окна изменений: путь в файле проекта входит в ключ сервиса — ищем его без фильтров
const findKey = (key: string) => {
  resetFilters()
  q.value = key
}

// «Ждут утверждения → Показать»: черновики и тексты от ИИ вместе, без других фильтров — как в счётчике
const showPending = () => {
  resetFilters()
  filters.status = 'pending'
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
    // JSZip — только по нажатию: ~150 КБ не грузятся вместе со страницей
    const { default: JSZip } = await import('jszip')
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
  <div class="flex h-[calc(100dvh-64px)] flex-col overflow-hidden bg-default text-highlighted">
    <div class="flex shrink-0 items-center justify-between gap-4 border-b border-default p-4">
      <div class="flex w-full min-w-0 max-w-2xl items-center gap-3">
        <UButton
          :icon="treeOpen ? 'i-lucide-panel-left-close' : 'i-lucide-panel-left-open'"
          color="neutral"
          variant="ghost"
          :aria-label="treeOpen ? 'Скрыть разделы' : 'Показать разделы'"
          @click="treeOpen = !treeOpen"
        />
        <UInput
          ref="searchInput"
          v-model="q"
          icon="i-lucide-search"
          placeholder="Поиск по ключу или тексту…"
          class="w-full min-w-32 max-w-sm"
          :ui="{ trailing: 'pe-1' }"
        >
          <template
            v-if="q"
            #trailing
          >
            <!-- Тот же крестик, что у раздела в фильтрах. mousedown.prevent: фокус остаётся в поле -->
            <button
              type="button"
              class="rounded p-1 text-muted hover:text-default"
              aria-label="Очистить поиск"
              title="Очистить поиск"
              @mousedown.prevent
              @click="clearSearch"
            >
              <UIcon
                name="i-lucide-x"
                class="size-3"
              />
            </button>
          </template>
        </UInput>
        <USelectMenu
          v-model="selectedTags"
          :items="availableTags"
          multiple
          placeholder="Все теги"
          :search-input="{ placeholder: 'Найти тег…' }"
          class="w-48 shrink-0"
        >
          <template #empty="{ searchTerm }">
            <p class="text-center text-sm text-muted">
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
        <span class="whitespace-nowrap text-xs text-muted">
          {{ total === null ? '…' : keysCount(total) }}
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
            title="Очередь перевода"
          >
            <span class="max-[1365px]:sr-only">Очередь перевода</span>
          </UButton>
          <template #item-trailing="{ item }">
            <span
              v-if="item.type !== 'label'"
              class="text-xs tabular-nums text-muted"
            >
              {{ item.count === undefined ? '…' : item.count || '✓' }}
            </span>
          </template>
        </UDropdownMenu>

        <!-- Иначе поиск и теги наезжают на кнопки: уже 1536px у экспортов только значки,
             уже 1366px — и у очереди; подпись остаётся в подсказке и для скринридеров -->
        <UButton
          icon="i-lucide-download"
          color="neutral"
          variant="soft"
          title="Export ZIP"
          :loading="exporting"
          :disabled="exporting"
          @click="exportZip"
        >
          <span class="max-[1535px]:sr-only">Export ZIP</span>
        </UButton>

        <UButton
          icon="i-lucide-figma"
          color="neutral"
          variant="soft"
          title="Export Figma"
          @click="figmaOpen = true"
        >
          <span class="max-[1535px]:sr-only">Export Figma</span>
        </UButton>

        <!-- Главное действие сервиса — выделено -->
        <UButton
          icon="i-lucide-git-pull-request"
          color="neutral"
          @click="projectsOpen = true"
        >
          Выгрузить в код
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

    <LocalizationsProjectExport
      v-model:open="projectsOpen"
      @show-pending="showPending"
      @find-key="findKey"
    />

    <LocalizationsCreateKey
      v-model:open="creating"
      :registry="registry"
      :languages="languageCodes"
      :prefix="filters.prefix"
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

    <div class="relative flex min-h-0 flex-1">
      <!-- Действия с выделенными строками — плашкой над гридом: в шапке им не хватает места -->
      <div
        v-if="selectedKeys.size"
        class="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center"
      >
        <div class="pointer-events-auto flex items-center gap-2 whitespace-nowrap rounded-xl border border-default bg-default py-1.5 pl-4 pr-1.5 shadow-lg">
          <span class="mr-1 text-sm text-toned">
            Выбрано: {{ keysCount(selectedKeys.size) }}
          </span>
          <UButton
            v-if="filters.deprecated"
            icon="i-lucide-archive-restore"
            color="warning"
            variant="soft"
            :loading="deprecating"
            @click="restoreSelected"
          >
            Вернуть
          </UButton>
          <template v-else>
            <!-- Нечего утверждать — кнопки нет. Число — только если утверждать нужно не все выделенные: «Выбрано: 5 · Утвердить (2)» -->
            <UButton
              v-if="keysToApprove.length"
              icon="i-lucide-check-check"
              color="success"
              variant="soft"
              :loading="approving"
              :disabled="deprecating"
              @click="approveSelected"
            >
              Утвердить<template v-if="keysToApprove.length !== selectedKeys.size">
                ({{ keysToApprove.length }})
              </template>
            </UButton>
            <UButton
              icon="i-lucide-archive"
              color="warning"
              variant="soft"
              :loading="deprecating"
              :disabled="approving"
              @click="deprecateSelected"
            >
              Пометить устаревшими
            </UButton>
          </template>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            aria-label="Снять выделение"
            @click="selectedKeys = new Set()"
          />
        </div>
      </div>

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
    <div class="hotkeys flex shrink-0 items-center gap-4 overflow-hidden whitespace-nowrap border-t border-default px-4 py-1.5 text-[11px] text-muted">
      <span><kbd>↑↓←→</kbd> навигация</span>
      <span><kbd>Enter</kbd> / печатай — правка · <kbd>Shift+Enter</kbd> перенос · <kbd>Esc</kbd> отмена</span>
      <span><kbd>⌘C</kbd> / <kbd>⌘V</kbd> · <kbd>Del</kbd> очистить · <kbd>⌘Z</kbd> отменить</span>
      <span><kbd>Enter</kbd> на ключе — панель</span>
      <span class="ml-auto"><kbd>Ctrl+K</kbd> поиск и команды</span>
    </div>
  </div>
</template>
