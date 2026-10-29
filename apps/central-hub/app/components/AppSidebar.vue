<script setup lang="ts">
const user = useHubUser()
const route = useRoute()

const changeName = async () => {
  await navigateTo({ path: '/login', query: { change: 'name', next: route.fullPath } })
}

const logout = async () => {
  await $fetch('/api/auth/logout', { method: 'POST' })
  user.value = { authed: false, name: null }
  await navigateTo('/login')
}
</script>

<template>
  <div class="flex flex-col justify-between w-64 p-2 bg-mist-50 border-r border-gray-200 flex flex-col">
    <section class="flex flex-col mx-2">
      <ULink
        raw
        to="/"
        class="flex text-sm font-bold px-4 py-2 mb-4 rounded-lg flex gap-2 items-center"
      >
        <div class="bg-gray-900 p-1 rounded-xl text-gray-50 flex items-center justify-center">
          <UIcon
            name="glyphs:road-duo"
            class="size-6"
          />
        </div>

        Central Hub Avenue
      </ULink>

      <div class="d-flex">
        <ULink
          raw
          to="/"
          class="flex px-4 py-2 mb-1 rounded-lg text-sm text-gray-900 hover:bg-mist-100"
          active-class="bg-mist-100 font-bold"
          inactive-class=""
        >
          <UIcon
            name="ri:home-line"
            class="size-5 mr-2"
          />
          Главная
        </ULink>

        <ULink
          raw
          to="/localizations"
          class="flex px-4 py-2 rounded-lg text-sm text-gray-900 hover:bg-mist-100"
          active-class="bg-mist-100 font-bold"
          inactive-class=""
        >
          <UIcon
            name="ri:earth-line"
            class="size-5 mr-2"
          />
          Локализации
        </ULink>

        <!-- A/B-тестов в сервисе пока нет: пункт виден, но не ведёт на страницу прототипа -->
        <span
          class="flex items-center px-4 py-2 rounded-lg text-sm text-gray-400 cursor-not-allowed select-none"
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
      <div
        v-if="user.name"
        class="flex items-center gap-1 pt-2 px-2 border-t border-gray-200"
      >
        <UIcon
          name="i-lucide-user-round"
          class="size-4 shrink-0 text-gray-500"
        />
        <span
          class="flex-1 min-w-0 px-1 truncate text-sm text-gray-700"
          :title="`Правки подписаны именем «${user.name}»`"
        >{{ user.name }}</span>
        <UButton
          icon="i-lucide-pencil"
          size="xs"
          color="neutral"
          variant="ghost"
          aria-label="Сменить имя"
          title="Сменить имя"
          @click="changeName"
        />
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
