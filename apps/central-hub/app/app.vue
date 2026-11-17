<script setup>
import { ru } from '@nuxt/ui/locale'

// Заголовок по умолчанию — здесь, а не в nuxt.config: app.head Nuxt применяет только при серверном рендере. Страница
// со своим заголовком (вход, ошибка) ушла — на клиенте его некому вернуть, и во вкладке оставалось «Страница не найдена»
// или «Вход». Язык, иконка и запрет индексации между страницами не меняются — они в nuxt.config (app.head)
useHead({ title: 'Amaya Central Hub' })
</script>

<template>
  <!-- Встроенные надписи Nuxt UI по-русски: «Поиск…», «Нет данных», «Закрыть» -->
  <UApp :locale="ru">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
