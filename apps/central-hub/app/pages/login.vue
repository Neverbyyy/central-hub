<script setup lang="ts">
definePageMeta({ layout: false })
useSeoMeta({ title: 'Вход — Central Hub' })

const route = useRoute()
const user = useHubUser()

// Только внутренние пути: «//example.com» и полные адреса не пропускаем
const next = computed(() => {
  const value = typeof route.query.next === 'string' ? route.query.next : '/'
  return value.startsWith('/') && !value.startsWith('//') ? value : '/'
})

const changingName = computed(() => route.query.change === 'name')
const step = computed(() => (user.value.authed ? 'name' : 'password'))

// Уже вошёл и представился — сразу дальше
if (user.value.authed && user.value.name && !changingName.value) {
  await navigateTo(next.value, { replace: true })
}

const password = ref('')
const name = ref(user.value.name ?? '')
const error = ref('')
const pending = ref(false)

const canSubmit = computed(() => (step.value === 'password' ? !!password.value : name.value.trim().length >= 2))

const submit = async () => {
  if (pending.value || !canSubmit.value) return
  error.value = ''
  pending.value = true
  try {
    if (step.value === 'password') {
      user.value = await $fetch('/api/auth/login', { method: 'POST', body: { password: password.value } })
      password.value = ''
      if (user.value.name) await navigateTo(next.value)
    } else {
      user.value = await $fetch('/api/auth/name', { method: 'POST', body: { name: name.value } })
      await navigateTo(next.value)
    }
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center bg-gray-50 p-4 text-gray-900">
    <form
      class="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      @submit.prevent="submit"
    >
      <div class="mb-6 flex items-center gap-2 text-sm font-bold">
        <div class="flex items-center justify-center rounded-xl bg-gray-900 p-1 text-gray-50">
          <UIcon
            name="i-lucide-languages"
            class="size-6"
          />
        </div>
        Central Hub
      </div>

      <template v-if="step === 'password'">
        <h1 class="mb-1 text-lg font-semibold">
          Вход
        </h1>
        <p class="mb-4 text-sm text-gray-500">
          Сервис закрыт общим паролем команды.
        </p>
        <UInput
          v-model="password"
          type="password"
          placeholder="Пароль"
          autocomplete="current-password"
          autofocus
          size="lg"
          class="w-full"
          :color="error ? 'error' : 'primary'"
          :highlight="!!error"
        />
      </template>

      <template v-else>
        <h1 class="mb-1 text-lg font-semibold">
          Как вас зовут?
        </h1>
        <p class="mb-4 text-sm text-gray-500">
          Имя подписывает ваши правки в истории строк.
        </p>
        <UInput
          v-model="name"
          placeholder="Например, Антон"
          autocomplete="name"
          autofocus
          size="lg"
          class="w-full"
          :maxlength="40"
        />
      </template>

      <p
        v-if="error"
        class="mt-2 text-sm text-red-600"
        role="alert"
      >
        {{ error }}
      </p>

      <UButton
        type="submit"
        block
        size="lg"
        class="mt-4"
        :loading="pending"
        :disabled="!canSubmit"
      >
        {{ step === 'password' ? 'Войти' : 'Продолжить' }}
      </UButton>
    </form>
  </div>
</template>
