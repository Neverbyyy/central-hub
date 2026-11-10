<script setup lang="ts">
// Общий токен (плагина Figma или MCP): скрыт точками, «глаз» показывает, «Скопировать» кладёт в буфер. Один на всех —
// вставить его можно сразу, не спрашивая владельца сервиса. Сервер отдаёт его только тем, кто вошёл
const props = defineProps<{ kind: SharedTokenKind }>()

const meta = SHARED_TOKENS[props.kind]
const { token, missing } = useSharedToken(props.kind)
const { copy, copied } = useCopySecret()
const visible = ref(false)

// Скрытый — точками той же длины: при показе поле не меняет ширину
const shown = computed(() => (token.value ? (visible.value ? token.value : '•'.repeat(token.value.length)) : ''))
</script>

<template>
  <div>
    <p
      v-if="missing"
      class="text-xs text-warning"
    >
      Токен не задан на сервере — переменная {{ meta.env }}.
    </p>
    <div
      v-else
      class="flex gap-2"
    >
      <!-- Пока токен грузится — поле той же высоты, ничего не прыгает -->
      <input
        :value="shown"
        readonly
        :aria-label="visible ? meta.label : `${meta.label} скрыт`"
        class="min-w-0 flex-1 rounded-md border border-default bg-default px-2.5 py-1.5 font-mono text-xs text-highlighted outline-none focus:border-primary"
        :class="{ 'tracking-wider': !visible }"
        @focus="visible && ($event.target as HTMLInputElement).select()"
      >
      <UButton
        :icon="visible ? 'i-lucide-eye-off' : 'i-lucide-eye'"
        size="sm"
        color="neutral"
        variant="outline"
        :aria-label="visible ? 'Скрыть токен' : 'Показать токен'"
        :disabled="!token"
        @click="visible = !visible"
      />
      <UButton
        :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
        size="sm"
        :color="copied ? 'success' : 'primary'"
        :disabled="!token"
        @click="token && copy(token, 'Токен скопирован', meta.hint)"
      >
        {{ copied ? 'Скопирован' : 'Скопировать' }}
      </UButton>
    </div>
  </div>
</template>
