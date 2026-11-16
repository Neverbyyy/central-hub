<script setup>
import { ru } from '@nuxt/ui/locale'

// Язык, заголовок, иконка и запрет индексации — в nuxt.config (app.head): общие и для страницы ошибки
</script>

<template>
  <!-- Встроенные надписи Nuxt UI по-русски: «Поиск…», «Нет данных», «Закрыть» -->
  <UApp :locale="ru">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
