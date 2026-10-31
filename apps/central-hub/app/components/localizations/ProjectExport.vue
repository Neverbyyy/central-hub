<script setup lang="ts">
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { FileChange } from '~/utils/exportChanges'

// Выгрузка в код: утверждённые тексты набора уходят PR в репозиторий проекта на GitHub.
// Кнопка пишет только в свою ветку amaya-hub/<набор> и свой PR — в основную ветку тексты попадают после мержа.
interface ExportSetInfo {
  name: string
  project: string
  path: string
  repo: { repo: string, branch?: string } | null
  connected: boolean
  pending: number
  lastRun: { outcome: string, pr_number: number | null, pr_url: string | null, actor: string, created_at: string } | null
  // Открытый PR — приходит сразу, раньше медленного предпросмотра
  openPr: { number: number, url: string } | null
  // Что стало с PR последней выгрузки — после мержа на GitHub окно пишет «PR #7 смержен»
  lastPr: { number: number, url: string, state: 'open' | 'merged' | 'closed' } | null
}

interface SyncResult {
  outcome: 'unchanged' | 'ready' | 'created' | 'updated' | 'closed'
  base: string
  changes: FileChange[]
  pr: { number: number, url: string } | null
}

type Preview = SyncResult | { error: string } | undefined

const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{
  // «Показать» у ждущих утверждения — грид с выборкой «Не утверждённые»
  showPending: []
  // Строка из окна изменений — страница ищет её в таблице
  findKey: [key: string]
}>()

const toast = useToast()
const authRedirect = useAuthRedirect()
const notifyError = useNotifyError()

const PROJECTS = EXPORT_PROJECTS

const sets = ref<ExportSetInfo[] | null>(null)
const setsError = ref('')
const previews = ref<Record<string, Preview>>({})
// Наборы, которые сейчас выгружаются: при «Выгрузить во все» — несколько сразу
const pushing = ref(new Set<string>())
const pushingAll = ref(false)

const setPushing = (names: string[], value: boolean) => {
  const next = new Set(pushing.value)
  for (const name of names) {
    if (value) next.add(name)
    else next.delete(name)
  }
  pushing.value = next
}

// silent — перечитать без «Сравниваю…»: старый предпросмотр на месте, пока не придёт новый
const loadPreview = async (name: string, { silent = false } = {}) => {
  if (!silent) previews.value = { ...previews.value, [name]: undefined }
  try {
    const preview = await $fetch<SyncResult>(`/api/export/${name}/preview`)
    previews.value = { ...previews.value, [name]: preview }
  } catch (error) {
    // Тихое обновление сорвалось — остаётся прежний предпросмотр, а не ошибка
    if (!(await authRedirect(error)) && !silent) previews.value = { ...previews.value, [name]: { error: errorMessage(error) } }
  }
}

const loadSets = async ({ silent = false } = {}): Promise<ExportSetInfo[]> => {
  try {
    sets.value = await $fetch<ExportSetInfo[]>('/api/export/sets')
    return sets.value
  } catch (error) {
    if (!(await authRedirect(error)) && !silent) setsError.value = errorMessage(error)
    return []
  }
}

// Каждое открытие — свежее сравнение с репозиториями
watch(open, async (value) => {
  if (!value) return
  sets.value = null
  setsError.value = ''
  previews.value = {}
  changesOpen.value = false
  for (const set of await loadSets()) if (set.connected) loadPreview(set.name)
})

// --- Статус без переоткрытия окна ---
// PR смержили или закрыли на GitHub — вебхук (/api/github/webhook) сообщает в канал Realtime, окно тихо
// перечитывает наборы и предпросмотр этого набора. Без вебхука (локально) — при возврате на вкладку
const refresh = async (names?: string[]) => {
  if (!open.value || !sets.value || pushing.value.size) return
  for (const set of await loadSets({ silent: true })) {
    if (set.connected && (!names || names.includes(set.name))) loadPreview(set.name, { silent: true })
  }
}

// Канал публичный: из события берём только имя набора, статус — с сервера. Пачку событий — одним обновлением
const changedSets = new Set<string>()
const refreshChanged = useDebounceFn(() => {
  const names = [...changedSets]
  changedSets.clear()
  refresh(names)
}, 200)

const supabase = useSupabaseClient()
let channel: RealtimeChannel | null = null

const unsubscribe = () => {
  if (channel) supabase.removeChannel(channel)
  channel = null
}

watch(open, (value) => {
  if (!value) return unsubscribe()
  if (channel) return
  channel = supabase
    .channel(EXPORT_PR_CHANNEL)
    .on('broadcast', { event: 'pr' }, ({ payload }) => {
      const set = (payload as { set?: unknown } | undefined)?.set
      if (typeof set !== 'string') return
      changedSets.add(set)
      refreshChanged()
    })
    .subscribe()
})

onBeforeUnmount(unsubscribe)

const visibility = useDocumentVisibility()
watch(visibility, (value) => {
  if (value === 'visible') refresh()
})

const previewOf = (name: string): SyncResult | null => {
  const preview = previews.value[name]
  return preview && 'outcome' in preview ? preview : null
}

const canPush = (name: string) => !pushing.value.size && previewOf(name)?.outcome === 'ready'

// Проекты, где есть что выгрузить, — для «Выгрузить во все»
const readySets = computed(() => (sets.value ?? []).filter(set => set.connected && previewOf(set.name)?.outcome === 'ready'))

// Подпись как у кнопок карточек: PR уже открыты везде — «Обновить», нигде — «Создать»
const pushAllLabel = computed(() => {
  const n = readySets.value.length
  const withPr = readySets.value.filter(set => openPrOf(set)).length
  if (withPr === n) return `Обновить у всех (${n})`
  if (!withPr) return `Создать PR во всех (${n})`
  return `Выгрузить во все (${n})`
})
// Пока предпросмотр сравнивает файлы, открытый PR — из списка наборов: «Создать» не должно мелькать
const openPrOf = (set: ExportSetInfo) => {
  const preview = previewOf(set.name)
  return preview ? preview.pr : set.openPr
}

const prLabel = (set: ExportSetInfo) => {
  const pr = openPrOf(set)
  return pr ? `Обновить PR #${pr.number}` : 'Создать PR'
}

// Окно со всеми изменениями набора — поверх этого; Esc возвращает сюда.
// Набор остаётся и после закрытия, чтобы окно доиграло анимацию
const changesFor = ref<ExportSetInfo | null>(null)
const changesOpen = ref(false)

const showChanges = (set: ExportSetInfo) => {
  changesFor.value = set
  changesOpen.value = true
}

const OUTCOME_TITLE: Record<string, (pr: number) => string> = {
  created: pr => `PR #${pr} создан`,
  updated: pr => `PR #${pr} обновлён`,
  closed: pr => `Выгружать нечего — PR #${pr} закрыт`
}

// Строка последней выгрузки — одинаковая у всех, кто открыл окно: её данные с сервера, а не память окна
const runTitle = (run: NonNullable<ExportSetInfo['lastRun']>) =>
  run.pr_number ? OUTCOME_TITLE[run.outcome]?.(run.pr_number) ?? 'Выгрузка' : 'Выгрузка'

// Выгрузка одного набора без уведомлений — общая для кнопки в карточке и «Выгрузить во все».
// Строку статуса обновит loadSets после выгрузки, коллегам — событие сервера в канале export-pr
const pushSet = async (set: ExportSetInfo) => {
  const result = await $fetch<SyncResult>(`/api/export/${set.name}/push`, { method: 'POST' })
  // Изменения теперь в PR: кнопка дальше обновляет его
  previews.value = { ...previews.value, [set.name]: { ...result, outcome: result.outcome === 'closed' ? 'unchanged' : 'ready' } }
  return result
}

const push = async (set: ExportSetInfo) => {
  if (pushing.value.size) return
  setPushing([set.name], true)
  try {
    const result = await pushSet(set)
    changesOpen.value = false
    if (result.outcome === 'unchanged') {
      toast.add({ title: 'В репозитории всё актуально', color: 'neutral' })
    } else if (result.pr) {
      toast.add({
        title: OUTCOME_TITLE[result.outcome]!(result.pr.number),
        description: `${PROJECTS[set.name] ?? set.name}: в основную ветку тексты попадут после мержа`,
        color: 'success',
        // Ссылка, а не onClick с window.open: обёртка действия в тосте перехватывает клик, ссылку открывает сам браузер
        actions: result.outcome === 'closed' ? [] : [{ label: 'Открыть на GitHub', color: 'neutral', variant: 'outline', to: result.pr.url, target: '_blank' }]
      })
    }
    await loadSets()
  } catch (error) {
    await notifyError('Не выгрузилось', error)
  } finally {
    setPushing([set.name], false)
  }
}

// Все проекты с изменениями одним нажатием: репозитории разные, поэтому параллельно.
// Ошибка в одном проекте не мешает остальным — о ней отдельное уведомление
const pushAll = async () => {
  const targets = readySets.value
  if (pushing.value.size || !targets.length) return
  const names = targets.map(set => set.name)
  setPushing(names, true)
  pushingAll.value = true
  const settled = await Promise.allSettled(targets.map(pushSet))
  setPushing(names, false)
  pushingAll.value = false

  const done = settled.flatMap((r, i) => r.status === 'fulfilled' && r.value.pr && r.value.outcome !== 'closed'
    ? [{ project: PROJECTS[targets[i]!.name] ?? targets[i]!.name, result: r.value, pr: r.value.pr }]
    : [])
  if (done.length) {
    toast.add({
      title: `Выгружено: ${done.length} ${plural(done.length, ['проект', 'проекта', 'проектов'])}`,
      description: `${done.map(d => `${d.project} — ${OUTCOME_TITLE[d.result.outcome]!(d.pr.number)}`).join(' · ')}. В основные ветки тексты попадут после мержа`,
      color: 'success',
      actions: done.map(d => ({ label: `${d.project} #${d.pr.number}`, color: 'neutral' as const, variant: 'outline' as const, to: d.pr.url, target: '_blank' as const }))
    })
  }
  for (const [i, r] of settled.entries()) {
    if (r.status === 'rejected') await notifyError(`${PROJECTS[targets[i]!.name] ?? targets[i]!.name}: не выгрузилось`, r.reason)
  }
  await loadSets()
}

// Ctrl+Enter в этом окне — выгрузить всё, что готово; в окне изменений сочетание обрабатывает оно само
useEventListener('keydown', (event: KeyboardEvent) => {
  if (!open.value || changesOpen.value || !(event.metaKey || event.ctrlKey) || event.key !== 'Enter') return
  if (!readySets.value.length || pushing.value.size) return
  event.preventDefault()
  if (readySets.value.length > 1) pushAll()
  else push(readySets.value[0]!)
})

const showPending = () => {
  emit('showPending')
  open.value = false
}

const findKey = (key: string) => {
  changesOpen.value = false
  emit('findKey', key)
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Выгрузка в код"
    description="В код уходят только утверждённые тексты. Кнопка открывает PR — в основную ветку тексты попадут, когда его смержат."
  >
    <template #body>
      <div class="space-y-3 text-sm">
        <p
          v-if="setsError"
          class="text-red-600 dark:text-red-400"
        >
          {{ setsError }}
        </p>

        <!-- Скелетон по форме карточек, пока грузятся наборы -->
        <template v-else-if="!sets">
          <div
            v-for="i in 2"
            :key="i"
            class="space-y-2 rounded-lg border border-default p-3"
          >
            <USkeleton class="h-4 w-24 rounded bg-accented" />
            <USkeleton class="h-3 w-56 rounded bg-elevated" />
            <USkeleton class="h-3 w-44 rounded bg-elevated" />
            <USkeleton class="h-3 w-40 rounded bg-elevated" />
          </div>
        </template>

        <template v-else>
          <section
            v-for="set in sets"
            :key="set.name"
            class="rounded-lg border border-default p-3"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h3 class="font-semibold text-highlighted">
                  {{ PROJECTS[set.name] ?? set.name }}
                </h3>
                <template v-if="set.repo">
                  <a
                    :href="`https://github.com/${set.repo.repo}`"
                    target="_blank"
                    rel="noopener"
                    class="mt-1 flex w-fit max-w-full items-center gap-1.5 font-mono text-xs text-muted underline-offset-2 hover:underline"
                  >
                    <UIcon
                      name="i-simple-icons-github"
                      class="size-3.5 shrink-0"
                    />
                    <span class="truncate">{{ set.repo.repo }}</span>
                  </a>
                  <!-- Куда в репозитории кладутся файлы — своей строкой и целиком: рядом со ссылкой путь обрезался -->
                  <p class="mt-0.5 flex items-start gap-1.5 font-mono text-xs text-muted">
                    <UIcon
                      name="i-lucide-file-json"
                      class="mt-px size-3.5 shrink-0"
                    />
                    <span class="break-all">{{ set.path }}</span>
                  </p>
                </template>
                <p
                  v-else
                  class="mt-0.5 text-xs text-muted"
                >
                  Не подключён: добавьте набор <span class="font-mono">{{ set.name }}</span> в NUXT_EXPORT_REPOS
                </p>
              </div>
              <UButton
                v-if="set.connected"
                icon="i-lucide-git-pull-request"
                size="sm"
                class="shrink-0"
                :loading="pushing.has(set.name)"
                :disabled="!canPush(set.name)"
                @click="push(set)"
              >
                {{ prLabel(set) }}
              </UButton>
            </div>

            <p
              v-if="set.repo && !set.connected"
              class="mt-2 text-xs text-amber-700 dark:text-amber-400"
            >
              NUXT_GITHUB_TOKEN не задан на сервере — выгружать нечем.
            </p>

            <!-- Что уйдёт в PR -->
            <div
              v-if="set.connected"
              class="mt-2 text-xs"
            >
              <div
                v-if="previews[set.name] === undefined"
                class="space-y-1.5"
                aria-busy="true"
                aria-label="Сравниваю с репозиторием"
              >
                <USkeleton class="h-3 w-44 rounded bg-elevated" />
                <USkeleton class="h-3 w-64 rounded bg-elevated" />
              </div>
              <p
                v-else-if="'error' in previews[set.name]!"
                class="text-red-600 dark:text-red-400"
              >
                {{ (previews[set.name] as { error: string }).error }}
                <button
                  type="button"
                  class="ml-1 font-medium text-default underline underline-offset-2"
                  @click="loadPreview(set.name)"
                >
                  Повторить
                </button>
              </p>
              <!-- Сами изменения — в отдельном окне: их бывают тысячи -->
              <button
                v-else-if="previewOf(set.name)?.outcome === 'ready'"
                type="button"
                class="font-medium text-default underline underline-offset-2 hover:text-highlighted"
                @click="showChanges(set)"
              >
                Показать изменения ({{ totalChanges(previewOf(set.name)!.changes) }})
              </button>
              <p
                v-else
                class="flex items-center gap-1 text-muted"
              >
                <UIcon
                  name="i-lucide-check"
                  class="size-3.5 text-green-600 dark:text-green-400"
                />
                В репозитории всё актуально
              </p>
            </div>

            <p
              v-if="set.pending"
              class="mt-2 text-xs text-amber-700 dark:text-amber-400"
            >
              Ждут утверждения: {{ keysCount(set.pending) }} — их правки в выгрузку не попадут.
              <!-- Черновики и тексты от ИИ — одной выборкой «Не утверждённые» -->
              <button
                type="button"
                class="font-medium underline underline-offset-2"
                @click="showPending"
              >
                Показать
              </button>
            </p>

            <!-- Что с PR — из данных сервера, одинаково у всех, кто открыл окно. Мерж или закрытие на GitHub
                 важнее последней выгрузки; закрыл сам сервис («выгружать нечего») — объясняет строка выгрузки -->
            <p
              v-if="set.lastPr && set.lastPr.state !== 'open' && !openPrOf(set) && set.lastRun?.outcome !== 'closed'"
              class="mt-2 flex flex-wrap items-center gap-1 text-xs"
              :class="set.lastPr.state === 'merged' ? 'text-green-700 dark:text-green-400' : 'text-muted'"
            >
              <UIcon
                :name="set.lastPr.state === 'merged' ? 'i-lucide-git-merge' : 'i-lucide-git-pull-request-closed'"
                class="size-3.5 shrink-0"
              />
              {{ set.lastPr.state === 'merged' ? `PR #${set.lastPr.number} смержен` : `PR #${set.lastPr.number} закрыт без мержа` }} —
              <a
                :href="set.lastPr.url"
                target="_blank"
                rel="noopener"
                class="font-medium underline underline-offset-2"
              >открыть на GitHub</a>
            </p>
            <!-- Последняя выгрузка — кто бы ни нажимал: «PR #11 обновлён · 31.10, 19:47 · Артём» -->
            <p
              v-else-if="set.lastRun"
              class="mt-2 flex flex-wrap items-center gap-x-1 text-xs"
              :class="set.lastRun.outcome === 'closed' ? 'text-muted' : 'text-green-700 dark:text-green-400'"
            >
              <UIcon
                :name="set.lastRun.outcome === 'closed' ? 'i-lucide-git-pull-request-closed' : 'i-lucide-git-pull-request'"
                class="size-3.5 shrink-0"
              />
              {{ runTitle(set.lastRun) }}
              <span class="text-muted">· {{ formatDateTime(set.lastRun.created_at, { year: false }) }} · {{ set.lastRun.actor }}</span>
              <template v-if="set.lastRun.pr_url">
                —
                <a
                  :href="set.lastRun.pr_url"
                  target="_blank"
                  rel="noopener"
                  class="font-medium underline underline-offset-2"
                >открыть на GitHub</a>
              </template>
            </p>
          </section>
        </template>

        <!-- Внутри этого окна: Esc закрывает только верхнее -->
        <LocalizationsExportChanges
          v-if="changesFor"
          v-model:open="changesOpen"
          :project="PROJECTS[changesFor.name] ?? changesFor.name"
          :repo="changesFor.repo?.repo ?? null"
          :changes="previewOf(changesFor.name)?.changes ?? []"
          :pr-label="prLabel(changesFor)"
          :can-push="canPush(changesFor.name)"
          :pushing="pushing.has(changesFor.name)"
          @push="push(changesFor!)"
          @find-key="findKey"
        />
      </div>
    </template>

    <!-- Изменения больше чем в одном проекте — PR во все одним нажатием -->
    <template
      v-if="readySets.length > 1"
      #footer
    >
      <div class="flex w-full items-center justify-between gap-3">
        <span class="min-w-0 text-xs text-muted">
          Изменения в {{ readySets.length }} {{ plural(readySets.length, ['проекте', 'проектах', 'проектах']) }}
        </span>
        <UButton
          icon="i-lucide-git-pull-request"
          class="shrink-0"
          :loading="pushingAll"
          :disabled="!!pushing.size"
          @click="pushAll"
        >
          {{ pushAllLabel }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
