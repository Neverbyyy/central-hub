<script setup>
// Заголовок по умолчанию и язык страницы — здесь, а не в nuxt.config: app.head Nuxt применяет только при серверном
// рендере. Страница со своим заголовком (вход, ошибка) ушла — на клиенте его некому вернуть, и во вкладке оставалось
// «Страница не найдена» или «Вход». Иконка и запрет индексации между страницами не меняются — они в nuxt.config
const { locale } = useHubLocale()
useHead({ title: 'Amaya Central Hub', htmlAttrs: { lang: locale } })
</script>

<template>
  <!-- Встроенные надписи Nuxt UI («Поиск…», «Нет данных», «Закрыть») — на языке интерфейса -->
  <UApp :locale="uiLocale(locale)">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
