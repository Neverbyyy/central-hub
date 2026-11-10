<script setup lang="ts">
// Действия с выделенными строками — плашкой над гридом: в шапке им не хватает места.
// В выборке «Ключ устарел» — «Вернуть», иначе — «Утвердить» (если есть что) и «Пометить устаревшими»
defineProps<{
  // Сколько строк выделено
  count: number
  // Сколько из них есть что утверждать; 0 — кнопки нет
  toApprove: number
  deprecatedView: boolean
  approving: boolean
  deprecating: boolean
}>()

defineEmits<{ approve: [], deprecate: [], restore: [], clear: [] }>()
</script>

<template>
  <div class="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-3">
    <div class="pointer-events-auto flex items-center gap-2 whitespace-nowrap rounded-xl border border-default bg-default py-1.5 pl-3 pr-1.5 shadow-lg sm:pl-4">
      <!-- На телефоне подписи короче, иначе плашка шире экрана -->
      <span class="mr-1 text-sm text-toned">
        <span class="max-sm:hidden">Выбрано: </span>{{ keysCount(count) }}
      </span>
      <UButton
        v-if="deprecatedView"
        icon="i-lucide-archive-restore"
        color="warning"
        variant="soft"
        :loading="deprecating"
        @click="$emit('restore')"
      >
        Вернуть
      </UButton>
      <template v-else>
        <!-- Число — только если утверждать нужно не все выделенные: «Выбрано: 5 · Утвердить (2)» -->
        <UButton
          v-if="toApprove"
          icon="i-lucide-check-check"
          color="success"
          variant="soft"
          :loading="approving"
          :disabled="deprecating"
          @click="$emit('approve')"
        >
          Утвердить<template v-if="toApprove !== count">
            ({{ toApprove }})
          </template>
        </UButton>
        <UButton
          icon="i-lucide-archive"
          color="warning"
          variant="soft"
          :loading="deprecating"
          :disabled="approving"
          title="Пометить устаревшими"
          @click="$emit('deprecate')"
        >
          <span class="max-sm:sr-only">Пометить устаревшими</span>
        </UButton>
      </template>
      <UButton
        icon="i-lucide-x"
        color="neutral"
        variant="ghost"
        aria-label="Снять выделение"
        @click="$emit('clear')"
      />
    </div>
  </div>
</template>
