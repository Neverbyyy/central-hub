<script setup lang="ts">
definePageMeta({ title: 'Настройки' })

// Настройки этого браузера. Пока одна — тема; выбор хранит @nuxtjs/color-mode, без выбора — светлая
const colorMode = useColorMode()

const THEMES = [
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' }
] as const

const current = computed(() => (colorMode.preference === 'dark' ? 'dark' : 'light'))

const choose = (theme: 'light' | 'dark') => {
  colorMode.preference = theme
}

// Как у обычной группы радиокнопок: Tab попадает только на выбранную, стрелки переключают
const options = useTemplateRef<HTMLButtonElement[]>('options')
const onArrow = (event: KeyboardEvent) => {
  const step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[event.key]
  if (!step) return
  event.preventDefault()
  const index = (THEMES.findIndex(t => t.value === current.value) + step + THEMES.length) % THEMES.length
  choose(THEMES[index]!.value)
  options.value?.[index]?.focus()
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-6 py-8">
    <h1 class="text-lg font-semibold text-highlighted">
      Настройки
    </h1>

    <section class="mt-8">
      <h2 class="text-sm font-semibold text-highlighted">
        Оформление
      </h2>
      <p class="mt-0.5 text-xs text-muted">
        Тема интерфейса
      </p>

      <!-- Выбор известен только в браузере: на сервере — заглушка того же размера, чтобы ничего не прыгало -->
      <ClientOnly>
        <div
          class="mt-3 grid max-w-md grid-cols-2 gap-4"
          role="radiogroup"
          aria-label="Тема"
        >
          <button
            v-for="theme in THEMES"
            ref="options"
            :key="theme.value"
            type="button"
            role="radio"
            :aria-checked="current === theme.value"
            :tabindex="current === theme.value ? 0 : -1"
            class="rounded-xl border-2 p-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            :class="current === theme.value ? 'border-primary' : 'border-default hover:border-accented'"
            @click="choose(theme.value)"
            @keydown="onArrow"
          >
            <!-- Мини-экран в цветах своей темы — не зависит от текущей -->
            <div
              class="flex h-24 overflow-hidden rounded-lg border"
              :class="theme.value === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'"
              aria-hidden="true"
            >
              <div
                class="w-1/4 space-y-1.5 p-2"
                :class="theme.value === 'dark' ? 'bg-gray-950' : 'bg-gray-50'"
              >
                <div
                  v-for="i in 3"
                  :key="i"
                  class="h-1.5 rounded-full"
                  :class="theme.value === 'dark' ? 'bg-gray-700' : 'bg-gray-200'"
                />
              </div>
              <div class="flex-1 space-y-2 p-2">
                <div class="flex gap-1.5">
                  <div
                    class="h-2 flex-1 rounded-full"
                    :class="theme.value === 'dark' ? 'bg-gray-700' : 'bg-gray-200'"
                  />
                  <div class="h-2 w-6 rounded-full bg-green-500" />
                </div>
                <div
                  v-for="i in 4"
                  :key="i"
                  class="h-1.5 rounded-full"
                  :class="theme.value === 'dark' ? 'bg-gray-800' : 'bg-gray-100'"
                />
              </div>
            </div>
            <div class="mt-2 flex items-center justify-between px-1">
              <span class="text-sm font-medium text-highlighted">{{ theme.label }}</span>
              <UIcon
                v-if="current === theme.value"
                name="i-lucide-circle-check"
                class="size-4 text-primary"
              />
            </div>
          </button>
        </div>
        <template #fallback>
          <div class="mt-3 grid max-w-md grid-cols-2 gap-4">
            <USkeleton
              v-for="i in 2"
              :key="i"
              class="h-[144px] rounded-xl"
            />
          </div>
        </template>
      </ClientOnly>
    </section>
  </div>
</template>
