<script setup lang="ts">
import type { FileChange } from '~/utils/exportChanges'

import type { ExportSetPrefixes } from '@amaya/l10n-core'

// Выгрузка в код: утверждённые тексты набора уходят PR в репозиторий проекта на GitHub.
// Кнопка пишет только в свою ветку amaya-hub/<набор> и свой PR — в основную ветку тексты попадают после мержа.
// Порядок — два шага: сначала дизайн-система (тексты смотрят в Storybook и мержат PR), потом рабочие проекты
interface ExportSetInfo {
  name: string
  path: string
  repo: { repo: string, branch?: string } | null
  connected: boolean
  pending: number
  // Сначала — этот набор (дизайн-система); null — набор сам и есть проверка
  reviewSet: string | null
  prefixes: ExportSetPrefixes
  lastRun: { outcome: string, pr_number: number | null, pr_url: string | null, actor: string, created_at: string } | null
  // Открытый PR — приходит сразу, раньше медленного предпросмотра
  openPr: { number: number, url: string } | null
  // Что стало с PR последней выгрузки — после мержа на GitHub окно пишет «PR #7 смержен»
  lastPr: { number: number, url: string, state: 'open' | 'merged' | 'closed' } | null
}

interface SyncResult {
  outcome: 'unchanged' | 'ready' | 'created' | 'updated' | 'closed'
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
const { t } = useI18n()

const sets = ref<ExportSetInfo[] | null>(null)
const setsError = ref('')
// shallowRef: предпросмотр заменяется только целиком, а строк в нём тысячи — глубокие прокси для каждой не нужны
const previews = shallowRef<Record<string, Preview>>({})
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

// Подписка общая с баджем на кнопке (useExportPrEvents): окно слушает, только пока открыто
const { listen, stop } = useExportPrEvents((set) => {
  changedSets.add(set)
  refreshChanged()
})

watch(open, value => (value ? listen() : stop()), { immediate: true })

onBeforeUnmount(stop)

const visibility = useDocumentVisibility()
watch(visibility, (value) => {
  if (value === 'visible') refresh()
})

const previewOf = (name: string): SyncResult | null => {
  const preview = previews.value[name]
  return preview && 'outcome' in preview ? preview : null
}

// --- Сначала дизайн-система ---
// Рабочий проект ждёт, пока общие с дизайн-системой ключи не окажутся в её основной ветке: предпросмотр дизайн-системы
// уже загружен в этом же окне, правило то же, что на сервере (reviewGate). Её PR смержили —
// событие перечитывает её предпросмотр, и блок снимается сам
interface Gate {
  // checking — дизайн-система ещё сравнивается; unavailable — не подключена или не сравнилась; blocked — держат ключи
  kind: 'checking' | 'unavailable' | 'blocked'
  // Причина одной фразой: подсказка кнопки, строка в карточке и в окне изменений
  text: string
  // Открытый PR дизайн-системы: «Проверьте PR #10 в Storybook и смержите»
  pr: { number: number, url: string } | null
}

// «3 общих ключа», «3+ общих ключа» (не все строки пришли), «много изменений» (ни одного видимого)
const blockSize = ({ keys, truncated }: NonNullable<ReturnType<typeof reviewGate>>) => (keys.length
  ? t(truncated ? 'projectExport.gate.sharedKeysMore' : 'projectExport.gate.sharedKeys', keys.length)
  : t('projectExport.gate.manyChanges'))

const gateFor = (set: ExportSetInfo, review: ExportSetInfo | undefined): Gate | null => {
  if (!set.reviewSet) return null
  const project = projectName(set.reviewSet)
  if (!review?.connected) return { kind: 'unavailable', text: t('projectExport.gate.notConnected', { project }), pr: null }
  const preview = previews.value[review.name]
  if (preview === undefined) return { kind: 'checking', text: t('projectExport.gate.checking', { project }), pr: null }
  if ('error' in preview) return { kind: 'unavailable', text: t('projectExport.gate.failed', { project }), pr: null }
  const block = reviewGate(set.prefixes, preview)
  return block ? { kind: 'blocked', text: t('projectExport.gate.blocked', { project, size: blockSize(block) }), pr: openPrOf(review) } : null
}

// Один раз на смену наборов и предпросмотров, а не на каждую отрисовку: правило проходит все строки предпросмотра
const gates = computed(() => {
  const list = sets.value ?? []
  const byName = new Map(list.map(set => [set.name, set]))
  return new Map(list.map(set => [set.name, gateFor(set, set.reviewSet ? byName.get(set.reviewSet) : undefined)]))
})
const gateOf = (set: ExportSetInfo) => gates.value.get(set.name) ?? null

// Есть что выгрузить, и дизайн-система не держит
const isReady = (set: ExportSetInfo) => previewOf(set.name)?.outcome === 'ready' && !gateOf(set)
const canPush = (set: ExportSetInfo) => !pushing.value.size && isReady(set)

// Набор проверки → кто его ждёт из-за общих ключей: «После мержа откроется выгрузка в InApp и Pages Hub»
const waitingFor = computed(() => {
  const waiting = new Map<string, string[]>()
  for (const set of sets.value ?? []) {
    if (set.reviewSet && previewOf(set.name)?.outcome === 'ready' && gateOf(set)?.kind === 'blocked') {
      waiting.set(set.reviewSet, [...(waiting.get(set.reviewSet) ?? []), set.name])
    }
  }
  return new Map([...waiting].map(([review, names]) => [review, projectList(names)]))
})

// «Выгрузить без проверки» — срочная правка: подтверждение прямо в карточке, без нового окна. Esc его отменяет
const confirmForce = ref<string | null>(null)

// Шаги над карточками — когда есть и проверка, и рабочие проекты; порядок (сначала проверка) задаёт сервер
const firstWorking = computed(() => sets.value?.findIndex(set => set.reviewSet) ?? -1)
const stepTitle = (index: number) => {
  if (firstWorking.value <= 0) return null
  if (index === 0) return t('projectExport.step1')
  return index === firstWorking.value ? t('projectExport.step2') : null
}

// Проекты, где есть что выгрузить, — для «Выгрузить во все»; рабочие проекты, которые ждут дизайн-систему, — нет
const readySets = computed(() => (sets.value ?? []).filter(set => set.connected && isReady(set)))

// Подпись как у кнопок карточек: PR уже открыты везде — «Обновить», нигде — «Создать»
const pushAllLabel = computed(() => {
  const n = readySets.value.length
  const withPr = readySets.value.filter(set => openPrOf(set)).length
  if (withPr === n) return t('projectExport.updateAll', { count: n })
  if (!withPr) return t('projectExport.createAll', { count: n })
  return t('projectExport.pushAll', { count: n })
})
// Пока предпросмотр сравнивает файлы, открытый PR — из списка наборов: «Создать» не должно мелькать
const openPrOf = (set: ExportSetInfo) => {
  const preview = previewOf(set.name)
  return preview ? preview.pr : set.openPr
}

const prLabel = (set: ExportSetInfo) => {
  const pr = openPrOf(set)
  return pr ? t('projectExport.updatePr', { number: pr.number }) : t('projectExport.createPr')
}

// Окно со всеми изменениями набора — поверх этого; Esc возвращает сюда.
// Набор остаётся и после закрытия, чтобы окно доиграло анимацию
const changesFor = ref<ExportSetInfo | null>(null)
const changesOpen = ref(false)

const showChanges = (set: ExportSetInfo) => {
  changesFor.value = set
  changesOpen.value = true
}

// Каждое открытие — свежее сравнение с репозиториями; оно же — «Повторить», если наборы не загрузились
const reopen = async () => {
  sets.value = null
  setsError.value = ''
  previews.value = {}
  changesOpen.value = false
  confirmForce.value = null
  for (const set of await loadSets()) if (set.connected) loadPreview(set.name)
}

// immediate: страница монтирует окно при первом открытии — уже открытым, поэтому наблюдатель стоит после всего, к чему
// обращается (иначе — обращение до объявления)
watch(open, (value) => {
  if (value) reopen()
}, { immediate: true })

// Чем кончилась выгрузка с PR: «PR #7 создан» — в уведомлении и в строке последней выгрузки
const PR_OUTCOMES = new Set(['created', 'updated', 'closed'])
const outcomeTitle = (outcome: string, pr: number) => t(`projectExport.outcome.${outcome}`, { number: pr })

// Строка последней выгрузки — одинаковая у всех, кто открыл окно: её данные с сервера, а не память окна
const runTitle = (run: NonNullable<ExportSetInfo['lastRun']>) =>
  run.pr_number && PR_OUTCOMES.has(run.outcome) ? outcomeTitle(run.outcome, run.pr_number) : t('projectExport.run')

// Выгрузка одного набора без уведомлений — общая для кнопки в карточке и «Выгрузить во все».
// Строку статуса обновит loadSets после выгрузки, коллегам — событие сервера в канале export-pr.
// force — без проверки в дизайн-системе: сервер пропустит, а в PR и журнале останется отметка
const pushSet = async (set: ExportSetInfo, { force = false } = {}) => {
  const result = await $fetch<SyncResult>(`/api/export/${set.name}/push`, { method: 'POST', body: { force } })
  // Изменения теперь в PR: кнопка дальше обновляет его
  previews.value = { ...previews.value, [set.name]: { ...result, outcome: result.outcome === 'closed' ? 'unchanged' : 'ready' } }
  return result
}

const push = async (set: ExportSetInfo, { force = false } = {}) => {
  if (pushing.value.size) return
  setPushing([set.name], true)
  try {
    const result = await pushSet(set, { force })
    confirmForce.value = null
    changesOpen.value = false
    if (result.outcome === 'unchanged') {
      toast.add({ title: t('projectExport.upToDate'), color: 'neutral' })
    } else if (result.pr) {
      toast.add({
        title: outcomeTitle(result.outcome, result.pr.number),
        description: t('projectExport.mergeNote', { project: projectName(set.name) }),
        color: 'success',
        // Ссылка, а не onClick с window.open: обёртка действия в тосте перехватывает клик, ссылку открывает сам браузер
        actions: result.outcome === 'closed' ? [] : [{ label: t('projectExport.openOnGithub'), color: 'neutral', variant: 'outline', to: result.pr.url, target: '_blank' }]
      })
    }
    await loadSets()
  } catch (error) {
    await notifyError(t('projectExport.failed'), error)
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
  const settled = await Promise.allSettled(targets.map(set => pushSet(set)))
  setPushing(names, false)
  pushingAll.value = false

  const done = settled.flatMap((r, i) => r.status === 'fulfilled' && r.value.pr && r.value.outcome !== 'closed'
    ? [{ project: projectName(targets[i]!.name), result: r.value, pr: r.value.pr }]
    : [])
  if (done.length) {
    toast.add({
      title: t('projectExport.pushed', done.length),
      description: t('projectExport.pushedNote', { list: done.map(d => `${d.project} — ${outcomeTitle(d.result.outcome, d.pr.number)}`).join(' · ') }),
      color: 'success',
      actions: done.map(d => ({ label: `${d.project} #${d.pr.number}`, color: 'neutral' as const, variant: 'outline' as const, to: d.pr.url, target: '_blank' as const }))
    })
  }
  for (const [i, r] of settled.entries()) {
    if (r.status === 'rejected') await notifyError(t('projectExport.projectFailed', { project: projectName(targets[i]!.name) }), r.reason)
  }
  await loadSets()
}

// Ctrl+Enter в этом окне — выгрузить всё, что готово; в окне изменений сочетание обрабатывает оно само
useEventListener('keydown', (event: KeyboardEvent) => {
  if (!open.value || changesOpen.value || !isModEnter(event)) return
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
  <!-- Пока открыто подтверждение «без проверки», Esc и клик мимо отменяют его, а не закрывают окно -->
  <UModal
    v-model:open="open"
    :title="$t('projectExport.title')"
    :description="$t('projectExport.description')"
    :dismissible="!confirmForce"
    @close:prevent="confirmForce = null"
  >
    <template #body>
      <div class="space-y-3 text-sm">
        <LoadError
          v-if="setsError"
          :message="setsError"
          tone="error"
          @retry="reopen"
        />

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

        <p
          v-else-if="!sets.length"
          class="text-muted"
        >
          {{ $t('projectExport.noSets') }}
        </p>

        <div
          v-else
          class="space-y-3"
        >
          <template
            v-for="(set, index) in sets"
            :key="set.name"
          >
            <!-- Шаг 1 — дизайн-система, шаг 2 — рабочие проекты: флоу виден до первого нажатия -->
            <h3
              v-if="stepTitle(index)"
              class="text-[11px] font-semibold uppercase tracking-wide text-muted"
              :class="{ 'pt-2': index > 0 }"
            >
              {{ stepTitle(index) }}
            </h3>
            <section class="rounded-lg border border-default p-3">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <h3 class="font-semibold text-highlighted">
                    {{ projectName(set.name) }}
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
                    <i18n-t keypath="projectExport.notConnected">
                      <template #name>
                        <span class="font-mono">{{ set.name }}</span>
                      </template>
                    </i18n-t>
                  </p>
                </div>
                <UButton
                  v-if="set.connected"
                  v-bind="prButton(!!gateOf(set))"
                  size="sm"
                  class="shrink-0"
                  :loading="pushing.has(set.name)"
                  :disabled="!canPush(set)"
                  :title="gateOf(set)?.text"
                  @click="push(set)"
                >
                  {{ prLabel(set) }}
                </UButton>
              </div>

              <p
                v-if="set.repo && !set.connected"
                class="mt-2 text-xs text-warning"
              >
                {{ $t('projectExport.noToken') }}
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
                  :aria-label="$t('projectExport.comparing')"
                >
                  <USkeleton class="h-3 w-44 rounded bg-elevated" />
                  <USkeleton class="h-3 w-64 rounded bg-elevated" />
                </div>
                <LoadError
                  v-else-if="'error' in previews[set.name]!"
                  :message="(previews[set.name] as { error: string }).error"
                  tone="error"
                  @retry="loadPreview(set.name)"
                />
                <!-- Сами изменения — в отдельном окне: их бывают тысячи -->
                <button
                  v-else-if="previewOf(set.name)?.outcome === 'ready'"
                  type="button"
                  class="font-medium text-default underline underline-offset-2 hover:text-highlighted"
                  @click="showChanges(set)"
                >
                  {{ $t('projectExport.showChanges', { count: totalChanges(previewOf(set.name)!.changes) }) }}
                </button>
                <p
                  v-else
                  class="flex items-center gap-1 text-muted"
                >
                  <UIcon
                    name="i-lucide-check"
                    class="size-3.5 text-green-600 dark:text-green-400"
                  />
                  {{ $t('projectExport.upToDate') }}
                </p>
              </div>

              <!-- Шаг 1: что даст мерж — рабочие проекты ждут его -->
              <p
                v-if="waitingFor.get(set.name)"
                class="mt-2 flex items-center gap-1.5 text-xs text-muted"
              >
                <UIcon
                  name="i-lucide-arrow-down"
                  class="size-3.5 shrink-0"
                />
                {{ $t('projectExport.unlocks', { projects: waitingFor.get(set.name) }) }}
              </p>

              <!-- Шаг 2 ждёт шаг 1. Только когда здесь есть что выгружать: «всё актуально» ждать нечего -->
              <template v-if="previewOf(set.name)?.outcome === 'ready' && gateOf(set)">
                <p
                  v-if="gateOf(set)!.kind === 'checking'"
                  class="mt-2 text-xs text-muted"
                >
                  {{ gateOf(set)!.text }}
                </p>
                <div
                  v-else
                  class="mt-2 rounded-md bg-warning/10 px-2.5 py-2 text-xs text-warning"
                >
                  <p class="flex items-start gap-1.5">
                    <UIcon
                      name="i-lucide-lock"
                      class="mt-px size-3.5 shrink-0"
                    />
                    <span>
                      {{ gateOf(set)!.text }}.
                      <i18n-t
                        v-if="gateOf(set)!.pr"
                        keypath="projectExport.gate.reviewPr"
                      >
                        <template #number>{{ gateOf(set)!.pr!.number }}</template>
                        <template #link>
                          <a
                            :href="gateOf(set)!.pr!.url"
                            target="_blank"
                            rel="noopener"
                            class="font-medium underline underline-offset-2"
                          >{{ $t('projectExport.openOnGithubInline') }}</a>
                        </template>
                      </i18n-t>
                      <template v-else-if="gateOf(set)!.kind === 'blocked'">{{ $t('projectExport.gate.createPr') }}</template>
                    </span>
                  </p>

                  <!-- Срочная правка: обход с подтверждением на месте; в PR и журнале останется отметка -->
                  <div
                    v-if="confirmForce === set.name"
                    class="mt-2 border-t border-warning/20 pt-2"
                  >
                    <p class="text-default">
                      {{ $t('projectExport.forceNote', { project: projectName(set.name) }) }}
                    </p>
                    <div class="mt-2 flex flex-wrap gap-2">
                      <UButton
                        size="xs"
                        color="warning"
                        icon="i-lucide-git-pull-request"
                        :loading="pushing.has(set.name)"
                        :disabled="!!pushing.size"
                        @click="push(set, { force: true })"
                      >
                        {{ $t('projectExport.force') }}
                      </UButton>
                      <UButton
                        size="xs"
                        color="neutral"
                        variant="ghost"
                        @click="confirmForce = null"
                      >
                        {{ $t('common.cancel') }}
                      </UButton>
                    </div>
                  </div>
                  <button
                    v-else
                    type="button"
                    class="mt-1 ml-5 font-medium underline underline-offset-2"
                    @click="confirmForce = set.name"
                  >
                    {{ $t('projectExport.force') }}
                  </button>
                </div>
              </template>

              <p
                v-if="set.pending"
                class="mt-2 text-xs text-warning"
              >
                {{ $t('projectExport.pending', { keys: $t('common.keys', set.pending) }) }}
                <!-- Черновики и тексты от ИИ — одной выборкой «Не утверждённые» -->
                <button
                  type="button"
                  class="font-medium underline underline-offset-2"
                  @click="showPending"
                >
                  {{ $t('projectExport.showPending') }}
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
                {{ $t(set.lastPr.state === 'merged' ? 'projectExport.prMerged' : 'projectExport.prClosed', { number: set.lastPr.number }) }} —
                <a
                  :href="set.lastPr.url"
                  target="_blank"
                  rel="noopener"
                  class="font-medium underline underline-offset-2"
                >{{ $t('projectExport.openOnGithubInline') }}</a>
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
                  >{{ $t('projectExport.openOnGithubInline') }}</a>
                </template>
              </p>
            </section>
          </template>
        </div>

        <!-- Внутри этого окна: Esc закрывает только верхнее -->
        <LocalizationsExportChanges
          v-if="changesFor"
          v-model:open="changesOpen"
          :project="projectName(changesFor.name)"
          :repo="changesFor.repo?.repo ?? null"
          :changes="previewOf(changesFor.name)?.changes ?? []"
          :pr-label="prLabel(changesFor)"
          :can-push="canPush(changesFor)"
          :blocked="gateOf(changesFor)?.text"
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
          {{ $t('projectExport.changesIn', readySets.length) }}
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
