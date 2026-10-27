<script setup lang="ts">
const route = useRoute()

const breadcrumbs = computed(() => {
  const items = [
    { label: 'Главная', to: '/' }
  ]

  if (route.meta.title) {
    items.push({ label: route.meta.title as string, to: route.path })
  }

  return items
})
</script>

<template>
  <div class="flex h-screen bg-gray-50 overflow-hidden">
    <AppSidebar />

    <div class="flex-1 flex flex-col overflow-hidden">
      <header class="h-16 shrink-0 border-b border-gray-200 bg-white flex items-center px-4 justify-between">
        <div class="flex items-center gap-3">
          <UBreadcrumb :items="breadcrumbs">
            <template #separator>
              <span class="mx-2 text-gray-400">/</span>
            </template>

            <template #item="{ item, active }">
              <div :class="['bg-gray-0 color-blue text-gray-400 font-normal rounded-lg', { 'text-gray-900': active }]">{{ item.label }}</div>
            </template>
          </UBreadcrumb>
        </div>
      </header>

      <main class="flex-1 overflow-y-auto">
        <slot />
      </main>
    </div>
  </div>
</template>

<style>
html, body {
  /* Запрещает "отскок" всей страницы */
  overscroll-behavior: none;
  /* Для Safari/iOS также полезно зафиксировать высоту */
  height: 100%;
  overflow: hidden;
}
</style>
