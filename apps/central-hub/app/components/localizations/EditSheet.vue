<script setup lang="ts">
import { checkText } from '@amaya/l10n-core'

// Правка перевода в шторке снизу — на касании вместо редактора в ячейке: в узкой ячейке пальцем не попечатаешь.
// Сохраняет страница тем же путём, что и ячейку (setTranslation): работают ⌘Z и проверка правки коллеги
const props = defineProps<{
  technicalKey: string
  lang: string
  // Текст на момент открытия
  initial: string
  // Исходный текст (английский) — перед глазами при переводе; у самого английского его нет
  source?: string
}>()

const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ save: [value: string] }>()

const value = ref(props.initial)
const field = useTemplateRef('field')

// Каждое открытие — с текстом ячейки, курсор в конце
watch(open, async (isOpen) => {
  if (!isOpen) return
  value.value = props.initial
  await nextTick()
  const textarea = field.value?.textareaRef
  if (!textarea) return
  textarea.focus({ preventScroll: true })
  textarea.setSelectionRange(textarea.value.length, textarea.value.length)
}, { immediate: true })

// Те же проверки, что в очереди перевода: подстановки, экранирование, HTML
const issues = computed(() => checkText({ text: value.value, source: props.source, isNew: !props.technicalKey.startsWith('legacy.') }))
const hasErrors = computed(() => issues.value.some(issue => issue.level === 'error'))
const length = computed(() => [...value.value].length)

const save = () => {
  if (hasErrors.value) return
  open.value = false
  if (value.value !== props.initial) emit('save', value.value)
}

// С клавиатурой (планшет) — ⌘/Ctrl+Enter сохраняет; просто Enter — перенос строки
const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !e.isComposing) {
    e.preventDefault()
    save()
  }
}
</script>

<template>
  <UDrawer
    v-model:open="open"
    :title="technicalKey"
    :description="source === undefined ? `Исходный текст, ${lang.toUpperCase()}` : `Перевод на ${lang.toUpperCase()}`"
    :ui="{ title: 'break-all font-mono text-xs', body: 'space-y-3' }"
  >
    <template #body>
      <div v-if="source !== undefined">
        <div class="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
          EN
        </div>
        <p class="whitespace-pre-line break-words rounded-md bg-muted px-3 py-2 text-sm">
          {{ source || '—' }}
        </p>
      </div>

      <div>
        <div class="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted">
          <span>{{ lang.toUpperCase() }}</span>
          <span class="font-normal normal-case tracking-normal tabular-nums">{{ length }}</span>
        </div>
        <UTextarea
          ref="field"
          v-model="value"
          :rows="3"
          :maxrows="8"
          autoresize
          class="w-full"
          :ui="{ base: 'text-base' }"
          :placeholder="`Текст на ${lang.toUpperCase()}`"
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
    </template>

    <template #footer>
      <div class="flex gap-2">
        <UButton
          color="neutral"
          variant="outline"
          size="lg"
          class="flex-1 justify-center"
          @click="open = false"
        >
          Отмена
        </UButton>
        <UButton
          size="lg"
          class="flex-1 justify-center"
          :disabled="hasErrors"
          @click="save"
        >
          Сохранить
        </UButton>
      </div>
    </template>
  </UDrawer>
</template>
