<script setup lang="ts">
// Команда, адрес или файл с кнопкой копирования. С токеном (withToken) на экране — заглушка из словаря
// (ai.tokenPlaceholder: «<токен>» / «<token>»), а в буфер уходит настоящее значение: вставил в терминал — готово,
// а сам токен на экране не светится и в тосте не показывается.
// variant: line — команда (не влезла — переносится), field — поле адреса, code — файл; json — ключи подсвечены, как в редакторе
const props = withDefaults(defineProps<{
  text: string
  label: string
  withToken?: SharedTokenKind
  variant?: 'line' | 'field' | 'code'
  json?: boolean
}>(), { variant: 'line' })

const { t } = useI18n()
const { token } = props.withToken ? useSharedToken(props.withToken) : { token: ref<string | null>(null) }
const { copy, copied } = useCopySecret()

const onCopy = () => {
  if (!props.withToken) return copy(props.text, t('token.copiedText'))
  if (token.value) return copy(props.text.replaceAll(t('ai.tokenPlaceholder'), token.value), t('token.copiedWithToken'))
}

// JSON по кусочкам: строка перед двоеточием — ключ, остальные строки — значения, между ними — как есть
type Part = { text: string, kind: 'plain' | 'key' | 'string' }
const parts = computed<Part[]>(() => {
  if (!props.json) return [{ text: props.text, kind: 'plain' }]
  const list: Part[] = []
  let last = 0
  for (const match of props.text.matchAll(/("(?:[^"\\]|\\.)*")(\s*:)?/g)) {
    if (match.index > last) list.push({ text: props.text.slice(last, match.index), kind: 'plain' })
    list.push({ text: match[1]!, kind: match[2] ? 'key' : 'string' })
    if (match[2]) list.push({ text: match[2], kind: 'plain' })
    last = match.index + match[0].length
  }
  if (last < props.text.length) list.push({ text: props.text.slice(last), kind: 'plain' })
  return list
})

const PART: Record<Part['kind'], string> = {
  plain: '',
  key: 'text-amber-700 dark:text-amber-300',
  string: 'text-gray-900 dark:text-indigo-100'
}

const WRAP = {
  line: 'flex items-center gap-2 py-1.5 pl-3 pr-1.5',
  field: 'flex h-11 items-center gap-2 pl-3.5 pr-1.5',
  code: 'relative py-3 pl-3.5 pr-11'
} as const
</script>

<template>
  <div
    class="rounded-lg border border-gray-200 bg-gray-50 dark:border-white/[0.07] dark:bg-gray-950/50"
    :class="WRAP[variant]"
  >
    <span
      v-if="variant === 'field'"
      class="min-w-0 flex-1 truncate text-[15px] text-highlighted"
    >{{ text }}</span>
    <pre
      v-else
      class="min-w-0 flex-1 font-mono text-[13px] whitespace-pre-wrap text-highlighted wrap-anywhere"
      :class="variant === 'code' ? 'leading-6' : 'leading-5'"
    ><span
      v-for="(part, i) in parts"
      :key="i"
      :class="PART[part.kind]"
    >{{ part.text }}</span></pre>
    <UButton
      :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
      size="sm"
      :color="copied ? 'success' : 'neutral'"
      variant="ghost"
      class="shrink-0"
      :class="{ 'absolute top-2 right-2': variant === 'code' }"
      :aria-label="label"
      :disabled="!!withToken && !token"
      @click="onCopy"
    />
  </div>
</template>
