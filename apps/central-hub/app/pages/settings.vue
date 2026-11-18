<script setup lang="ts">
import gbFlag from '~/assets/flags/gb.svg'
import ruFlag from '~/assets/flags/ru.svg'
import uzFlag from '~/assets/flags/uz.svg'

definePageMeta({ titleKey: 'nav.settings' })

// Настройки этого браузера: тема (хранит @nuxtjs/color-mode, без выбора — светлая) и язык интерфейса (cookie, без
// выбора — русский)
const colorMode = useColorMode()
const { locale, setLocale } = useHubLocale()

const THEMES = [
  { value: 'light', label: 'settings.light' },
  { value: 'dark', label: 'settings.dark' }
] as const

// Флаг — к языку интерфейса: английский — британский флаг. Файлы меньше 4 КБ, Vite встраивает их в чанк страницы
const FLAGS: Record<HubLocale, string> = { ru: ruFlag, en: gbFlag, uz: uzFlag }

const current = computed(() => (colorMode.preference === 'dark' ? 'dark' : 'light'))

const choose = (theme: 'light' | 'dark') => {
  colorMode.preference = theme
}

// Выбранный вариант: зелёная рамка со свечением, как в макете. Рамка 1px + кольцо 1px — толщина 2px без сдвига
// содержимого. Невыбранный — тонкая рамка, ярче при наведении
const optionClass = (selected: boolean) => (selected
  ? 'border-green-500 ring-1 ring-green-500 bg-green-500/[0.04] shadow-[0_0_22px_-6px_rgb(34_197_94/0.6)] dark:border-green-400 dark:ring-green-400'
  : 'border-gray-200 bg-default hover:border-gray-300 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/20 dark:hover:bg-white/[0.04]')

// Как у обычной группы радиокнопок: Tab попадает только на выбранную, стрелки переключают. Одна логика на обе группы
const ARROWS: Record<string, number> = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }
function arrowStep<T>(event: KeyboardEvent, values: readonly T[], value: T, buttons: HTMLButtonElement[] | null, select: (next: T) => void) {
  const step = ARROWS[event.key]
  if (!step) return
  event.preventDefault()
  const index = (values.indexOf(value) + step + values.length) % values.length
  select(values[index]!)
  buttons?.[index]?.focus()
}

const options = useTemplateRef<HTMLButtonElement[]>('options')
const onArrow = (event: KeyboardEvent) => arrowStep(event, THEMES.map(theme => theme.value), current.value, options.value, choose)

const languages = useTemplateRef<HTMLButtonElement[]>('languages')
const onLanguageArrow = (event: KeyboardEvent) => arrowStep(event, HUB_LOCALES, locale.value, languages.value, setLocale)
</script>

<template>
  <!-- Фон и отступы — общие с «MCP» (HubPage); свет — мягкий круг в углу, как в макете -->
  <!-- Плитка — тёмный индиго со светом в центре, шестерёнка — голубая, как в макете -->
  <HubPage
    :title="$t('nav.settings')"
    :subtitle="$t('settings.subtitle')"
    tile="bg-radial-[at_50%_40%] from-indigo-900 to-indigo-950 shadow-[0_10px_24px_-16px_rgb(49_46_129/0.9)] ring-white/[0.07]"
  >
    <template #icon>
      <HubGlyph
        name="gear"
        gradient="blue"
        class="size-8 sm:size-10"
      />
    </template>
    <template #decor>
      <div class="absolute -top-[26rem] -right-72 size-[48rem] rounded-full bg-indigo-500/[0.04] dark:bg-indigo-300/[0.04]" />
    </template>

    <section class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 rounded-2xl border border-gray-200 bg-default p-5 shadow-xs sm:gap-x-4 sm:p-6 sm:pb-5 dark:border-white/[0.08] dark:bg-white/[0.025] dark:shadow-none">
      <HubGlyph
        name="palette"
        gradient="violet"
        class="row-span-2 size-8 sm:size-9"
      />
      <h2 class="text-lg font-semibold text-highlighted">
        {{ $t('settings.appearance') }}
      </h2>
      <p class="mt-0.5 text-sm text-muted">
        {{ $t('settings.themeHint') }}
      </p>

      <!-- Выбор известен только в браузере: на сервере — заглушка того же размера, чтобы ничего не прыгало.
               На телефоне варианты — во всю ширину карточки, на компьютере — под заголовком, как в макете -->
      <ClientOnly>
        <div
          class="col-span-2 mt-3 grid grid-cols-2 gap-3 sm:col-span-1 sm:col-start-2 sm:flex sm:gap-5"
          role="radiogroup"
          :aria-label="$t('settings.theme')"
        >
          <button
            v-for="theme in THEMES"
            ref="options"
            :key="theme.value"
            type="button"
            role="radio"
            :aria-checked="current === theme.value"
            :tabindex="current === theme.value ? 0 : -1"
            class="relative rounded-xl border p-2.5 pb-0 text-left transition-[border-color,background-color,box-shadow,transform] duration-150 select-none active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-[251px]"
            :class="optionClass(current === theme.value)"
            @click="choose(theme.value)"
            @keydown="onArrow"
          >
            <!-- Мини-экран в цветах своей темы — не зависит от текущей -->
            <div
              class="flex h-[101px] overflow-hidden rounded-lg"
              :class="theme.value === 'dark' ? 'bg-gray-800 ring-1 ring-white/5' : 'bg-white ring-1 ring-gray-200'"
              aria-hidden="true"
            >
              <div
                class="w-1/4 space-y-2.5 px-2.5 py-3"
                :class="theme.value === 'dark' ? 'bg-gray-950' : 'bg-gray-100'"
              >
                <div
                  v-for="i in 3"
                  :key="i"
                  class="h-1.5 rounded-full"
                  :class="theme.value === 'dark' ? 'bg-gray-700' : 'bg-gray-300'"
                />
              </div>
              <div class="flex-1 space-y-3.5 px-2.5 py-3">
                <div class="flex items-center gap-2">
                  <div
                    class="h-[7px] flex-1 rounded-full"
                    :class="theme.value === 'dark' ? 'bg-gray-600' : 'bg-gray-300'"
                  />
                  <div class="h-[7px] w-7 rounded-full bg-green-500" />
                </div>
                <div
                  v-for="i in 3"
                  :key="i"
                  class="h-1.5 rounded-full"
                  :class="theme.value === 'dark' ? 'bg-gray-700' : 'bg-gray-200'"
                />
              </div>
            </div>
            <div class="flex h-10 items-center gap-2 px-1.5">
              <UIcon
                v-if="theme.value === 'light'"
                name="i-lucide-sun"
                class="size-4 shrink-0 text-toned"
              />
              <HubGlyph
                v-else
                name="moon"
                class="size-4 shrink-0 text-toned"
              />
              <span class="text-sm font-semibold text-highlighted">{{ $t(theme.label) }}</span>
            </div>
            <span
              v-if="current === theme.value"
              class="absolute top-2 right-2 grid size-[22px] place-items-center rounded-full bg-green-500 text-gray-950 shadow-sm dark:bg-green-400"
            >
              <HubGlyph
                name="check"
                class="size-3.5"
              />
            </span>
          </button>
        </div>
        <template #fallback>
          <div class="col-span-2 mt-3 grid grid-cols-2 gap-3 sm:col-span-1 sm:col-start-2 sm:flex sm:gap-5">
            <USkeleton
              v-for="i in 2"
              :key="i"
              class="h-[153px] rounded-xl sm:w-[251px]"
            />
          </div>
        </template>
      </ClientOnly>
    </section>

    <!-- Язык известен и серверу (cookie) — без заглушки. Название языка — на нём самом: так его узнаёт тот, кто читает -->
    <section class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 rounded-2xl border border-gray-200 bg-default p-5 shadow-xs sm:gap-x-4 sm:p-6 sm:pb-5 dark:border-white/[0.08] dark:bg-white/[0.025] dark:shadow-none">
      <HubGlyph
        name="languages"
        gradient="violet"
        class="row-span-2 size-8 sm:size-9"
      />
      <h2 class="text-lg font-semibold text-highlighted">
        {{ $t('settings.language') }}
      </h2>
      <p class="mt-0.5 text-sm text-muted">
        {{ $t('settings.languageHint') }}
      </p>
      <div
        class="col-span-2 mt-3.5 grid gap-3 sm:col-span-1 sm:col-start-2 sm:flex sm:flex-wrap sm:gap-5"
        role="radiogroup"
        :aria-label="$t('settings.language')"
      >
        <button
          v-for="code in HUB_LOCALES"
          ref="languages"
          :key="code"
          type="button"
          role="radio"
          :lang="code"
          :aria-checked="locale === code"
          :tabindex="locale === code ? 0 : -1"
          class="flex h-[47px] items-center gap-3 rounded-xl border pr-3 pl-4 text-left transition-[border-color,background-color,box-shadow,transform] duration-150 select-none active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-[204px]"
          :class="optionClass(locale === code)"
          @click="setLocale(code)"
          @keydown="onLanguageArrow"
        >
          <span class="relative size-[26px] shrink-0 overflow-hidden rounded-full ring-1 ring-black/10 dark:ring-white/10">
            <img
              :src="FLAGS[code]"
              alt=""
              width="26"
              height="26"
              class="size-full"
            >
            <span class="absolute inset-0 rounded-full bg-linear-to-b from-white/30 via-transparent to-black/25" />
          </span>
          <span class="min-w-0 flex-1 truncate text-[15px] font-semibold text-highlighted">{{ HUB_LOCALE_NAMES[code] }}</span>
          <span
            v-if="locale === code"
            class="grid size-[22px] shrink-0 place-items-center rounded-full bg-green-500 text-gray-950 shadow-sm dark:bg-green-400"
          >
            <HubGlyph
              name="check"
              class="size-3.5"
            />
          </span>
        </button>
      </div>
    </section>
  </HubPage>
</template>
