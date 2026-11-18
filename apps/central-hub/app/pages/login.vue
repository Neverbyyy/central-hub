<script setup lang="ts">
definePageMeta({ layout: false })
const { t } = useI18n()
useSeoMeta({ title: () => `${t('login.tab')} — Amaya Central Hub` })
// Язык — и до входа: настройки доступны только после него
const { locale, setLocale } = useHubLocale()

// Вход. Основной, пока сервис в разработке, — общий пароль: верный пароль → «Как вас зовут?» (имя подписывает правки).
// Снизу запасной — через Google: имя и адрес из аккаунта, пускает любой рабочий аккаунт домена компании (user.domain);
// не пустил — объясняем здесь, по ?error=. Потом останется только Google. Показываем только настроенное на сервере
const route = useRoute()
const user = useHubUser()

// Только внутренние пути — та же проверка, что на сервере (shared/utils/auth.ts)
const next = computed(() => internalPath(route.query.next))

// Уже вошёл — сразу дальше
if (user.value.authed) await navigateTo(next.value, { replace: true })

// Полный переход, а не $fetch: сервер уводит к Google и принимает возврат (/api/auth/google/callback)
const googleHref = computed(() => `/api/auth/google${next.value === '/' ? '' : `?next=${encodeURIComponent(next.value)}`}`)

const googleError = computed(() => {
  const email = typeof route.query.email === 'string' ? route.query.email : ''
  switch (route.query.error) {
    case 'denied': return t('login.errors.denied')
    case 'state': return t('login.errors.state')
    // Перед тире — неразрывный пробел (в словаре): тире не уходит в начало строки
    case 'not-allowed': return t('login.errors.notAllowed', { email: email || t('login.errors.thisAccount'), domain: user.value.domain ?? '…' })
    case 'google': return t('login.errors.google')
    case 'off': return t('login.errors.off')
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
          {{ $t('login.nameTitle') }}
        </h1>
        <p class="mb-4 text-sm text-muted">
          {{ $t('login.nameHint') }}
        </p>
        <UInput
          v-model="name"
          name="name"
          :aria-label="$t('login.nameLabel')"
          :placeholder="$t('login.namePlaceholder')"
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
          {{ $t('login.continue') }}
        </UButton>
      </form>

      <template v-else>
        <h1 class="mb-1 text-lg font-semibold">
          {{ $t('login.title') }}
        </h1>

        <!-- Шаг 1: общий пароль -->
        <form
          v-if="user.passwordLogin"
          @submit.prevent="submit"
        >
          <p class="mb-4 text-sm text-muted">
            {{ $t('login.passwordHint') }}
          </p>
          <UInput
            id="password"
            v-model="password"
            name="password"
            :type="showPassword ? 'text' : 'password'"
            :placeholder="$t('login.password')"
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
                :aria-label="$t(showPassword ? 'login.hidePassword' : 'login.showPassword')"
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
            {{ $t('login.signIn') }}
          </UButton>
        </form>

        <!-- Запасной вход — через Google (потом останется только он) -->
        <template v-if="user.domain">
          <USeparator
            v-if="user.passwordLogin"
            :label="$t('login.or')"
            class="my-5"
          />
          <!-- Только Google (без общего пароля) — как будет потом -->
          <p
            v-else
            class="mb-4 text-sm text-muted"
          >
            {{ $t('login.googleOnly', { domain: user.domain }) }}
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
            {{ $t('login.google') }}
          </UButton>
          <p
            v-if="user.passwordLogin"
            class="mt-2 text-center text-xs text-muted"
          >
            {{ $t('login.workAccount', { domain: user.domain }) }}
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
          {{ $t('login.notConfigured') }}
        </p>
      </template>

      <!-- Язык интерфейса — уже здесь: до входа настройки недоступны. Название — на самом языке -->
      <div
        class="mt-6 flex justify-center gap-4 text-xs"
        role="group"
        :aria-label="$t('login.language')"
      >
        <button
          v-for="code in HUB_LOCALES"
          :key="code"
          type="button"
          :lang="code"
          :aria-pressed="locale === code"
          class="rounded px-1 py-0.5 focus-visible:outline-2 focus-visible:outline-primary"
          :class="locale === code ? 'font-semibold text-highlighted' : 'text-muted hover:text-default'"
          @click="setLocale(code)"
        >
          {{ HUB_LOCALE_NAMES[code] }}
        </button>
      </div>
    </div>
  </div>
</template>
