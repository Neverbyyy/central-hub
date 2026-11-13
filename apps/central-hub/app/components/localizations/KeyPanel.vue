<script setup lang="ts">
import type { Localization, SavedKeyMeta, TranslationStatus } from '~/composables/useLocalizations'
import type { HistoryAction, HistoryPage } from '~/utils/history'

// Панель ключа справа. Не модальная: грид остаётся под клавиатурой, панель следует за активной строкой.
const props = defineProps<{
  technicalKey: string
  languages: string[]
  // Строка из грида: по её updated_at панель понимает, что ключ поменяли, и перечитывает себя
  row?: Localization
  // На касании язык можно поправить прямо отсюда — в шторке страницы
  editable?: boolean
}>()

const emit = defineEmits<{
  close: []
  deprecate: [key: string]
  // Ключ вернули из устаревших — таблице и дереву пора перечитаться
  restored: [key: string]
  // Поменялись свойства ключа — у страницы мог поменяться список тегов
  changed: [key: string]
  // Поправить текст языка (editable)
  edit: [lang: string]
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
}

const supabase = useSupabaseClient()
const toast = useToast()
const notifyError = useNotifyError()

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
      .select('technical_key, translations, status, stale_langs, deprecated_at, created_at, updated_at, description, tags, max_length, figma_url, legacy_path, approved, created_by')
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
    await notifyError('История не загрузилась', error)
  } finally {
    loadingMore.value = false
  }
}

// --- Правка свойств: описание, теги, лимит, ссылка на Figma ---
const editingMeta = ref(false)
// Когда сохранили форму (updated_at ключа после неё): до события с ним строка таблицы ещё со старыми тегами.
// Бесконечность — сохранили, но ещё не перечитали
const savedAt = ref(Number.NaN)
// Панель перешла к другому ключу — незаконченная правка прошлого не переезжает за ней
watch(() => props.technicalKey, () => {
  editingMeta.value = false
  savedAt.value = Number.NaN
})

const onMetaSaved = async (saved: SavedKeyMeta) => {
  const key = props.technicalKey
  // Сохранённое — сразу: форма закрывается раньше, чем панель перечитает ключ, и иначе на мгновение мелькнули бы
  // прежние теги и описание. Перечитывание затем приносит то, что сохранил сервер
  if (details.value?.technical_key === key) {
    details.value = { ...details.value, description: saved.description, tags: saved.tags, max_length: saved.maxLength, figma_url: saved.figmaUrl }
    savedAt.value = Number.POSITIVE_INFINITY
  }
  editingMeta.value = false
  await load()
  if (props.technicalKey !== key) return
  savedAt.value = dbTime(details.value?.updated_at)
  emit('changed', key)
}

// Теги — из строки таблицы, если ключ в ней есть: галочки из меню правого клика видны там сразу (и не мигают —
// useLocalizations), а своё чтение панель делает только после события Realtime, это заметная задержка. Из своей
// загрузки — когда ключа нет в таблице (панель открыта по ссылке), панель ещё показывает прежний ключ или только что
// сохранили форму «Изменить» (savedAt). «Что новее, то и показывать» не годится: при быстрых галочках своя загрузка
// бывает новее строки, но без галочек, которые ещё в пути, — и они мигнули бы здесь
const tags = computed(() => {
  const row = props.row
  const own = details.value
  if (!own) return []
  const fromRow = row && row.technical_key === own.technical_key && !(dbTime(row.updated_at) < savedAt.value)
  return (fromRow ? row.tags : own.tags) ?? []
})

// Ключ поменяли (здесь, у коллеги или через MCP) — перечитываем статусы и историю. После своего действия это
// второе чтение: событие Realtime приходит раньше, чем панель успевает перечитать себя, — так проще и надёжнее,
// чем угадывать, какое событие наше
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

const { copy } = useCopy()

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
    canApprove: !!details.value && canApproveLang(details.value, lang),
    tooLong: !!text && !!details.value?.max_length && text.length > details.value.max_length
  }
}))

const toApprove = computed(() => languageRows.value.filter(l => l.canApprove).map(l => l.lang))

// Устаревший ключ сначала возвращают — как и в гриде
const canEdit = computed(() => !!props.editable && !!details.value && !details.value.deprecated_at)

const approve = async (langs: string[]) => {
  if (!langs.length) return
  approving.value = langs.length === 1 ? langs[0]! : '*'
  try {
    const { count } = await $fetch('/api/keys/approve', { method: 'POST', body: { key: props.technicalKey, langs } })
    toast.add({ title: `Утверждено: ${count} ${plural(count, ['язык', 'языка', 'языков'])}`, color: 'success', duration: 2000 })
    await load()
  } catch (error) {
    await notifyError('Не удалось утвердить', error)
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
    await notifyError('Не удалось вернуть', error)
  } finally {
    restoring.value = false
  }
}

// --- История: заголовки и сводки — utils/history ---
const openActions = ref(new Set<number>())
const toggleAction = (id: number) => {
  const next = new Set(openActions.value)
  if (!next.delete(id)) next.add(id)
  openActions.value = next
}
</script>

<template>
  <!-- Ширину и рамку задаёт место: колонка справа от грида или шторка на узком экране -->
  <aside
    class="flex shrink-0 flex-col overflow-hidden bg-default"
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
        :tags="tags"
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
            v-for="tag in tags"
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
          Создан {{ formatDateTime(details.created_at) }}<template v-if="details.created_by">
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
        <ul class="divide-y divide-default">
          <li
            v-for="item in languageRows"
            :key="item.lang"
            class="flex items-start gap-2 py-1.5"
          >
            <span class="w-6 shrink-0 pt-0.5 font-mono text-[10px] font-semibold uppercase text-muted">{{ item.lang }}</span>
            <!-- На касании тап по тексту — правка; для клавиатуры и скринридера есть кнопка с карандашом справа -->
            <div
              class="min-w-0 flex-1"
              @click="canEdit && emit('edit', item.lang)"
            >
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
            <UButton
              v-if="canEdit"
              size="sm"
              color="neutral"
              variant="ghost"
              icon="i-lucide-pencil"
              :aria-label="`Изменить ${item.lang.toUpperCase()}`"
              @click="emit('edit', item.lang)"
            />
          </li>
        </ul>
      </section>

      <LocalizationsKeyHistory
        :actions="history"
        :total="historyTotal"
        :open="openActions"
        :loading-more="loadingMore"
        @toggle="toggleAction"
        @more="loadMoreHistory"
      />
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
