<script setup lang="ts">
definePageMeta({ layout: false })
useSeoMeta({ title: 'Вход — Amaya Central Hub' })

// Вход. Основной, пока сервис в разработке, — общий пароль: верный пароль → «Как вас зовут?» (имя подписывает правки).
// Снизу запасной — через Google: имя и адрес из аккаунта, пускает любой рабочий аккаунт домена компании (user.domain);
// не пустил — объясняем здесь, по ?error=. Потом останется только Google. Показываем только настроенное на сервере
const route = useRoute()
const user = useHubUser()

// Только внутренние пути — та же проверка, что на сервере (shared/utils/auth.ts)
const next = computed(() => internalPath(route.query.next))

// Уже вошёл — сразу дальше
if (user.value.authed) await navigateTo(next.value, { replace: true })

// Перед тире — неразрывный пробел: тире не уходит в начало строки
const NBSP = String.fromCharCode(160)

// Полный переход, а не $fetch: сервер уводит к Google и принимает возврат (/api/auth/google/callback)
const googleHref = computed(() => `/api/auth/google${next.value === '/' ? '' : `?next=${encodeURIComponent(next.value)}`}`)

const googleError = computed(() => {
  const email = typeof route.query.email === 'string' ? route.query.email : ''
  switch (route.query.error) {
    case 'denied': return 'Вход отменён. Чтобы продолжить, выберите аккаунт Google.'
    case 'state': return 'Ссылка входа устарела или открыта в другой вкладке — нажмите «Войти через Google» ещё раз.'
    case 'not-allowed': return `${email || 'Этот аккаунт'}${NBSP}— не рабочий аккаунт компании. Войдите аккаунтом @${user.value.domain ?? '…'}.`
    case 'google': return 'Google не ответил — попробуйте ещё раз через минуту.'
    case 'off': return 'Вход через Google не настроен на сервере.'
    default: return ''
  }
})

// --- Общий пароль: шаг 1 — пароль, шаг 2 — имя (user.nameRequired: пароль уже проверен сервером) ---
// Шаг — свой, а не прямо из user: после имени user уже «вошёл», и, пока грузится следующая страница, здесь на
// мгновение снова показалась бы форма пароля. Так до ухода со страницы остаётся «Как вас зовут?» с крутилкой
const step = ref<'password' | 'name'>(user.value.nameRequired ? 'name' : 'password')
const password = ref('')
const showPassword = ref(false)
const togglePassword = () => {
  showPassword.value = !showPassword.value
}
const name = ref('')
const error = ref('')
const pending = ref(false)

// Правило имени — общее с сервером (shared/utils/auth.ts)
const canSubmit = computed(() => (step.value === 'name' ? !loginNameError(name.value) : !!password.value))

const submit = async () => {
  if (pending.value || !canSubmit.value) return
  error.value = ''
  pending.value = true
  try {
    if (step.value === 'name') {
      await $fetch('/api/auth/name', { method: 'POST', body: { name: name.value } })
      user.value = await $fetch('/api/auth/me')
      await navigateTo(next.value, { replace: true })
    } else {
      await $fetch('/api/auth/password', { method: 'POST', body: { password: password.value } })
      password.value = ''
      user.value = await $fetch('/api/auth/me')
      step.value = 'name'
    }
  } catch (failure) {
    error.value = errorMessage(failure)
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center bg-muted p-4 text-highlighted">
    <div class="w-full max-w-sm rounded-2xl border border-default bg-default p-6 shadow-sm">
      <div class="mb-6 flex items-center gap-2 text-sm font-bold">
        <AppLogo />
        Amaya Central Hub
      </div>

      <!-- Шаг 2: пароль верный — как вас зовут -->
      <form
        v-if="step === 'name'"
        @submit.prevent="submit"
      >
        <h1 class="mb-1 text-lg font-semibold">
          Как вас зовут?
        </h1>
        <p class="mb-4 text-sm text-muted">
          Имя подписывает ваши правки в истории строк.
        </p>
        <UInput
          v-model="name"
          name="name"
          aria-label="Имя"
          placeholder="Введите ваше имя"
          autocomplete="name"
          autofocus
          size="lg"
          class="w-full"
          :maxlength="40"
        />
        <p
          v-if="error"
          class="mt-2 text-sm text-red-600 dark:text-red-400"
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
          Продолжить
        </UButton>
      </form>

      <template v-else>
        <h1 class="mb-1 text-lg font-semibold">
          Вход
        </h1>

        <!-- Шаг 1: общий пароль -->
        <form
          v-if="user.passwordLogin"
          @submit.prevent="submit"
        >
          <p class="mb-4 text-sm text-muted">
            Сервис закрыт общим паролем команды.
          </p>
          <UInput
            id="password"
            v-model="password"
            name="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="Пароль"
            autocomplete="current-password"
            autofocus
            size="lg"
            class="w-full"
            :color="error ? 'error' : 'primary'"
            :highlight="!!error"
            :ui="{ trailing: 'pe-1' }"
          >
            <template #trailing>
              <!-- mousedown.prevent: фокус и курсор остаются в поле, можно сразу печатать дальше -->
              <UButton
                type="button"
                color="neutral"
                variant="link"
                size="sm"
                :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                :aria-label="showPassword ? 'Скрыть пароль' : 'Показать пароль'"
                :aria-pressed="showPassword"
                aria-controls="password"
                @mousedown.prevent
                @click="togglePassword"
              />
            </template>
          </UInput>
          <p
            v-if="error"
            class="mt-2 text-sm text-red-600 dark:text-red-400"
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
            Войти
          </UButton>
        </form>

        <!-- Запасной вход — через Google (потом останется только он) -->
        <template v-if="user.domain">
          <USeparator
            v-if="user.passwordLogin"
            label="или"
            class="my-5"
          />
          <!-- Только Google (без общего пароля) — как будет потом -->
          <p
            v-else
            class="mb-4 text-sm text-muted"
          >
            Только через рабочий аккаунт {{ user.domain }}
          </p>
          <UButton
            :to="googleHref"
            external
            block
            size="lg"
            color="neutral"
            variant="outline"
            icon="i-simple-icons-google"
          >
            Войти через Google
          </UButton>
          <p
            v-if="user.passwordLogin"
            class="mt-2 text-center text-xs text-muted"
          >
            Рабочий аккаунт {{ user.domain }}
          </p>
          <p
            v-if="googleError"
            class="mt-3 break-words text-sm text-red-600 dark:text-red-400"
            role="alert"
          >
            {{ googleError }}
          </p>
        </template>

        <p
          v-if="!user.domain && !user.passwordLogin"
          class="text-sm text-warning"
        >
          Вход не настроен: на сервере нужен NUXT_HUB_PASSWORD или NUXT_GOOGLE_CLIENT_ID и NUXT_GOOGLE_CLIENT_SECRET.
        </p>
      </template>
    </div>
  </div>
</template>
