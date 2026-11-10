<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { createReusableTemplate } from '@vueuse/core'
import type { Localization } from '~/composables/useLocalizations'

definePageMeta({ title: 'Локализации' })

const toast = useToast()
const notifyError = useNotifyError()
// Узкий экран: дерево и панель ключа — шторками, правка на касании — в шторке снизу
const screen = useScreen()

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
  fetchAll,
  findRow,
  keysVersion
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
const clearSelection = () => {
  selectedKeys.value = new Set()
}

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
  clearSelection()
})

// --- Дерево разделов: от 1024 px колонкой слева (свёрнута или нет — помним в браузере), уже — шторкой ---
const treeOpen = useLocalStorage('hub.localizations.tree', true, { initOnMounted: true })
const treeDrawer = ref(false)
// Растёт, когда ключи появились или пропали (здесь или у коллег) — дерево перечитывает счётчики
const treeVersion = ref(0)
const treeShown = computed(() => screen.lg.value && treeOpen.value)
// Коллеги добавили ключи или пометили их устаревшими — счётчики разделов и список тегов тоже свежие
watch(keysVersion, () => {
  treeVersion.value++
  fetchTags()
})

const toggleTree = () => {
  if (screen.lg.value) treeOpen.value = !treeOpen.value
  else treeDrawer.value = true
}

// В шторке: папка с вложенными выбирается и раскрывается, а шторка остаётся — можно пойти глубже.
// Раздел без вложенных и «Все ключи» — выбор окончательный, шторка закрывается; иначе — кнопкой «Показать»
const selectSection = (prefix: string, done: boolean) => {
  filters.prefix = prefix
  if (done) treeDrawer.value = false
}

// Планшет повернули, и дереву хватает места колонкой — шторка не нужна
watch(screen.lg, (lg) => {
  if (lg) treeDrawer.value = false
})

// --- Панель ключа справа: ?key= в адресе, чтобы ссылкой можно было открыть конкретный ключ ---
const panelKey = ref<string | null>(null)
const panelRow = computed(() => (panelKey.value ? findRow(panelKey.value) : undefined))

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

// От 1280 px панель — колонкой справа, уже — шторкой поверх грида (на телефоне — на весь экран)
const panelSheetOpen = computed({
  get: () => !!panelKey.value && !screen.xl.value,
  set: (open) => {
    if (!open) closePanel()
  }
})
// Одна разметка панели на оба места
const [DefinePanel, ReusePanel] = createReusableTemplate<{ inSheet: boolean }>()
// Теги и счётчик — в тулбаре от 1280 px, уже — в строке фильтров: в тулбаре они наезжали на поиск и кнопки
const [DefineTags, ReuseTags] = createReusableTemplate<{ inFilters: boolean }>()

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

// Без подтверждения: действие обратимо — в тосте есть «Вернуть». В выборке «Ключ устарел» та же кнопка возвращает.
// Получилось — выделение снимается, дерево перечитывает счётчики
const deprecating = ref(false)

const withSelected = async (action: (keys: string[]) => Promise<boolean>) => {
  const keys = [...selectedKeys.value]
  if (!keys.length) return

  deprecating.value = true
  if (await action(keys)) {
    clearSelection()
    treeVersion.value++
  }
  deprecating.value = false
}

const deprecateSelected = () => withSelected(deprecateKeys)
const restoreSelected = () => withSelected(async (keys) => {
  await restoreKeys(keys)
  return true
})

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
    clearSelection()
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

// --- Очередь перевода: меню по языкам со счётчиком; хвост пункта — один шаблон на оба меню ---
const { queueItems, loadQueueCounts, queueCount } = useQueueMenu(toRef(filters, 'prefix'))
const [DefineQueueCount, ReuseQueueCount] = createReusableTemplate<{ item: unknown }>()

// --- Экспорт: ZIP — всё под текущими фильтрами, Figma — выборка разделов в отдельном окне ---
const figmaOpen = ref(false)
const exporting = ref(false)

const exportZip = async () => {
  exporting.value = true
  try {
    const all = await fetchAll()
    // Файл на язык: ключ → текст, пустая строка — перевода нет
    const files = Object.fromEntries(languageCodes.value.map(lang =>
      [`${lang}.json`, Object.fromEntries(all.map(row => [row.technical_key, row.translations?.[lang] ?? '']))]))
    await downloadJsonZip(files, 'localizations.zip')
    toast.add({ title: 'Экспорт ZIP завершён', color: 'success' })
  } catch (error) {
    toast.add({ title: 'Ошибка экспорта', description: (error as Error).message, color: 'error' })
  } finally {
    exporting.value = false
  }
}

// --- Меню «Ещё» уже 768 px: то, чему не хватило места в тулбаре ---
const moreItems = computed<DropdownMenuItem[][]>(() => [
  [{ label: 'Очередь перевода', icon: 'i-lucide-list-todo', children: queueItems.value }],
  [
    { label: 'Export ZIP', icon: 'i-lucide-download', disabled: exporting.value, onSelect: exportZip },
    { label: 'Export Figma', icon: 'i-lucide-figma', onSelect: () => { figmaOpen.value = true } }
  ]
])

const keysTotal = computed(() => (total.value === null ? '…' : keysCount(total.value)))

// --- Правка в шторке снизу: на касании вместо редактора в ячейке ---
const sheet = ref<{ key: string, lang: string, initial: string } | null>(null)
const sheetOpen = ref(false)
const sourceLang = computed(() => languages.value.find(l => l.is_source)?.code ?? 'en')
// Английский рядом с полем перевода; у самого английского — нет
const sheetSource = computed(() => {
  if (!sheet.value || sheet.value.lang === sourceLang.value) return undefined
  return findRow(sheet.value.key)?.translations?.[sourceLang.value] ?? ''
})

const openSheet = (key: string, lang: string) => {
  const row = findRow(key)
  // Ключа нет среди загруженных строк (панель открыта по ссылке) — сохранить правку было бы некуда
  if (!row) return
  sheet.value = { key, lang, initial: row.translations?.[lang] ?? '' }
  sheetOpen.value = true
}

const editFromPanel = (lang: string) => {
  if (panelKey.value) openSheet(panelKey.value, lang)
}

// Тем же путём, что и ячейка: отмена ⌘Z, проверка, не поправил ли текст коллега
const saveSheet = (value: string) => {
  if (sheet.value) setTranslation(sheet.value.key, sheet.value.lang, value, sheet.value.initial)
}

// --- Присутствие: коллеги видят, какую ячейку человек правит — в таблице или в шторке ---
const { editors } = usePresence()
const gridEditing = ref<{ key: string, lang: string } | null>(null)
usePresenceEditing(() => (sheetOpen.value && sheet.value ? { key: sheet.value.key, lang: sheet.value.lang } : gridEditing.value))
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden bg-default text-highlighted">
    <DefineQueueCount v-slot="{ item }">
      <span class="text-xs tabular-nums text-muted">
        {{ queueCount(item) }}
      </span>
    </DefineQueueCount>

    <DefineTags v-slot="{ inFilters }">
      <USelectMenu
        v-model="selectedTags"
        :items="availableTags"
        multiple
        placeholder="Все теги"
        :search-input="{ placeholder: 'Найти тег…' }"
        :size="inFilters ? 'sm' : 'md'"
        :class="inFilters ? 'w-40 xl:hidden' : 'hidden w-48 shrink-0 xl:inline-flex'"
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
    </DefineTags>

    <DefinePanel v-slot="{ inSheet }">
      <LocalizationsKeyPanel
        v-if="panelKey"
        :class="inSheet ? 'h-full w-full' : 'w-[380px] border-l border-default'"
        :technical-key="panelKey"
        :languages="languageCodes"
        :row="panelRow"
        :editable="screen.touch.value && !!panelRow && !filters.deprecated"
        @close="closePanel"
        @deprecate="deprecateFromPanel"
        @restored="onRestored"
        @changed="fetchTags"
        @edit="editFromPanel"
      />
    </DefinePanel>

    <div class="flex shrink-0 items-center justify-between gap-2 border-b border-default px-3 py-2 md:gap-4 md:p-4">
      <div class="flex w-full min-w-0 max-w-2xl items-center gap-2 md:gap-3">
        <UButton
          :icon="treeShown ? 'i-lucide-panel-left-close' : 'i-lucide-panel-left-open'"
          color="neutral"
          variant="ghost"
          :aria-label="treeShown ? 'Скрыть разделы' : 'Показать разделы'"
          @click="toggleTree"
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
        <ReuseTags :in-filters="false" />
      </div>

      <div class="flex shrink-0 items-center gap-2 whitespace-nowrap md:gap-3">
        <!-- Уже 1280 px — в строке фильтров, вместе с тегами -->
        <span class="hidden whitespace-nowrap text-xs text-muted xl:inline">
          {{ keysTotal }}
        </span>

        <!-- Уже 768 px очередь и экспорты уходят в меню «Ещё» -->
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
            class="hidden md:inline-flex"
          >
            <span class="max-[1365px]:sr-only">Очередь перевода</span>
          </UButton>
          <template #queue-trailing="{ item }">
            <ReuseQueueCount :item="item" />
          </template>
        </UDropdownMenu>

        <!-- Иначе поиск и теги наезжают на кнопки: уже 1536px у экспортов только значки,
             уже 1366px — и у очереди; подпись остаётся в подсказке и для скринридеров -->
        <UButton
          icon="i-lucide-download"
          color="neutral"
          variant="soft"
          title="Export ZIP"
          class="hidden md:inline-flex"
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
          class="hidden md:inline-flex"
          @click="figmaOpen = true"
        >
          <span class="max-[1535px]:sr-only">Export Figma</span>
        </UButton>

        <LocalizationsExportButton @click="projectsOpen = true" />

        <UButton
          icon="i-lucide-plus"
          title="Новый ключ"
          @click="creating = true"
        >
          <span class="max-sm:sr-only">Новый ключ</span>
        </UButton>

        <UDropdownMenu
          :items="moreItems"
          :content="{ align: 'end' }"
          @update:open="loadQueueCounts"
        >
          <UButton
            icon="i-lucide-ellipsis"
            color="neutral"
            variant="soft"
            class="md:hidden"
            aria-label="Ещё"
          />
          <template #queue-trailing="{ item }">
            <ReuseQueueCount :item="item" />
          </template>
        </UDropdownMenu>
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
    >
      <template #leading>
        <ReuseTags :in-filters="true" />
      </template>
      <template #trailing>
        <span class="whitespace-nowrap px-1 text-xs text-muted xl:hidden">{{ keysTotal }}</span>
      </template>
    </LocalizationsFilters>

    <div class="relative flex min-h-0 flex-1">
      <LocalizationsSelectionBar
        v-if="selectedKeys.size"
        :count="selectedKeys.size"
        :to-approve="keysToApprove.length"
        :deprecated-view="filters.deprecated"
        :approving="approving"
        :deprecating="deprecating"
        @approve="approveSelected"
        @deprecate="deprecateSelected"
        @restore="restoreSelected"
        @clear="clearSelection"
      />

      <!-- Колонки дерева и панели — от 1024 и 1280 px. Классы прячут их уже и в HTML с сервера, до скриптов -->
      <div
        v-if="treeShown"
        class="hidden lg:flex"
      >
        <LocalizationsKeyTree
          class="w-60 border-r border-default"
          :prefix="filters.prefix"
          :version="treeVersion"
          @select="filters.prefix = $event"
        />
      </div>

      <LocalizationsGrid
        ref="grid"
        :rows="rows"
        :languages="languageCodes"
        :selected-keys="selectedKeys"
        :loading="loading"
        :initial-loading="initialLoading"
        :has-more="hasMore"
        :readonly="filters.deprecated"
        :editors="editors"
        @load-more="load()"
        @save="setTranslation"
        @toggle="toggleRow"
        @toggle-all="toggleAll"
        @undo="undo"
        @redo="redo"
        @open="openPanel"
        @focus-row="focusedKey = $event"
        @escape="closePanel"
        @edit="openSheet"
        @editing="gridEditing = $event"
      />

      <div
        v-if="panelKey && screen.xl.value"
        class="hidden xl:flex"
      >
        <ReusePanel :in-sheet="false" />
      </div>
    </div>

    <USlideover
      v-model:open="treeDrawer"
      side="left"
      title="Разделы"
      :ui="{ content: 'max-w-xs' }"
    >
      <template #content>
        <div class="flex h-full flex-col">
          <LocalizationsKeyTree
            class="min-h-0 w-full flex-1"
            drawer
            :prefix="filters.prefix"
            :version="treeVersion"
            @select="selectSection"
          />
          <!-- Закрыть на любом уровне; число — сколько ключей в выбранном разделе, видно ещё до закрытия -->
          <div class="border-t border-default p-3">
            <UButton
              block
              size="lg"
              @click="treeDrawer = false"
            >
              Показать {{ keysTotal }}
            </UButton>
          </div>
        </div>
      </template>
    </USlideover>

    <USlideover
      v-model:open="panelSheetOpen"
      side="right"
      title="Ключ"
    >
      <template #content>
        <ReusePanel :in-sheet="true" />
      </template>
    </USlideover>

    <LocalizationsEditSheet
      v-if="sheet"
      v-model:open="sheetOpen"
      :technical-key="sheet.key"
      :lang="sheet.lang"
      :initial="sheet.initial"
      :source="sheetSource"
      @save="saveSheet"
    />

    <!-- Одна строка: что не влезло, прячется, а не переносится -->
    <AppHotkeys class="overflow-hidden whitespace-nowrap">
      <span><kbd>↑↓←→</kbd> навигация</span>
      <span><kbd>Enter</kbd> / печатай — правка · <kbd>Shift+Enter</kbd> перенос · <kbd>Esc</kbd> отмена</span>
      <span><kbd>⌘C</kbd> / <kbd>⌘V</kbd> · <kbd>Del</kbd> очистить · <kbd>⌘Z</kbd> отменить</span>
      <span><kbd>Enter</kbd> на ключе — панель</span>
      <span class="ml-auto"><kbd>Ctrl+K</kbd> поиск и команды</span>
    </AppHotkeys>
  </div>
</template>
