<script lang="ts" setup>
// const supabase = useSupabaseClient()

onMounted(async () => {
  // // Пытаемся просто постучаться в таблицу (даже если она пустая)
  // const { data, error } = await supabase.from('localizations').select('technical_key')

  // if (error) {
  //   console.error('Ошибка подключения:', error.message)
  // } else {
  //   console.log('✅ Соединение с Supabase установлено!', data)
  // }
})
</script>

<template>
  <div class="flex flex-col gap-4 p-4">
    <h2 class="font-bold">
      Ссылки
    </h2>

    <div class="flex gap-4 mb-4">
      <UCard
        title="Локализации"
        description="Управление всеми локализациями с возможностью выгрузки."
        class="w-xs hover:cursor-pointer transition-all shadow-xl shadow-amber-50 dark:shadow-black/40 hover:bg-elevated hover:ring-accented dark:hover:bg-gray-700/60 dark:hover:ring-gray-600 rounded-xl"
        @click="navigateTo('/localizations')"
      />

      <NuxtLink
        to="https://inapp-webview-hub.b-cdn.net/?debugEnabled=1&mode=hyper"
        target="_blank"
        external
      >
        <UCard
          title="WebViews"
          description="Все варианты WebView используемые в тестах и не только."
          class="w-xs hover:cursor-pointer transition-all shadow-xl shadow-purple-50 dark:shadow-black/40 hover:bg-elevated hover:ring-accented dark:hover:bg-gray-700/60 dark:hover:ring-gray-600 rounded-xl"
        />
      </NuxtLink>
    </div>

    <h2 class="font-bold">
      Сервисы
    </h2>

    <div class="flex gap-4 mb-4">
      <NuxtLink
        to="https://www.notion.so/34bf40329b8d804382c2f3b9e2271017?v=34bf40329b8d80b8868a000c921008dc&pvs=13"
        target="_blank"
        external
      >
        <UCard
          title="Notion"
          class="w-3xs hover:cursor-pointer transition-all shadow-xl shadow-purple-50 dark:shadow-black/40 hover:bg-elevated hover:ring-accented dark:hover:bg-gray-700/60 dark:hover:ring-gray-600 rounded-xl"
        />
      </NuxtLink>

      <NuxtLink
        to="https://editor.rive.app/"
        target="_blank"
        external
      >
        <UCard
          title="Rive"
          class="w-3xs hover:cursor-pointer transition-all shadow-xl shadow-purple-50 dark:shadow-black/40 hover:bg-elevated hover:ring-accented dark:hover:bg-gray-700/60 dark:hover:ring-gray-600 rounded-xl"
        />
      </NuxtLink>

      <NuxtLink
        to="https://vercel.com/amaya-7786ba9e"
        target="_blank"
        external
      >
        <UCard
          title="Vercel"
          class="w-3xs hover:cursor-pointer transition-all shadow-xl shadow-purple-50 dark:shadow-black/40 hover:bg-elevated hover:ring-accented dark:hover:bg-gray-700/60 dark:hover:ring-gray-600 rounded-xl"
        />
      </NuxtLink>

      <NuxtLink
        to="https://www.sanity.io/@oZ59GQw9J?ref=navbar"
        target="_blank"
        external
      >
        <UCard
          title="Sanity"
          class="w-3xs hover:cursor-pointer transition-all shadow-xl shadow-purple-50 dark:shadow-black/40 hover:bg-elevated hover:ring-accented dark:hover:bg-gray-700/60 dark:hover:ring-gray-600 rounded-xl"
        />
      </NuxtLink>
    </div>
  </div>
</template>
