<script setup lang="ts">
definePageMeta({ titleKey: 'nav.mcp' })

// Подключение нейросетей по MCP: адрес этого стенда, общий токен и короткая инструкция для Claude Code. Страница
// не на /mcp: там сам MCP-сервер, и клиенты MCP ходят туда в том числе GET-запросом. В командах на экране —
// заглушка токена из словаря («<токен>» / «<token>»), а копируются они с настоящим значением (CopyCommand with-token)
const { t } = useI18n()
const mcpUrl = `${useRequestURL().origin}/mcp`
const mcpJson = JSON.stringify(
  { mcpServers: { 'amaya-hub': { type: 'http', url: mcpUrl, headers: { Authorization: 'Bearer ${AMAYA_HUB_TOKEN}' } } } },
  null,
  2
)

// Команда для переменной окружения — вкладкой своей системы. Какая система — знает только браузер: сервер рисует
// Windows, на Mac вкладка переключается после загрузки
const SYSTEMS = ['Windows', 'macOS'] as const
type System = typeof SYSTEMS[number]
const system = ref<System>('Windows')
onMounted(() => {
  if (/Mac|iPhone|iPad/.test(navigator.userAgent)) system.value = 'macOS'
})
const setEnv = computed<Record<System, string>>(() => ({
  Windows: `setx AMAYA_HUB_TOKEN "${t('ai.tokenPlaceholder')}"`,
  macOS: `echo 'export AMAYA_HUB_TOKEN="${t('ai.tokenPlaceholder')}"' >> ~/.zshrc`
}))
const addForUser = computed(() => `claude mcp add --transport http --scope user amaya-hub ${mcpUrl} --header "Authorization: Bearer ${t('ai.tokenPlaceholder')}"`)

// Что умеет — по инструментам сервера (server/routes/mcp.ts)
const CAN = ['search', 'similar', 'tree', 'create', 'drafts', 'check']

// Карточка раздела, как в макете: в тёмной теме — с фиолетовым оттенком
const CARD = 'rounded-2xl border border-gray-200 bg-default p-5 shadow-xs sm:p-6 dark:border-indigo-300/[0.1] dark:bg-indigo-950/20 dark:shadow-none'
</script>

<template>
  <!-- Фон и отступы — общие с «Настройками» (HubPage); свет — фиолетовый по краям, как в макете -->
  <HubPage
    :title="$t('ai.title')"
    :subtitle="$t('ai.intro')"
    tile="bg-radial-[at_50%_30%] from-violet-600 via-indigo-800 to-indigo-950 shadow-[0_14px_32px_-18px_rgb(124_58_237/0.9)] ring-white/10"
  >
    <template #icon>
      <AiRobot class="size-10 sm:size-12" />
    </template>
    <template #decor>
      <div class="absolute -top-48 right-0 size-[38rem] rounded-full bg-violet-500/[0.07] blur-3xl dark:bg-violet-600/[0.14]" />
      <div class="absolute -right-48 -bottom-32 size-[32rem] rounded-full bg-indigo-500/[0.06] blur-3xl dark:bg-indigo-500/[0.12]" />
    </template>

    <div class="grid items-start gap-5 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
      <div class="space-y-5">
        <section :class="CARD">
          <h2 class="flex items-center gap-2.5 text-lg font-semibold text-highlighted">
            <span class="grid size-7 place-items-center rounded-lg bg-violet-500/15 ring-1 ring-violet-400/25">
              <HubGlyph
                name="gear"
                gradient="violet"
                class="size-[18px]"
              />
            </span>
            {{ $t('ai.connection') }}
          </h2>
          <dl class="mt-5 space-y-4">
            <div>
              <dt class="text-sm font-medium text-toned">
                {{ $t('ai.address') }}
              </dt>
              <dd class="mt-2">
                <CopyCommand
                  variant="field"
                  :text="mcpUrl"
                  :label="$t('ai.copyAddress')"
                />
              </dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-toned">
                {{ $t('ai.tokenLabel') }}
              </dt>
              <dd class="mt-2">
                <SharedToken
                  kind="mcp"
                  size="lg"
                />
                <p class="mt-2 text-xs text-muted">
                  {{ $t('ai.tokenHint') }}
                </p>
              </dd>
            </div>
          </dl>
        </section>

        <!-- Одна команда на все проекты: щит справа — токен хранится у себя, а не в репозитории -->
        <section
          :class="CARD"
          class="relative overflow-hidden"
        >
          <div
            class="pointer-events-none absolute top-4 right-4 grid size-16 place-items-center max-sm:hidden"
            aria-hidden="true"
          >
            <div class="absolute inset-1 rounded-full bg-violet-500/25 blur-xl" />
            <HubGlyph
              name="shield"
              gradient="violet"
              class="relative size-14"
            />
          </div>
          <h2 class="flex items-center gap-2.5 text-lg font-semibold text-highlighted">
            <UIcon
              name="i-lucide-lightbulb"
              class="size-6 text-amber-500 dark:text-amber-400"
            />
            {{ $t('ai.tipTitle') }}
          </h2>
          <i18n-t
            keypath="ai.everywhere"
            tag="p"
            class="mt-3 text-sm text-toned sm:pr-20"
          >
            <template #file>
              <code class="font-mono text-[13px] text-highlighted">~/.claude.json</code>
            </template>
          </i18n-t>
          <CopyCommand
            class="mt-3"
            :text="addForUser"
            :label="$t('ai.copyAdd')"
            with-token="mcp"
          />
        </section>
      </div>

      <section
        :class="CARD"
        class="dark:bg-linear-to-br dark:from-indigo-950/30 dark:to-violet-950/40"
      >
        <h2 class="flex items-center gap-2.5 text-lg font-semibold text-highlighted">
          <UIcon
            name="i-lucide-book-open"
            class="size-6 text-toned"
          />
          {{ $t('ai.howTo') }}
        </h2>

        <!-- Шаги — на линии с номерами: порядок виден сразу -->
        <ol class="mt-5 space-y-6">
          <li
            v-for="step in 3"
            :key="step"
            class="relative grid grid-cols-[30px_minmax(0,1fr)] gap-x-4"
          >
            <span
              v-if="step < 3"
              class="absolute top-[38px] -bottom-5 left-[14.5px] w-px bg-violet-300 dark:bg-violet-400/25"
              aria-hidden="true"
            />
            <span class="grid size-[30px] place-items-center rounded-full bg-violet-50 text-sm font-semibold text-violet-700 ring-1 ring-violet-200 dark:bg-indigo-900/60 dark:text-white dark:ring-violet-400/30">
              {{ step }}
            </span>

            <div
              v-if="step === 1"
              class="pt-1"
            >
              <i18n-t
                keypath="ai.step1"
                tag="p"
                class="text-sm text-highlighted"
              >
                <template #variable>
                  <code class="font-mono text-[13px] font-semibold">AMAYA_HUB_TOKEN</code>
                </template>
              </i18n-t>
              <div
                class="mt-3 inline-flex rounded-full bg-gray-100 p-1 dark:bg-white/[0.04]"
                role="group"
                :aria-label="$t('ai.os')"
              >
                <button
                  v-for="item in SYSTEMS"
                  :key="item"
                  type="button"
                  :aria-pressed="system === item"
                  class="h-8 rounded-full px-4 text-sm font-medium transition-colors select-none"
                  :class="system === item ? 'bg-indigo-500 text-white shadow-sm dark:bg-indigo-500/80' : 'text-muted hover:text-highlighted'"
                  @click="system = item"
                >
                  {{ item }}
                </button>
              </div>
              <CopyCommand
                class="mt-2.5"
                :text="setEnv[system]"
                :label="$t('ai.copyFor', { os: system })"
                with-token="mcp"
              />
            </div>

            <div
              v-else-if="step === 2"
              class="pt-1"
            >
              <i18n-t
                keypath="ai.step2"
                tag="p"
                class="text-sm text-highlighted"
              >
                <template #file>
                  <code class="font-mono text-[13px] font-semibold">.mcp.json</code>
                </template>
              </i18n-t>
              <CopyCommand
                class="mt-3"
                variant="code"
                json
                :text="mcpJson"
                :label="$t('ai.copyMcpJson')"
              />
            </div>

            <div
              v-else
              class="pt-1"
            >
              <i18n-t
                keypath="ai.step3"
                tag="p"
                class="text-sm font-medium text-highlighted"
              >
                <template #server>
                  <code class="font-mono text-[13px] font-semibold">amaya-hub</code>
                </template>
              </i18n-t>
              <i18n-t
                keypath="ai.step3Hint"
                tag="p"
                class="mt-1 text-sm text-muted"
              >
                <template #command>
                  <code class="font-mono text-[13px] font-semibold text-toned">/mcp</code>
                </template>
              </i18n-t>
            </div>
          </li>
        </ol>
      </section>
    </div>

    <section :class="CARD">
      <h2 class="flex items-center gap-2.5 text-lg font-semibold text-highlighted">
        <UIcon
          name="i-lucide-sparkles"
          class="size-6 text-violet-500 dark:text-violet-400"
        />
        {{ $t('ai.canTitle') }}
      </h2>
      <ul class="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <li
          v-for="item in CAN"
          :key="item"
          class="flex gap-2.5 text-toned"
        >
          <span class="mt-px grid size-[18px] shrink-0 place-items-center rounded-full bg-green-500/15 text-green-600 dark:text-green-400">
            <UIcon
              name="i-lucide-check"
              class="size-3"
            />
          </span>
          {{ $t(`ai.can.${item}`) }}
        </li>
      </ul>
    </section>
  </HubPage>
</template>
