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

// Меню на узком экране — шторка с тем же сайдбаром; переход по ссылке её закрывает
const menuOpen = ref(false)
watch(() => route.fullPath, () => {
  menuOpen.value = false
})
</script>

<template>
  <!-- dvh, а не vh: в мобильном Safari 100vh выше видимой части, и низ уходил под панель браузера -->
  <div class="flex h-dvh bg-muted overflow-hidden">
    <!-- От 1024 px сайдбар — колонкой, уже — в шторке по кнопке меню. Через CSS: сервер ширины экрана не знает -->
    <div class="hidden shrink-0 lg:flex">
      <AppSidebar class="w-64 border-r border-default" />
    </div>

    <USlideover
      v-model:open="menuOpen"
      side="left"
      title="Меню"
      :ui="{ content: 'max-w-72' }"
    >
      <template #content>
        <AppSidebar class="h-full" />
      </template>
    </USlideover>

    <div class="flex-1 min-w-0 flex flex-col overflow-hidden">
      <header class="h-14 lg:h-16 shrink-0 border-b border-default bg-default flex items-center gap-1 px-2 lg:px-4">
        <UButton
          icon="i-lucide-menu"
          color="neutral"
          variant="ghost"
          class="lg:hidden"
          aria-label="Меню"
          @click="menuOpen = true"
        />

        <UBreadcrumb
          :items="breadcrumbs"
          class="min-w-0"
        >
          <template #separator>
            <span class="mx-2 text-muted">/</span>
          </template>

          <template #item="{ item, active }">
            <!-- Один из двух цветов, а не оба сразу: иначе побеждает тот, что позже в CSS -->
            <div :class="['bg-gray-0 color-blue font-normal rounded-lg', active ? 'text-highlighted' : 'text-muted']">
              {{ item.label }}
            </div>
          </template>
        </UBreadcrumb>
      </header>

      <!-- Страницы с гридом занимают её высоту целиком (h-full), остальные прокручиваются здесь -->
      <main class="flex-1 min-h-0 overflow-y-auto">
        <slot />
      </main>
    </div>

    <CommandPalette />
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
