<script setup lang="ts">
/**
 * Точки слайдов: сколько всего и какой показан. Цвета color.dot.default / color.dot.active.
 * Когда использовать: под DsSlides. Нажатие на точку — событие select с номером (зона нажатия 44 по высоте).
 * label — подпись для скринридера ключом из сервиса, номер слайда подставляет экран.
 */
withDefaults(defineProps<{
  count: number
  active: number
  label?: (index: number) => string
}>(), {
  label: undefined
})

const emit = defineEmits<{ select: [index: number] }>()
</script>

<template>
  <div class="ds:flex ds:items-center ds:justify-center">
    <button
      v-for="index in count"
      :key="index"
      type="button"
      class="ds:flex ds:h-touch ds:w-4 ds:items-center ds:justify-center ds:no-select"
      :aria-label="label ? label(index - 1) : undefined"
      :aria-current="index - 1 === active || undefined"
      @click="emit('select', index - 1)"
    >
      <span
        class="ds:size-2 ds:rounded-full"
        :class="index - 1 === active ? 'ds:bg-dot-active' : 'ds:bg-dot-default'"
      />
    </button>
  </div>
</template>
