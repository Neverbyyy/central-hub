<script setup lang="ts">
import { checkText } from '@amaya/l10n-core'

definePageMeta({ title: 'Очередь перевода' })

// Очередь: строки без перевода на язык или с переводом, устаревшим после правки английского.
// По одной строке, всё с клавиатуры: Enter — сохранить и дальше, Alt+→ — пропустить, Esc — к таблице.
interface QueueItem {
  key: string
  en: string
  current: string | null
  reason: 'missing' | 'stale'
  description: string | null
  max_length: number | null
}

const PAGE = 50

const route = useRoute()
const router = useRouter()
const toast = useToast()
const notifyError = useNotifyError()

// Языки перевода — общие с гридом и палитрой Ctrl+K (useLanguages)
const { targets: languages, load: loadLanguages } = useLanguages()
const lang = computed(() => typeof route.query.lang === 'string' ? route.query.lang : '')
const prefix = computed(() => typeof route.query.prefix === 'string' ? route.query.prefix : '')

const items = ref<QueueItem[]>([])
const total = ref<number | null>(null)
const loading = ref(false)
const saving = ref(false)
// Пропущенные в этой сессии — при дозагрузке не показываем их снова
const skipped = new Set<string>()
const done = ref(0)

const item = computed(() => items.value[0])
const value = ref('')
const field = useTemplateRef('field')

const focusField = () => nextTick(() => field.value?.textareaRef?.focus())

const startItem = () => {
  value.value = item.value?.current ?? ''
  focusField()
}

let generation = 0

const fetchQueue = async (reset: boolean) => {
  if (!lang.value) return
  const gen = reset ? ++generation : generation
  loading.value = true
  try {
    const data = await $fetch<{ total: number, items: QueueItem[] }>('/api/queue', {
      query: { lang: lang.value, prefix: prefix.value || undefined, limit: PAGE + skipped.size }
    })
    if (gen !== generation) return
    const seen = new Set(reset ? [] : items.value.map(i => i.key))
    const fresh = data.items.filter(i => !skipped.has(i.key) && !seen.has(i.key))
    items.value = reset ? fresh : items.value.concat(fresh)
    total.value = data.total
    if (reset || items.value.length === fresh.length) startItem()
  } catch (error) {
    await notifyError('Очередь не загрузилась', error)
  } finally {
    if (gen === generation) loading.value = false
  }
}

const restart = () => {
  skipped.clear()
  done.value = 0
  items.value = []
  total.value = null
  fetchQueue(true)
}

// Без языка в адресе берём первый, как только языки есть; смену адреса подхватит watch ниже
const pickFirstLanguage = () => {
  if (!lang.value && languages.value[0]) router.replace({ query: { ...route.query, lang: languages.value[0].code } })
}
watch(languages, pickFirstLanguage)

// Язык уже в адресе — очередь грузится сразу, не дожидаясь списка языков
onMounted(() => {
  loadLanguages()
  pickFirstLanguage()
  if (lang.value) restart()
})

watch([lang, prefix], restart)

const languageItems = computed(() => languages.value.map(l => ({ label: `${l.code.toUpperCase()} — ${l.name}`, value: l.code })))
const languageModel = computed({
  get: () => lang.value,
  set: (code: string) => router.replace({ query: { ...route.query, lang: code } })
})

// Сколько ещё осталось: остаток очереди на сервере минус то, что уже сделали после последней загрузки
const remaining = computed(() => total.value === null ? null : Math.max(total.value - skipped.size, items.value.length))

const issues = computed(() => item.value
  ? checkText({ text: value.value, source: item.value.en, maxLength: item.value.max_length, isNew: !item.value.key.startsWith('legacy.') })
  : [])
const hasErrors = computed(() => issues.value.some(i => i.level === 'error'))

const advance = () => {
  items.value = items.value.slice(1)
  if (items.value.length < 10 && (total.value ?? 0) > items.value.length + skipped.size) fetchQueue(false)
  startItem()
}

const skip = () => {
  if (!item.value) return
  skipped.add(item.value.key)
  advance()
}

const save = async () => {
  const current = item.value
  if (!current || saving.value) return
  const text = value.value
  if (!text.trim()) {
    skip()
    return
  }
  if (hasErrors.value) return

  saving.value = true
  try {
    if (text === current.current) {
      // Перевод не менялся — человек подтверждает, что он актуален после правки английского
      await $fetch('/api/keys/approve', { method: 'POST', body: { key: current.key, langs: [lang.value] } })
    } else {
      await $fetch('/api/translations', {
        method: 'PUT',
        body: { key: current.key, lang: lang.value, value: text, expected: current.current ?? '' }
      })
    }
    done.value++
    if (total.value !== null) total.value--
    advance()
  } catch (error) {
    const { statusCode, data } = (error ?? {}) as { statusCode?: number, data?: { data?: { current: string | null, actor?: string } } }
    if (statusCode === 409 && data?.data && 'current' in data.data) {
      // Пока переводили, строку перевёл кто-то ещё — показываем его вариант, свой текст остаётся в поле
      current.current = data.data.current
      toast.add({
        title: data.data.actor ? `Строку уже перевёл(а) ${data.data.actor}` : 'Строку уже перевели',
        description: `Сейчас: «${data.data.current ?? '—'}». Enter ещё раз — сохранить ваш вариант.`,
        color: 'warning'
      })
    } else {
      await notifyError('Не сохранилось', error)
    }
  } finally {
    saving.value = false
    focusField()
  }
}

const back = async () => {
  await navigateTo({ path: '/localizations', query: prefix.value ? { prefix: prefix.value } : {} })
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.isComposing) return
  if (event.key === 'Enter' && !event.shiftKey && !event.altKey) {
    event.preventDefault()
    save()
  } else if (event.key === 'ArrowRight' && event.altKey) {
    event.preventDefault()
    skip()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    back()
  }
}

const length = computed(() => [...value.value].length)
</script>

<template>
  <div class="flex h-[calc(100dvh-64px)] flex-col overflow-hidden bg-default text-highlighted">
    <div class="flex shrink-0 flex-wrap items-center gap-3 border-b border-default px-4 py-3">
      <UButton
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="ghost"
        size="sm"
        @click="back"
      >
        К таблице
      </UButton>
      <USelect
        v-model="languageModel"
        :items="languageItems"
        size="sm"
        class="w-52"
      />
      <UBadge
        v-if="prefix"
        color="neutral"
        variant="subtle"
        size="lg"
        class="font-mono"
      >
        {{ prefix }}
      </UBadge>
      <span class="ml-auto text-xs text-muted">
        <template v-if="remaining !== null">Осталось {{ remaining }}</template>
        <template v-if="done"> · переведено за сессию {{ done }}</template>
      </span>
    </div>

    <div class="flex-1 overflow-y-auto">
      <div class="mx-auto max-w-2xl px-6 py-8">
        <div
          v-if="!item && loading"
          class="text-sm text-muted"
        >
          Загрузка…
        </div>

        <div
          v-else-if="!item"
          class="py-16 text-center"
        >
          <UIcon
            name="i-lucide-party-popper"
            class="size-10 text-gray-300 dark:text-gray-600"
          />
          <p class="mt-3 text-sm font-medium">
            {{ skipped.size ? 'Остались только пропущенные строки' : `Всё переведено на ${lang.toUpperCase()}` }}
          </p>
          <div class="mt-4 flex justify-center gap-2">
            <UButton
              v-if="skipped.size"
              color="neutral"
              variant="outline"
              size="sm"
              @click="restart"
            >
              Вернуться к пропущенным
            </UButton>
            <UButton
              size="sm"
              @click="back"
            >
              К таблице
            </UButton>
          </div>
        </div>

        <div
          v-else
          class="space-y-5"
        >
          <div>
            <div class="flex items-center gap-2">
              <span class="break-all font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">{{ item.key }}</span>
              <UBadge
                :color="item.reason === 'stale' ? 'warning' : 'neutral'"
                variant="subtle"
                size="sm"
              >
                {{ item.reason === 'stale' ? 'Английский изменился' : 'Нет перевода' }}
              </UBadge>
            </div>
            <p
              v-if="item.description"
              class="mt-1 whitespace-pre-line text-xs text-muted"
            >
              {{ item.description }}
            </p>
          </div>

          <div>
            <div class="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
              EN
            </div>
            <p class="whitespace-pre-line rounded-md bg-muted px-3 py-2 text-base">
              {{ item.en }}
            </p>
          </div>

          <div>
            <div class="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted">
              <span>{{ lang.toUpperCase() }}</span>
              <span
                class="font-normal normal-case tracking-normal"
                :class="item.max_length && length > item.max_length ? 'text-red-600 dark:text-red-400' : ''"
              >
                {{ length }}<template v-if="item.max_length"> / {{ item.max_length }}</template>
              </span>
            </div>
            <UTextarea
              ref="field"
              v-model="value"
              :rows="2"
              autoresize
              class="w-full"
              :ui="{ base: 'text-base' }"
              :placeholder="`Перевод на ${lang.toUpperCase()}`"
              @keydown="onKeydown"
            />
            <ul
              v-if="issues.length"
              class="mt-1 flex flex-col gap-0.5 text-xs"
            >
              <li
                v-for="issue in issues"
                :key="issue.message"
                :class="issue.level === 'error' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'"
              >
                {{ issue.message }}
              </li>
            </ul>
          </div>

          <div class="flex items-center gap-2">
            <UButton
              :loading="saving"
              :disabled="hasErrors"
              @click="save"
            >
              {{ item.reason === 'stale' && value === item.current ? 'Перевод актуален' : 'Сохранить' }}
            </UButton>
            <UButton
              color="neutral"
              variant="ghost"
              @click="skip"
            >
              Пропустить
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <div class="hotkeys flex shrink-0 items-center gap-4 border-t border-default px-4 py-1.5 text-[11px] text-muted">
      <span><kbd>Enter</kbd> сохранить и дальше</span>
      <span><kbd>Shift+Enter</kbd> перенос строки</span>
      <span><kbd>Alt+→</kbd> пропустить</span>
      <span><kbd>Esc</kbd> к таблице</span>
      <span>Сохранённое — черновик, утвердить можно в панели ключа</span>
    </div>
  </div>
</template>
