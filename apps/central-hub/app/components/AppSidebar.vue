<script setup lang="ts">
const user = useHubUser()

// Имя — из аккаунта Google, сменить его здесь нельзя. Выход — снова вход через Google
const logout = async () => {
  await $fetch('/api/auth/logout', { method: 'POST' })
  user.value = signedOut(user.value.domain)
  await navigateTo('/login')
}
</script>

<template>
  <!-- Ширину и рамку задаёт место: в лейауте — колонка 256 px, в шторке меню — во всю шторку -->
  <div class="flex flex-col justify-between p-2 bg-muted dark:bg-gray-950">
    <section class="flex flex-col mx-2">
      <ULink
        raw
        to="/"
        class="flex text-sm font-bold px-4 py-2 mb-4 rounded-lg gap-2 items-center"
      >
        <AppLogo />
        Amaya Central Hub
      </ULink>

      <div>
        <AppSidebarLink
          to="/"
          icon="ri:home-line"
          label="Главная"
          class="mb-1"
        />
        <AppSidebarLink
          to="/localizations"
          icon="ri:earth-line"
          label="Локализации"
        />

        <!-- A/B-тестов в сервисе пока нет: пункт виден, но не ведёт на страницу прототипа -->
        <span
          class="flex items-center px-4 py-2 rounded-lg text-sm text-muted cursor-not-allowed select-none"
          aria-disabled="true"
          title="A/B-тесты появятся позже"
        >
          <UIcon
            name="ri:earth-line"
            class="size-5 mr-2"
          />
          AB-Тесты
          <span class="ml-auto text-[10px]">скоро</span>
        </span>
      </div>
    </section>

    <footer>
      <!-- MCP и Настройки — внизу, над именем: нужны редко и не мешают разделам. MCP — подключение нейросетей
           (адрес, общий токен, инструкция), страница /ai: на /mcp сам MCP-сервер -->
      <AppSidebarLink
        to="/ai"
        icon="ri:robot-2-line"
        label="MCP"
        class="mx-2 mb-1"
      />
      <AppSidebarLink
        to="/settings"
        icon="ri:settings-3-line"
        label="Настройки"
        class="mx-2 mb-2"
      />

      <div
        v-if="user.name"
        class="flex items-center gap-1 pt-2 px-2 border-t border-default"
      >
        <UIcon
          name="i-lucide-user-round"
          class="size-4 shrink-0 text-muted"
        />
        <span
          class="flex-1 min-w-0 px-1 truncate text-sm text-default"
          :title="`Правки подписаны именем «${user.name}» · ${user.email}`"
        >{{ user.name }}</span>
        <UButton
          icon="i-lucide-log-out"
          size="xs"
          color="neutral"
          variant="ghost"
          aria-label="Выйти"
          title="Выйти"
          @click="logout"
        />
      </div>
    </footer>
  </div>
</template>
