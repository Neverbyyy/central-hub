<script setup lang="ts">
// Окно с названием тега: новый тег или переименование. Общее для «Все теги» и меню правого клика по ключу.
// Проверяет имя здесь же (правило — shared/utils/tags.ts, занято ли — по списку тегов); что делать с именем, решает
// вызывающий: save возвращает true — получилось, окно закрывается (ошибки он показывает сам)
const props = defineProps<{
  // Переименовать этот тег; без него — новый
  from?: string | null
  description?: string
  save: (name: string) => Promise<boolean>
}>()
const open = defineModel<boolean>('open', { required: true })

const { tags } = useTags()
const value = ref('')
const saving = ref(false)
// Сохранено — окно закрывается. Новое имя уже в списке тегов, и проверка «уже есть» не должна мигать на своём же теге
const done = ref(false)
// Режим и подписи — снимок на момент открытия. Вызывающий сбрасывает from сразу при закрытии, а окно ещё уезжает
// с анимацией: без снимка «Переименовать тег» на долю секунды становился бы «Новым тегом» с ошибкой «уже есть»
const shown = ref<{ from: string | null, description?: string }>({ from: null })

// Каждый раз — с чистого листа (переименование — с текущего имени)
watch(open, (isOpen) => {
  if (!isOpen) return
  shown.value = { from: props.from ?? null, description: props.description }
  value.value = props.from ?? ''
  done.value = false
})

const error = computed(() => {
  const name = value.value.trim()
  const from = shown.value.from
  if (!open.value || saving.value || done.value || !name || name === from) return null
  const taken = findTag(tags.value.filter(tag => tag !== from), name)
  return tagNameText(name, hubT) ?? (taken ? hubT('tags.exists', { name: taken }) : null)
})

const submit = async () => {
  const name = value.value.trim()
  if (!name || error.value || saving.value) return
  if (name === shown.value.from) {
    open.value = false
    return
  }
  saving.value = true
  try {
    if (await props.save(name)) {
      done.value = true
      open.value = false
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="$t(shown.from ? 'tags.renameTitle' : 'tags.newTitle')"
    :description="shown.description ?? (shown.from ? $t('tags.renameHint', { name: shown.from }) : $t('tags.newHint'))"
  >
    <template #body>
      <UInput
        v-model="value"
        autofocus
        class="w-full"
        :placeholder="shown.from ? undefined : $t('tags.namePlaceholder')"
        :aria-label="$t('tags.nameLabel')"
        :color="error ? 'error' : undefined"
        @keydown.enter.prevent="submit"
      />
      <p
        v-if="error"
        class="mt-2 text-sm text-red-600 dark:text-red-400"
      >
        {{ error }}
      </p>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          @click="open = false"
        >
          {{ $t('common.cancel') }}
        </UButton>
        <UButton
          :loading="saving"
          :disabled="!!error || !value.trim()"
          @click="submit"
        >
          {{ $t(shown.from ? 'tags.rename' : 'tags.createButton') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
