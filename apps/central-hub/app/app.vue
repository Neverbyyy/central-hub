<script setup>
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
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
