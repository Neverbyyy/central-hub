<script setup lang="ts">
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
}>()

interface KeyDetails extends Localization {
  description: string | null
  tags: string[]
  max_length: number | null
  legacy_path: string[] | null
  created_by: string | null
  updated_by: string | null
}

interface HistoryEntry {
  id: number
  lang: string | null
  field: string
  old_value: string | null
  new_value: string | null
  actor: string | null
  source: string
  created_at: string
}

const supabase = useSupabaseClient()
const toast = useToast()
const authRedirect = useAuthRedirect()

const details = ref<KeyDetails | null>(null)
const history = ref<HistoryEntry[]>([])
const loading = ref(false)
const approving = ref<string | null>(null)

// Ответы на запросы по прошлому ключу выбрасываем — панель могла уже переключиться
let generation = 0

const load = async () => {
  const key = props.technicalKey
  const gen = ++generation
  loading.value = true
  const [row, log] = await Promise.all([
    supabase
      .from('localizations')
      .select('technical_key, translations, status, based_on, source_rev, stale_langs, deprecated_at, created_at, updated_at, description, tags, max_length, legacy_path, created_by, updated_by')
      .eq('technical_key', key)
      .maybeSingle(),
    $fetch<HistoryEntry[]>('/api/keys/history', { query: { key } }).catch(() => [] as HistoryEntry[])
  ])
  if (gen !== generation) return
  loading.value = false
  if (row.error) {
    toast.add({ title: 'Ключ не загрузился', description: row.error.message, color: 'error' })
    return
  }
  details.value = row.data as KeyDetails | null
  history.value = log
}

watch(() => props.technicalKey, load, { immediate: true })
// Ключ поменяли (здесь, у коллеги или через MCP) — перечитываем статусы и историю
watch(() => props.row?.updated_at, (value, old) => {
  if (value && old && value !== old) load()
})

// --- Копирование ---
// Код legacy-проекта зовёт строку по её старому пути: t('basic.task_1'), а не по ключу сервиса
const codeKey = computed(() => details.value?.legacy_path?.join('.') ?? props.technicalKey)

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
  return {
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
  sql: 'база'
}

const STATUS_WORD: Record<string, string> = { approved: 'утверждён', draft: 'черновик', ai: 'от ИИ' }

const valueText = (entry: HistoryEntry, value: string | null) => {
  if (value === null || value === '') return '—'
  return entry.field === 'status' ? (STATUS_WORD[value] ?? value) : value
}

const formatDate = (value?: string | null) => value
  ? new Date(value).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
  : '—'
</script>

<template>
  <aside
    class="flex w-[380px] shrink-0 flex-col overflow-hidden border-l border-gray-200 bg-white"
    aria-label="Ключ"
  >
    <div class="flex items-start gap-2 border-b border-gray-200 px-4 py-3">
      <div class="min-w-0 flex-1">
        <div class="break-all font-mono text-xs font-semibold text-blue-600">
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
      class="p-4 text-xs text-gray-400"
    >
      Загрузка…
    </div>
    <div
      v-else-if="!details"
      class="p-4 text-xs text-gray-400"
    >
      Ключ не найден
    </div>

    <!-- Пока грузится следующий ключ, прежний виден приглушённым — без мигания «Загрузка…» на каждой стрелке -->
    <div
      v-else
      class="flex-1 space-y-5 overflow-y-auto px-4 py-3 text-xs transition-opacity"
      :class="{ 'opacity-40': details.technical_key !== technicalKey }"
    >
      <section class="space-y-1.5">
        <p
          v-if="details.description"
          class="whitespace-pre-line text-gray-700"
        >
          {{ details.description }}
        </p>
        <p
          v-else
          class="text-gray-400"
        >
          Без описания
        </p>
        <div class="flex flex-wrap items-center gap-1 text-gray-500">
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
        <p
          v-if="details.legacy_path"
          class="text-gray-400"
        >
          В коде проекта: <code class="font-mono">{{ codeKey }}</code>
        </p>
        <p class="text-gray-400">
          Создан {{ formatDate(details.created_at) }}<template v-if="details.created_by">
            · {{ details.created_by }}
          </template>
        </p>
      </section>

      <section>
        <div class="mb-2 flex items-center justify-between">
          <h3 class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
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
        <ul class="divide-y divide-gray-100">
          <li
            v-for="item in languageRows"
            :key="item.lang"
            class="flex items-start gap-2 py-1.5"
          >
            <span class="w-6 shrink-0 pt-0.5 font-mono text-[10px] font-semibold uppercase text-gray-400">{{ item.lang }}</span>
            <div class="min-w-0 flex-1">
              <p
                class="whitespace-pre-line break-words"
                :class="item.text ? 'text-gray-800' : 'text-gray-300'"
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
                  Устарел
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
        <h3 class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          История
        </h3>
        <p
          v-if="!history.length"
          class="text-gray-400"
        >
          Пока пусто
        </p>
        <ol class="space-y-2">
          <li
            v-for="entry in history"
            :key="entry.id"
            class="border-l-2 border-gray-100 pl-2"
          >
            <div class="text-[10px] text-gray-400">
              {{ formatDate(entry.created_at) }} · {{ entry.actor || 'без имени' }} · {{ SOURCE_LABEL[entry.source] ?? entry.source }}
            </div>
            <div class="text-gray-700">
              <span class="font-medium">{{ entryTitle(entry) }}</span>
              <span
                v-if="entry.lang"
                class="ml-1 font-mono text-[10px] uppercase text-gray-400"
              >{{ entry.lang }}</span>
            </div>
            <div
              v-if="hasDiff(entry)"
              class="break-words text-gray-500"
            >
              <span class="text-gray-400 line-through">{{ valueText(entry, entry.old_value) }}</span>
              → {{ valueText(entry, entry.new_value) }}
            </div>
          </li>
        </ol>
      </section>
    </div>

    <div
      v-if="details && !details.deprecated_at"
      class="border-t border-gray-200 px-4 py-2"
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
