<script setup lang="ts">
definePageMeta({ layout: false })
useSeoMeta({ title: 'Вход — Amaya Central Hub' })

// Вход — только через Google: имя и адрес берутся из аккаунта и подписывают правки в истории.
// Пускает сервер — любой рабочий аккаунт домена компании (user.domain); не пустил — объясняем здесь, по ?error=
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

const error = computed(() => {
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
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center bg-muted p-4 text-highlighted">
    <div class="w-full max-w-sm rounded-2xl border border-default bg-default p-6 shadow-sm">
      <div class="mb-6 flex items-center gap-2 text-sm font-bold">
        <AppLogo />
        Amaya Central Hub
      </div>

      <h1 class="mb-1 text-lg font-semibold">
        Вход
      </h1>
      <template v-if="user.domain">
        <p class="mb-4 text-sm text-muted">
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
      </template>
      <p
        v-else
        class="text-sm text-warning"
      >
        Вход не настроен: на сервере нужны NUXT_GOOGLE_CLIENT_ID и NUXT_GOOGLE_CLIENT_SECRET.
      </p>

      <p
        v-if="error"
        class="mt-3 break-words text-sm text-red-600 dark:text-red-400"
        role="alert"
      >
        {{ error }}
      </p>
    </div>
  </div>
</template>
