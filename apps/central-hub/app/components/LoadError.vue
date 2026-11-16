<script setup lang="ts">
// Не загрузилось — говорим об этом и даём повторить, а не показываем «пусто» или «всё готово». Одна форма на весь
// сервис: дерево разделов, грид, очередь, панель ключа, окна. Размер и отступы задаёт место (class)
withDefaults(defineProps<{
  message: string
  // muted — серым, как подпись; error — красным, где рядом обычные данные и ошибку легко не заметить
  tone?: 'muted' | 'error'
}>(), { tone: 'muted' })

defineEmits<{ retry: [] }>()
</script>

<template>
  <p
    role="alert"
    :class="tone === 'error' ? 'text-red-600 dark:text-red-400' : 'text-muted'"
  >
    {{ message }}
    <button
      type="button"
      class="ml-1 font-medium text-default underline underline-offset-2"
      @click="$emit('retry')"
    >
      Повторить
    </button>
  </p>
</template>
