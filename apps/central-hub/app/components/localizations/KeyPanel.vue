<script setup lang="ts">
import { createReusableTemplate } from '@vueuse/core'
import type { Localization, TranslationStatus } from '~/composables/useLocalizations'

// Панель ключа справа. Не модальная: грид остаётся под клавиатурой, панель следует за активной строкой.
const props = defineProps<{
  technicalKey: string
  languages: string[]
  // Строка из грида: по её updated_at панель понимает, что ключ поменяли, и перечитывает себя
  row?: Localization
}>()

const emit = defineEmits<{
  close: []
  deprecate: [key: string]
  // Ключ вернули из устаревших — таблице и дереву пора перечитаться
  restored: [key: string]
  // Поменялись свойства ключа — у страницы мог поменяться список тегов
  changed: [key: string]
}>()

interface KeyDetails extends Localization {
  description: string | null
  tags: string[]
  max_length: number | null
  figma_url: string | null
  legacy_path: string[] | null
  // Последний утверждённый текст по языкам — он и уходит в код проектов
  approved: Record<string, string | null>
  created_by: string | null
  updated_by: string | null
}

interface HistoryEntry {
  lang: string | null
  field: string
  old_value: string | null
  new_value: string | null
}

// Одно действие — одна правка: импорт 9 языков или «Утвердить всё» приходят одной записью
interface HistoryAction {
  id: number
  created_at: string
  actor: string | null
  source: string
  entries: HistoryEntry[]
}

interface HistoryPage {
  total: number
  actions: HistoryAction[]
}

const HISTORY_FIRST = 10
const HISTORY_MORE = 20

const supabase = useSupabaseClient()
const toast = useToast()
const authRedirect = useAuthRedirect()

const details = ref<KeyDetails | null>(null)
const history = ref<HistoryAction[]>([])
const historyTotal = ref(0)
const loadingMore = ref(false)
const loading = ref(false)
const approving = ref<string | null>(null)

// Ответы на запросы по прошлому ключу выбрасываем — панель могла уже переключиться
let generation = 0

const fetchHistory = (key: string, offset: number, limit: number) =>
  $fetch<HistoryPage>('/api/keys/history', { query: { key, offset, limit } })

// reset — другой ключ: история снова с последних 10. Иначе перечитываем столько, сколько уже показано
const load = async (reset = false) => {
  const key = props.technicalKey
  const gen = ++generation
  loading.value = true
  const limit = reset ? HISTORY_FIRST : Math.max(HISTORY_FIRST, history.value.length)
  const [row, log] = await Promise.all([
    supabase
      .from('localizations')
      .select('technical_key, translations, status, based_on, source_rev, stale_langs, deprecated_at, created_at, updated_at, description, tags, max_length, figma_url, legacy_path, approved, created_by, updated_by')
      .eq('technical_key', key)
      .maybeSingle(),
    fetchHistory(key, 0, limit).catch(() => ({ total: 0, actions: [] }) as HistoryPage)
  ])
  if (gen !== generation) return
  loading.value = false
  if (row.error) {
    toast.add({ title: 'Ключ не загрузился', description: row.error.message, color: 'error' })
    return
  }
  details.value = row.data as KeyDetails | null
  history.value = log.actions
  historyTotal.value = log.total
  if (reset) openActions.value = new Set()
}

watch(() => props.technicalKey, () => load(true), { immediate: true })

// «Вся история» и «Показать ещё» — следующие порции действий
const loadMoreHistory = async () => {
  const key = props.technicalKey
  const gen = generation
  loadingMore.value = true
  try {
    const page = await fetchHistory(key, history.value.length, HISTORY_MORE)
    if (gen !== generation) return
    const seen = new Set(history.value.map(a => a.id))
    history.value = [...history.value, ...page.actions.filter(a => !seen.has(a.id))]
    historyTotal.value = page.total
  } catch (error) {
    if (!(await authRedirect(error))) toast.add({ title: 'История не загрузилась', description: errorMessage(error), color: 'error' })
  } finally {
    loadingMore.value = false
  }
}

// --- Правка свойств: описание, теги, лимит, ссылка на Figma ---
const editingMeta = ref(false)
// Панель перешла к другому ключу — незаконченная правка прошлого не переезжает за ней
watch(() => props.technicalKey, () => {
  editingMeta.value = false
})

const onMetaSaved = async () => {
  editingMeta.value = false
  await load()
  emit('changed', props.technicalKey)
}
// Ключ поменяли (здесь, у коллеги или через MCP) — перечитываем статусы и историю
watch(() => props.row?.updated_at, (value, old) => {
  if (value && old && value !== old) load()
})

// --- Копирование ---
// Код legacy-проекта зовёт строку по её старому пути: t('basic.task_1'), а не по ключу сервиса
const codeKey = computed(() => details.value?.legacy_path?.join('.') ?? props.technicalKey)

// В какой проект уходит ключ: app. — только InApp, web. — только Pages Hub, common. — в оба.
// null — наборы ещё грузятся или ключ устарел (в код он не уходит, об этом говорит плашка)
const { rules: exportRules, targetNames } = useExportRules()
const exportTargets = computed(() => (exportRules.value.length && details.value && !details.value.deprecated_at ? targetNames(props.technicalKey) : null))

const copy = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    toast.add({ title: 'Скопировано', description: text, duration: 1500 })
  } catch (error) {
    console.error(error)
  }
}

// --- Языки и статусы ---
const STATUS: Record<TranslationStatus, { label: string, color: 'neutral' | 'success' | 'secondary' }> = {
  approved: { label: 'Утверждён', color: 'success' },
  draft: { label: 'Черновик', color: 'neutral' },
  ai: { label: '✦ От ИИ', color: 'secondary' }
}

const languageRows = computed(() => props.languages.map((lang) => {
  const text = details.value?.translations?.[lang] ?? null
  const status = text ? details.value?.status?.[lang] : undefined
  const approved = details.value?.approved ?? {}
  // Правку ещё не утвердили — в проектах пока прежний текст или ничего
  const project = details.value?.deprecated_at
    ? null
    : !(lang in approved)
        ? (text ? { missing: true as const } : null)
        : approved[lang] !== text ? { text: approved[lang] ?? null } : null
  return {
    project,
    lang,
    text,
    status: status ? STATUS[status] : null,
    stale: !!details.value?.stale_langs?.includes(lang),
    // Утвердить можно то, что есть и ещё не утверждено или устарело
    canApprove: !!text && (status !== 'approved' || !!details.value?.stale_langs?.includes(lang)),
    tooLong: !!text && !!details.value?.max_length && text.length > details.value.max_length
  }
}))

const toApprove = computed(() => languageRows.value.filter(l => l.canApprove).map(l => l.lang))

const approve = async (langs: string[]) => {
  if (!langs.length) return
  approving.value = langs.length === 1 ? langs[0]! : '*'
  try {
    const { count } = await $fetch('/api/keys/approve', { method: 'POST', body: { key: props.technicalKey, langs } })
    toast.add({ title: `Утверждено: ${count} ${plural(count, ['язык', 'языка', 'языков'])}`, color: 'success', duration: 2000 })
    await load()
  } catch (error) {
    if (!(await authRedirect(error))) {
      toast.add({ title: 'Не удалось утвердить', description: errorMessage(error), color: 'error' })
    }
  } finally {
    approving.value = null
  }
}

const restoring = ref(false)

const restore = async () => {
  restoring.value = true
  try {
    await $fetch('/api/keys/restore', { method: 'POST', body: { keys: [props.technicalKey] } })
    toast.add({ title: 'Ключ возвращён', description: props.technicalKey, color: 'success', duration: 2000 })
    await load()
    emit('restored', props.technicalKey)
  } catch (error) {
    if (!(await authRedirect(error))) {
      toast.add({ title: 'Не удалось вернуть', description: errorMessage(error), color: 'error' })
    }
  } finally {
    restoring.value = false
  }
}

// --- История ---
const FIELD_LABEL: Record<string, string> = {
  created: 'Создан',
  translation: 'Текст',
  status: 'Статус',
  description: 'Описание',
  max_length: 'Лимит',
  tags: 'Теги',
  figma_url: 'Figma'
}

// Создание и пометка «устаревший» — событие без «было → стало»
const entryTitle = (entry: HistoryEntry) => entry.field === 'deprecated'
  ? (entry.new_value ? 'Помечен устаревшим' : 'Возвращён из устаревших')
  : (FIELD_LABEL[entry.field] ?? entry.field)

const hasDiff = (entry: HistoryEntry) => entry.field !== 'created' && entry.field !== 'deprecated'

const SOURCE_LABEL: Record<string, string> = {
  ui: 'интерфейс',
  mcp: 'ИИ через MCP',
  import: 'импорт',
  sql: 'база',
  test: 'автотест'
}

const STATUS_WORD: Record<string, string> = { approved: 'утверждён', draft: 'черновик', ai: 'от ИИ' }

const valueText = (entry: HistoryEntry, value: string | null) => {
  if (value === null || value === '') return '—'
  return entry.field === 'status' ? (STATUS_WORD[value] ?? value) : value
}

// Языки действия коротко: EN, RU, DE +6
const langList = (entries: HistoryEntry[]) => {
  const langs = [...new Set(entries.map(e => e.lang).filter((l): l is string => !!l))].map(l => l.toUpperCase())
  return langs.length > 3 ? `${langs.slice(0, 3).join(', ')} +${langs.length - 3}` : langs.join(', ')
}

const languagesWord = (n: number) => `${n} ${plural(n, ['языке', 'языках', 'языках'])}`

// Сводка действия из нескольких записей; подробности — по клику
const isCreation = (action: HistoryAction) => action.entries.some(e => e.field === 'created')

// Подробности действия; у создания сама запись «Создан» — уже заголовок карточки
const detailEntries = (action: HistoryAction) => action.entries.filter(e => e.field !== 'created')

const detailsLabel = (action: HistoryAction) => {
  const n = detailEntries(action).length
  return isCreation(action) ? `Тексты (${n})` : `Подробности (${n})`
}

const actionSummary = (action: HistoryAction) => {
  const { entries } = action
  const texts = entries.filter(e => e.field === 'translation').length
  // Создание ключа вместе с первыми текстами — просто «Создан», тексты под кнопкой
  if (isCreation(action)) return 'Создан'
  if (entries.every(e => e.field === 'status' && e.new_value === 'approved')) return `Утверждено: ${langList(entries)}`
  if (entries.every(e => e.field === 'translation')) {
    return action.source === 'import' ? `Импорт: тексты на ${languagesWord(texts)}` : `Тексты: ${langList(entries)}`
  }
  const fields = [...new Set(entries.map(e => entryTitle(e)))]
  return `${entries.length} ${plural(entries.length, ['изменение', 'изменения', 'изменений'])}: ${fields.join(', ').toLowerCase()}`
}

const openActions = ref(new Set<number>())
const toggleAction = (id: number) => {
  const next = new Set(openActions.value)
  if (!next.delete(id)) next.add(id)
  openActions.value = next
}

const [DefineEntry, ReuseEntry] = createReusableTemplate<{ entry: HistoryEntry }>()

const formatDate = (value?: string | null) => value
  ? new Date(value).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
  : '—'
</script>

<template>
  <aside
    class="flex w-[380px] shrink-0 flex-col overflow-hidden border-l border-default bg-default"
    aria-label="Ключ"
  >
    <div class="flex items-start gap-2 border-b border-default px-4 py-3">
      <div class="min-w-0 flex-1">
        <div class="break-all font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
          {{ technicalKey }}
        </div>
        <div class="mt-2 flex flex-wrap gap-1">
          <UButton
            size="xs"
            color="neutral"
            variant="outline"
            icon="i-lucide-copy"
            @click="copy(technicalKey)"
          >
            Ключ
          </UButton>
          <UButton
            size="xs"
            color="neutral"
            variant="outline"
            icon="i-lucide-code"
            :title="details?.legacy_path ? 'Путь строки в коде проекта' : undefined"
            @click="copy(`t('${codeKey}')`)"
          >
            t('…')
          </UButton>
        </div>
      </div>
      <UButton
        size="xs"
        color="neutral"
        variant="ghost"
        icon="i-lucide-x"
        aria-label="Закрыть панель"
        @click="emit('close')"
      />
    </div>

    <div
      v-if="!details && loading"
      class="p-4 text-xs text-muted"
    >
      Загрузка…
    </div>
    <div
      v-else-if="!details"
      class="p-4 text-xs text-muted"
    >
      Ключ не найден
    </div>

    <!-- Пока грузится следующий ключ, прежний виден приглушённым — без мигания «Загрузка…» на каждой стрелке -->
    <div
      v-else
      class="flex-1 space-y-5 overflow-y-auto px-4 py-3 text-xs transition-opacity"
      :class="{ 'opacity-40': details.technical_key !== technicalKey }"
    >
      <LocalizationsKeyMetaForm
        v-if="editingMeta"
        :technical-key="technicalKey"
        :description="details.description"
        :tags="details.tags"
        :max-length="details.max_length"
        :figma-url="details.figma_url"
        @saved="onMetaSaved"
        @cancel="editingMeta = false"
      />
      <section
        v-else
        class="space-y-1.5"
      >
        <div class="flex items-start gap-2">
          <p
            v-if="details.description"
            class="flex-1 whitespace-pre-line text-default"
          >
            {{ details.description }}
          </p>
          <p
            v-else
            class="flex-1 text-muted"
          >
            Без описания
          </p>
          <UButton
            v-if="!details.deprecated_at"
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-pencil"
            class="-mt-1 shrink-0"
            @click="editingMeta = true"
          >
            Изменить
          </UButton>
        </div>
        <div class="flex flex-wrap items-center gap-1 text-muted">
          <UBadge
            v-for="tag in details.tags"
            :key="tag"
            color="neutral"
            variant="subtle"
            size="sm"
          >
            {{ tag }}
          </UBadge>
          <span v-if="details.max_length">До {{ details.max_length }} символов</span>
        </div>
        <a
          v-if="details.figma_url"
          :href="details.figma_url"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
        >
          <UIcon
            name="i-lucide-figma"
            class="size-3.5"
          />
          Открыть в Figma
        </a>
        <p
          v-if="details.legacy_path"
          class="text-muted"
        >
          В коде проекта: <code class="font-mono">{{ codeKey }}</code>
        </p>
        <p
          v-if="exportTargets !== null"
          class="flex items-center gap-1 text-muted"
        >
          <UIcon
            name="i-lucide-git-pull-request"
            class="size-3.5 shrink-0"
          />
          {{ exportTargets ? `Выгрузка в код: ${exportTargets}` : 'В код не выгружается: ключ не входит ни в один проект' }}
        </p>
        <p class="text-muted">
          Создан {{ formatDate(details.created_at) }}<template v-if="details.created_by">
            · {{ details.created_by }}
          </template>
        </p>
      </section>

      <section>
        <div class="mb-2 flex items-center justify-between">
          <h3 class="text-[11px] font-semibold uppercase tracking-wide text-muted">
            Языки
          </h3>
          <UButton
            v-if="toApprove.length"
            size="xs"
            color="success"
            variant="soft"
            icon="i-lucide-check-check"
            :loading="approving === '*'"
            :disabled="!!approving"
            @click="approve(toApprove)"
          >
            Утвердить всё ({{ toApprove.length }})
          </UButton>
        </div>
        <ul class="divide-y divide-gray-100 dark:divide-gray-800">
          <li
            v-for="item in languageRows"
            :key="item.lang"
            class="flex items-start gap-2 py-1.5"
          >
            <span class="w-6 shrink-0 pt-0.5 font-mono text-[10px] font-semibold uppercase text-muted">{{ item.lang }}</span>
            <div class="min-w-0 flex-1">
              <p
                class="whitespace-pre-line break-words"
                :class="item.text ? 'text-gray-800 dark:text-gray-100' : 'text-muted'"
              >
                {{ item.text ?? 'нет перевода' }}
              </p>
              <div
                v-if="item.status || item.stale || item.tooLong"
                class="mt-1 flex flex-wrap gap-1"
              >
                <UBadge
                  v-if="item.status"
                  :color="item.status.color"
                  variant="subtle"
                  size="sm"
                >
                  {{ item.status.label }}
                </UBadge>
                <UBadge
                  v-if="item.stale"
                  color="warning"
                  variant="subtle"
                  size="sm"
                  title="Английский поменяли после перевода"
                >
                  Перевод устарел
                </UBadge>
                <UBadge
                  v-if="item.tooLong"
                  color="error"
                  variant="subtle"
                  size="sm"
                >
                  Длиннее {{ details.max_length }}
                </UBadge>
              </div>
              <p
                v-if="item.project"
                class="mt-1 text-[11px] text-muted"
              >
                <template v-if="'missing' in item.project">
                  В код не выгружается, пока не утвердят
                </template>
                <template v-else>
                  В коде пока: {{ item.project.text === null ? 'null' : `«${item.project.text}»` }}
                </template>
              </p>
            </div>
            <UButton
              v-if="item.canApprove"
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-lucide-check"
              :title="`Утвердить ${item.lang.toUpperCase()}`"
              :aria-label="`Утвердить ${item.lang.toUpperCase()}`"
              :loading="approving === item.lang"
              :disabled="!!approving"
              @click="approve([item.lang])"
            />
          </li>
        </ul>
      </section>

      <section>
        <h3 class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
          История
          <span
            v-if="historyTotal"
            class="ml-1 font-normal normal-case tracking-normal text-muted"
          >{{ historyTotal }}</span>
        </h3>
        <p
          v-if="!history.length"
          class="text-muted"
        >
          Пока пусто
        </p>

        <!-- Было / стало одной записи: статус строкой, текст — красным и зелёным -->
        <DefineEntry v-slot="{ entry }">
          <p
            v-if="entry.field === 'status'"
            class="text-toned"
          >
            {{ valueText(entry, entry.old_value) }} → <span class="font-medium text-gray-800 dark:text-gray-100">{{ valueText(entry, entry.new_value) }}</span>
          </p>
          <template v-else-if="hasDiff(entry)">
            <p
              v-if="entry.old_value"
              class="whitespace-pre-line break-words rounded bg-red-50 dark:bg-red-950/40 px-2 py-1 text-red-800 dark:text-red-300 line-through decoration-red-300 dark:decoration-red-800"
            >
              {{ entry.old_value }}
            </p>
            <p
              v-if="entry.new_value"
              class="whitespace-pre-line break-words rounded bg-green-50 dark:bg-green-950/40 px-2 py-1 text-green-900 dark:text-green-200"
            >
              {{ entry.new_value }}
            </p>
            <p
              v-else
              class="italic text-muted"
            >
              Очищено
            </p>
          </template>
        </DefineEntry>

        <!-- Каждое действие — карточка: что и когда, было / стало, кто и откуда.
             Правка на несколько записей (импорт, «Утвердить всё») — одна карточка со сводкой, подробности по клику -->
        <ol class="space-y-2">
          <li
            v-for="action in history"
            :key="action.id"
            class="overflow-hidden rounded-lg border border-default"
          >
            <div class="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 bg-muted px-3 py-1.5">
              <template v-if="action.entries.length === 1">
                <span
                  v-if="action.entries[0]!.lang"
                  class="rounded bg-default px-1 font-mono text-[10px] font-semibold uppercase text-muted ring-1 ring-default"
                >{{ action.entries[0]!.lang }}</span>
                <span class="font-medium text-gray-800 dark:text-gray-100">{{ entryTitle(action.entries[0]!) }}</span>
              </template>
              <span
                v-else
                class="font-medium text-gray-800 dark:text-gray-100"
              >{{ actionSummary(action) }}</span>
              <span class="ml-auto shrink-0 text-[10px] tabular-nums text-muted">{{ formatDate(action.created_at) }}</span>
            </div>
            <div class="space-y-1 px-3 py-2">
              <ReuseEntry
                v-if="action.entries.length === 1"
                :entry="action.entries[0]!"
              />
              <template v-else>
                <button
                  type="button"
                  class="flex items-center gap-1 text-toned hover:text-highlighted"
                  :aria-expanded="openActions.has(action.id)"
                  @click="toggleAction(action.id)"
                >
                  <UIcon
                    name="i-lucide-chevron-right"
                    class="size-3.5 text-muted transition-transform"
                    :class="{ 'rotate-90': openActions.has(action.id) }"
                  />
                  {{ openActions.has(action.id) ? (isCreation(action) ? 'Скрыть тексты' : 'Скрыть подробности') : detailsLabel(action) }}
                </button>
                <ul
                  v-if="openActions.has(action.id)"
                  class="space-y-2 pt-1"
                >
                  <li
                    v-for="(entry, i) in detailEntries(action)"
                    :key="i"
                    class="space-y-1"
                  >
                    <div class="flex items-center gap-2">
                      <span
                        v-if="entry.lang"
                        class="rounded bg-default px-1 font-mono text-[10px] font-semibold uppercase text-muted ring-1 ring-default"
                      >{{ entry.lang }}</span>
                      <span class="font-medium text-gray-800 dark:text-gray-100">{{ entryTitle(entry) }}</span>
                    </div>
                    <ReuseEntry :entry="entry" />
                  </li>
                </ul>
              </template>
              <p class="text-[10px] text-muted">
                {{ action.actor || 'без имени' }} · {{ SOURCE_LABEL[action.source] ?? action.source }}
              </p>
            </div>
          </li>
        </ol>

        <button
          v-if="history.length < historyTotal"
          type="button"
          class="mt-3 text-xs font-medium text-toned underline underline-offset-2 hover:text-highlighted disabled:opacity-50"
          :disabled="loadingMore"
          @click="loadMoreHistory"
        >
          {{ loadingMore ? 'Загружаю…' : history.length <= HISTORY_FIRST ? `Вся история (${historyTotal})` : `Показать ещё ${Math.min(HISTORY_MORE, historyTotal - history.length)}` }}
        </button>
      </section>
    </div>

    <div
      v-if="details?.deprecated_at"
      class="flex items-center gap-2 border-t border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 px-4 py-2 text-xs text-amber-900 dark:text-amber-200"
    >
      <span class="flex-1">Помечен устаревшим: его нет в таблице и выгрузках</span>
      <UButton
        size="xs"
        color="warning"
        variant="soft"
        icon="i-lucide-archive-restore"
        :loading="restoring"
        @click="restore"
      >
        Вернуть
      </UButton>
    </div>
    <div
      v-else-if="details"
      class="border-t border-default px-4 py-2"
    >
      <UButton
        size="xs"
        color="warning"
        variant="ghost"
        icon="i-lucide-archive"
        @click="emit('deprecate', technicalKey)"
      >
        Пометить устаревшим
      </UButton>
    </div>
  </aside>
</template>
