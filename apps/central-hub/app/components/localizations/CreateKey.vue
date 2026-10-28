<script setup lang="ts">
import { checkText, descriptionError, MIN_DESCRIPTION_LENGTH, newKeyError, type KeyContext, type RegistryKind } from '@amaya/l10n-core'
import type { RegistryEntry } from '~/composables/useLocalizations'

// Новый ключ: имя проверяется на лету теми же правилами, что и в базе (packages/l10n-core),
// а похожие строки показываются до создания — чтобы брать существующий ключ, а не плодить дубль.
const props = defineProps<{
  registry: RegistryEntry[]
  languages: string[]
}>()

const emit = defineEmits<{
  created: [key: string]
  registryChanged: []
}>()

const open = defineModel<boolean>('open', { required: true })

const toast = useToast()
const authRedirect = useAuthRedirect()

const emptyForm = () => ({ key: '', description: '', en: '', tags: [] as string[], maxLength: '' })
const form = reactive(emptyForm())
const pending = ref(false)
const serverError = ref('')

const context = computed<KeyContext>(() => {
  const registry: KeyContext['registry'] = {}
  for (const { kind, code } of props.registry) registry[kind] = [...(registry[kind] ?? []), code]
  return { registry, languages: props.languages }
})

const key = computed(() => form.key.trim())
const keyMessage = computed(() => (key.value ? newKeyError(key.value, context.value) : null))
// Пока поле пустое, не ругаемся — об этом скажет подсказка у кнопки
const descriptionMessage = computed(() => (form.description.trim() ? descriptionError(form.description) : null))

// Код из справочника, которого ещё нет: app.<игра>, web.<сайт>, brand.<бренд>, test.<тест>
const KIND_BY_ROOT: Record<string, RegistryKind> = { app: 'game', web: 'site', brand: 'brand', test: 'test' }
const KIND_NEW: Record<RegistryKind, string> = { game: 'новую игру', site: 'новый сайт', brand: 'новый бренд', test: 'новый тест', project: 'новый проект' }

// Предлагаем добавить код, только когда он дописан — после него уже есть точка.
// Иначе на полпути к app.cars2 форма предложит завести игру «car».
const missingCode = computed(() => {
  const [root, code, ...rest] = key.value.split('.')
  const kind = KIND_BY_ROOT[root ?? '']
  if (!kind || !code || !rest.length || !/^[a-z0-9_]+$/.test(code) || context.value.registry[kind]?.includes(code)) return null
  return { kind, code }
})

// Расстояние Левенштейна — сколько букв поправить, чтобы из одного кода получить другой
const editDistance = (a: string, b: string) => {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j]! + 1, row[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = row
  }
  return prev[b.length]!
}

// Существующие коды, похожие на набранный: опечатка или недописанный код (car → cars2)
const similarCodes = computed(() => {
  const missing = missingCode.value
  if (!missing) return []
  // У коротких кодов допуск в одну букву, иначе car похож на farm
  const tolerance = (code: string) => Math.min(code.length, missing.code.length) >= 5 ? 2 : 1
  return props.registry.filter(entry => entry.kind === missing.kind && (
    entry.code.startsWith(missing.code) || missing.code.startsWith(entry.code) || editDistance(entry.code, missing.code) <= tolerance(entry.code)
  ))
})

const useCode = (code: string) => {
  const [root, , ...rest] = key.value.split('.')
  form.key = [root, code, ...rest].join('.')
}

const codeTitle = ref('')
const addingCode = ref(false)

const addCode = async () => {
  const missing = missingCode.value
  if (!missing || !codeTitle.value.trim()) return
  addingCode.value = true
  try {
    await $fetch('/api/registry', { method: 'POST', body: { ...missing, title: codeTitle.value } })
    toast.add({ title: `Добавлено в справочник: ${missing.code}`, color: 'success' })
    codeTitle.value = ''
    emit('registryChanged')
  } catch (error) {
    if (!(await authRedirect(error))) toast.add({ title: 'Не добавилось', description: errorMessage(error), color: 'error' })
  } finally {
    addingCode.value = false
  }
}

const maxLength = computed(() => Number(form.maxLength) || null)
const textIssues = computed(() => checkText({ text: form.en, maxLength: maxLength.value, isNew: true }))
const hasTextErrors = computed(() => textIssues.value.some(i => i.level === 'error'))

// --- Похожие строки ---
const similar = ref<{ technical_key: string, en: string | null, score: number }[]>([])
const similarQuery = computed(() => ({ text: form.en.trim(), key: key.value }))

watchDebounced(similarQuery, async (query) => {
  if (!query.text && !query.key) {
    similar.value = []
    return
  }
  try {
    similar.value = await $fetch('/api/keys/similar', { query })
  } catch {
    similar.value = []
  }
}, { debounce: 300, deep: true })

const copyKey = async (value: string) => {
  try {
    await navigator.clipboard.writeText(value)
    toast.add({ title: 'Ключ скопирован', description: value, duration: 1200 })
  } catch (error) {
    console.error(error)
  }
}

// Что мешает создать ключ — показывается рядом с кнопкой, чтобы она не была выключена молча
const blockers = computed(() => {
  const list: string[] = []
  if (!key.value) list.push('ключ')
  else if (keyMessage.value) list.push('исправить ключ')
  if (descriptionError(form.description)) list.push(`описание от ${MIN_DESCRIPTION_LENGTH} символов`)
  if (!form.en.trim()) list.push('текст на английском')
  else if (hasTextErrors.value) list.push('исправить текст')
  return list
})

const canSubmit = computed(() => !blockers.value.length && !pending.value)

const submit = async () => {
  if (!canSubmit.value) return
  pending.value = true
  serverError.value = ''
  try {
    const created = await $fetch('/api/keys', {
      method: 'POST',
      body: { key: key.value, description: form.description, en: form.en, tags: form.tags, maxLength: maxLength.value }
    })
    toast.add({ title: 'Ключ создан', description: created.key, color: 'success' })
    emit('created', created.key)
    Object.assign(form, emptyForm())
    open.value = false
  } catch (error) {
    if (!(await authRedirect(error))) serverError.value = errorMessage(error)
  } finally {
    pending.value = false
  }
}

const onKeydown = (event: KeyboardEvent) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault()
    submit()
  }
}
</script>

<template>
  <USlideover
    v-model:open="open"
    title="Новый ключ"
    description="Имя по схеме «Как называть ключи», описание обязательно. Сначала посмотрите похожие строки."
    :ui="{ content: 'max-w-xl' }"
  >
    <template #body>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="submit"
        @keydown="onKeydown"
      >
        <UFormField
          label="Ключ"
          required
          :error="keyMessage ?? undefined"
          help="От общего к частному: app.cars2.paywall.title, common.button.continue.default"
        >
          <UInput
            v-model="form.key"
            class="w-full"
            :ui="{ base: 'font-mono' }"
            placeholder="app.cars2.paywall.title"
            autofocus
          />
        </UFormField>

        <div
          v-if="missingCode"
          class="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          <span>Кода «{{ missingCode.code }}» нет в справочнике.</span>
          <div
            v-if="similarCodes.length"
            class="flex flex-wrap items-center gap-1"
          >
            <span>Возможно, вы имели в виду:</span>
            <UButton
              v-for="entry in similarCodes"
              :key="entry.code"
              size="xs"
              color="neutral"
              variant="outline"
              class="font-mono"
              @click="useCode(entry.code)"
            >
              {{ entry.code }} — {{ entry.title }}
            </UButton>
          </div>
          <span>{{ similarCodes.length ? 'Или добавить' : 'Добавить' }} в справочник как {{ KIND_NEW[missingCode.kind] }}:</span>
          <div class="flex gap-2">
            <UInput
              v-model="codeTitle"
              size="sm"
              class="flex-1"
              placeholder="Название, например Cars 2"
              @keydown.enter.prevent="addCode"
            />
            <UButton
              size="sm"
              color="warning"
              :loading="addingCode"
              :disabled="!codeTitle.trim()"
              @click="addCode"
            >
              Добавить
            </UButton>
          </div>
        </div>

        <UFormField
          label="Описание"
          required
          :error="descriptionMessage ?? undefined"
          help="Где показывается строка и какие у неё ограничения"
        >
          <UTextarea
            v-model="form.description"
            class="w-full"
            :rows="2"
            autoresize
          />
        </UFormField>

        <UFormField
          label="Текст (EN)"
          required
        >
          <UTextarea
            v-model="form.en"
            class="w-full"
            :rows="2"
            autoresize
          />
          <ul
            v-if="textIssues.length"
            class="mt-1 flex flex-col gap-0.5 text-xs"
          >
            <li
              v-for="issue in textIssues"
              :key="issue.message"
              :class="issue.level === 'error' ? 'text-red-600' : 'text-amber-600'"
            >
              {{ issue.message }}
            </li>
          </ul>
        </UFormField>

        <div class="grid grid-cols-2 gap-3">
          <UFormField label="Теги">
            <UInputTags
              v-model="form.tags"
              class="w-full"
              placeholder="Enter — добавить"
            />
          </UFormField>
          <UFormField label="Лимит длины">
            <UInput
              v-model="form.maxLength"
              type="number"
              min="1"
              class="w-full"
              placeholder="без лимита"
            />
          </UFormField>
        </div>

        <section>
          <h3 class="mb-1 text-xs font-semibold text-gray-500">
            Похожие строки
          </h3>
          <p
            v-if="!similar.length"
            class="text-xs text-gray-400"
          >
            {{ form.en || form.key ? 'Похожих нет' : 'Появятся, когда начнёте вводить ключ или текст' }}
          </p>
          <ul
            v-else
            class="divide-y divide-gray-100 rounded-lg border border-gray-200"
          >
            <li
              v-for="item in similar"
              :key="item.technical_key"
            >
              <button
                type="button"
                class="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50"
                :title="`Скопировать ${item.technical_key}`"
                @click="copyKey(item.technical_key)"
              >
                <span class="min-w-0 flex-1">
                  <span class="block truncate font-mono text-[11px] text-blue-600">{{ item.technical_key }}</span>
                  <span class="block truncate text-xs text-gray-700">{{ item.en ?? '—' }}</span>
                </span>
                <span class="shrink-0 text-[11px] tabular-nums text-gray-400">{{ Math.round(item.score * 100) }}%</span>
              </button>
            </li>
          </ul>
        </section>

        <p
          v-if="serverError"
          class="text-sm text-red-600"
          role="alert"
        >
          {{ serverError }}
        </p>
      </form>
    </template>

    <template #footer>
      <div class="flex w-full items-center justify-between gap-3">
        <span
          v-if="blockers.length"
          class="text-xs text-amber-700"
          role="status"
        >
          Чтобы создать, нужно: {{ blockers.join(', ') }}
        </span>
        <span
          v-else
          class="text-xs text-gray-400"
        >
          <UKbd>Ctrl</UKbd> + <UKbd>Enter</UKbd> создать · <UKbd>Esc</UKbd> закрыть
        </span>
        <UButton
          class="shrink-0"
          :loading="pending"
          :disabled="!canSubmit"
          @click="submit"
        >
          Создать ключ
        </UButton>
      </div>
    </template>
  </USlideover>
</template>
