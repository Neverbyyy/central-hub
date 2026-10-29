<script setup>
import { ru } from '@nuxt/ui/locale'

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'ru'
  }
})

// Внутренний сервис: поисковикам не показываем (плюс X-Robots-Tag и robots.txt)
useSeoMeta({
  title: 'Central Hub — Amaya',
  robots: 'noindex, nofollow'
})
</script>

<template>
  <!-- Встроенные надписи Nuxt UI по-русски: «Поиск…», «Нет данных», «Закрыть» -->
  <UApp :locale="ru">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
