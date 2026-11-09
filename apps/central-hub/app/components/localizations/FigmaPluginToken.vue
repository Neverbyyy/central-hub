<script setup lang="ts">
// Общий токен плагина Figma: скрыт точками, «глаз» показывает, «Скопировать» — в буфер. Один на всех (NUXT_FIGMA_TOKEN):
// вставить в плагин можно сразу, не спрашивая владельца сервиса. Сервер отдаёт его только тем, кто вошёл
const toast = useToast()
const notifyError = useNotifyError()

const token = ref<string | null>(null)
const configured = ref(true)
const loading = ref(true)
const visible = ref(false)
const copied = ref(false)

onMounted(async () => {
  try {
    const result = await $fetch<{ token: string | null }>('/api/figma/plugin-token')
    token.value = result.token
    configured.value = !!result.token
  } catch (error) {
    await notifyError('Токен плагина не загрузился', error)
  } finally {
    loading.value = false
  }
})

// Скрытый — точками той же длины: при показе поле не меняет ширину
const shown = computed(() => (token.value ? (visible.value ? token.value : '•'.repeat(token.value.length)) : ''))

// Не useCopy: тот показывает скопированный текст в тосте, а токен — секрет
const copy = async () => {
  if (!token.value) return
  try {
    await navigator.clipboard.writeText(token.value)
    copied.value = true
    toast.add({ title: 'Токен скопирован', description: 'Вставьте его в плагин', duration: 2000 })
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (error) {
    console.error(error)
  }
}
</script>

<template>
  <div>
    <p
      v-if="!loading && !configured"
      class="text-xs text-warning"
    >
      Токен не задан на сервере — переменная NUXT_FIGMA_TOKEN.
    </p>
    <div
      v-else
      class="flex gap-2"
    >
      <!-- Пока токен грузится — поле той же высоты, ничего не прыгает -->
      <input
        :value="shown"
        readonly
        :aria-label="visible ? 'Токен плагина' : 'Токен плагина скрыт'"
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
        @click="copy"
      >
        {{ copied ? 'Скопирован' : 'Скопировать' }}
      </UButton>
    </div>
  </div>
</template>
