<script setup lang="ts">
import { descriptionError, figmaUrlError, MAX_LENGTH_LIMIT } from '@amaya/l10n-core'
import type { SavedKeyMeta } from '~/composables/useLocalizations'

// Свойства ключа прямо в панели: описание, теги, лимит длины, ссылка на Figma.
// Ctrl+Enter — сохранить, Esc — отмена. Проверки те же, что на сервере (packages/l10n-core).
const props = defineProps<{
  technicalKey: string
  description: string | null
  tags: string[]
  maxLength: number | null
  figmaUrl: string | null
}>()

// saved — что сохранили: панель показывает это сразу, не дожидаясь, пока перечитает ключ
const emit = defineEmits<{
  saved: [meta: SavedKeyMeta]
  cancel: []
}>()

const toast = useToast()
const authRedirect = useAuthRedirect()

const form = reactive({
  description: props.description ?? '',
  tags: [...props.tags],
  maxLength: props.maxLength ? String(props.maxLength) : '',
  figmaUrl: props.figmaUrl ?? ''
})
const saving = ref(false)
const serverError = ref('')

// У строк InApp и Pages Hub описания с импорта нет — его можно оставить пустым
const isLegacy = computed(() => props.technicalKey.startsWith('legacy.'))
const descriptionMessage = computed(() => (isLegacy.value ? null : descriptionError(form.description)))
const figmaMessage = computed(() => figmaUrlError(form.figmaUrl))
const limit = computed(() => (String(form.maxLength).trim() ? Number(form.maxLength) : null))
const maxLengthMessage = computed(() => {
  const value = limit.value
  return value !== null && (!Number.isInteger(value) || value < 1 || value > MAX_LENGTH_LIMIT) ? 'Целое число от 1 до 10 000' : null
})
const canSave = computed(() => !descriptionMessage.value && !figmaMessage.value && !maxLengthMessage.value && !saving.value)

watch(form, () => {
  serverError.value = ''
})

const save = async () => {
  if (!canSave.value) return
  saving.value = true
  try {
    await $fetch('/api/keys/meta', {
      method: 'POST',
      body: { key: props.technicalKey, description: form.description, tags: form.tags, maxLength: limit.value, figmaUrl: form.figmaUrl }
    })
    toast.add({ title: 'Свойства ключа сохранены', color: 'success', duration: 1500 })
    emit('saved', { description: form.description.trim() || null, tags: [...form.tags], maxLength: limit.value, figmaUrl: form.figmaUrl.trim() || null })
  } catch (error) {
    if (!(await authRedirect(error))) serverError.value = errorMessage(error)
  } finally {
    saving.value = false
  }
}

const onKeydown = (event: KeyboardEvent) => {
  if (isModEnter(event)) {
    event.preventDefault()
    save()
  } else if (event.key === 'Escape') {
    // Только отмена правки: панель и грид остаются как были
    event.preventDefault()
    event.stopPropagation()
    emit('cancel')
  }
}
</script>

<template>
  <form
    class="space-y-3"
    aria-label="Свойства ключа"
    @submit.prevent="save"
    @keydown="onKeydown"
  >
    <UFormField
      label="Описание"
      size="xs"
      :required="!isLegacy"
      :error="descriptionMessage ?? undefined"
    >
      <UTextarea
        v-model="form.description"
        :rows="3"
        autoresize
        autofocus
        size="sm"
        class="w-full"
        placeholder="Где показывается строка и какие у неё ограничения"
      />
    </UFormField>

    <UFormField
      label="Теги"
      size="xs"
    >
      <LocalizationsTagSelect
        v-model="form.tags"
        size="sm"
      />
    </UFormField>

    <div class="grid grid-cols-[110px_1fr] gap-2">
      <UFormField
        label="Лимит длины"
        size="xs"
        :error="maxLengthMessage ?? undefined"
      >
        <UInput
          v-model="form.maxLength"
          type="number"
          min="1"
          size="sm"
          class="w-full"
          placeholder="без лимита"
        />
      </UFormField>
      <UFormField
        label="Ссылка на Figma"
        size="xs"
        :error="figmaMessage ?? undefined"
      >
        <UInput
          v-model="form.figmaUrl"
          type="url"
          size="sm"
          class="w-full"
          placeholder="https://www.figma.com/design/…"
        />
      </UFormField>
    </div>

    <p
      v-if="serverError"
      class="text-red-600 dark:text-red-400"
      role="alert"
    >
      {{ serverError }}
    </p>

    <div class="flex items-center gap-2">
      <UButton
        type="submit"
        size="xs"
        :loading="saving"
        :disabled="!canSave"
      >
        Сохранить
      </UButton>
      <UButton
        size="xs"
        color="neutral"
        variant="ghost"
        @click="emit('cancel')"
      >
        Отмена
      </UButton>
      <span class="ml-auto text-[10px] text-muted">Ctrl+Enter — сохранить · Esc — отмена</span>
    </div>
  </form>
</template>
