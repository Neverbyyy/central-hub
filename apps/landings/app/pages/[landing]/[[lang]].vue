<script setup lang="ts">
// Страница лендинга: /cars2 — английский, /cars2/ru и другие — язык из пути. Неизвестный лендинг или язык — 404.
// Тексты и мета-теги — из сервиса (ключи конфига); подгружается только язык страницы
import { locales } from '@amaya/locales/lazy'
import { useI18n } from 'vue-i18n'
import { LANDINGS } from '~/landings'

const route = useRoute()
const config = LANDINGS[String(route.params.landing)]
const lang = String(route.params.lang || 'en')
if (!config || !locales.includes(lang) || (route.params.lang === 'en')) {
  throw createError({ statusCode: 404, statusMessage: 'Not Found', fatal: true })
}

const { t } = useI18n()
await useLocale(lang)

useHead({ htmlAttrs: { lang } })
useSeoMeta({
  title: () => t(config.meta.title),
  description: () => t(config.meta.description),
  ogTitle: () => t(config.meta.title),
  ogDescription: () => t(config.meta.description),
  robots: 'noindex, nofollow'
})
</script>

<template>
  <LkPage :config="config" />
</template>
