<script setup lang="ts">
import { checkText, keyError, type KeyContext, type RegistryKind } from '@amaya/l10n-core'
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
const keyMessage = computed(() => (key.value ? keyError(key.value, context.value) : null))

// Код из справочника, которого ещё нет: app.<игра>, web.<сайт>, brand.<бренд>, test.<тест>
const KIND_BY_ROOT: Record<string, RegistryKind> = { app: 'game', web: 'site', brand: 'brand', test: 'test' }
const KIND_LABEL: Record<RegistryKind, string> = { game: 'игру', site: 'сайт', brand: 'бренд', test: 'тест', project: 'проект' }

const missingCode = computed(() => {
  const [root, code] = key.value.split('.')
  const kind = KIND_BY_ROOT[root ?? '']
  if (!kind || !code || !/^[a-z0-9_]+$/.test(code) || context.value.registry[kind]?.includes(code)) return null
  return { kind, code }
})

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

const canSubmit = computed(() =>
  !!key.value && !keyMessage.value && form.description.trim().length >= 10 && !!form.en.trim() && !hasTextErrors.value && !pending.value
)

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
          <span>Кода «{{ missingCode.code }}» нет в справочнике. Добавить как {{ KIND_LABEL[missingCode.kind] }}?</span>
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
        <span class="text-xs text-gray-400">
          <UKbd>Ctrl</UKbd> + <UKbd>Enter</UKbd> создать · <UKbd>Esc</UKbd> закрыть
        </span>
        <UButton
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
