<script setup lang="ts">
// Команда или файл с кнопкой копирования. С токеном (withToken) на экране — «<токен>», а в буфер уходит настоящее
// значение: вставил в терминал — готово, а сам токен на экране не светится и в тосте не показывается
const props = defineProps<{ text: string, label: string, withToken?: SharedTokenKind }>()

const PLACEHOLDER = '<токен>'
const { token } = props.withToken ? useSharedToken(props.withToken) : { token: ref<string | null>(null) }
const { copy, copied } = useCopySecret()

const onCopy = () => {
  if (!props.withToken) return copy(props.text, 'Скопировано')
  if (token.value) return copy(props.text.replaceAll(PLACEHOLDER, token.value), 'Скопировано вместе с токеном')
}
</script>

<template>
  <div class="flex items-start gap-1 rounded-md border border-default bg-default py-1 pl-2.5 pr-1">
    <pre class="min-w-0 flex-1 whitespace-pre-wrap py-0.5 font-mono text-xs leading-5 text-highlighted wrap-anywhere">{{ text }}</pre>
    <UButton
      :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
      size="xs"
      :color="copied ? 'success' : 'neutral'"
      variant="ghost"
      :aria-label="label"
      :disabled="!!withToken && !token"
      @click="onCopy"
    />
  </div>
</template>
