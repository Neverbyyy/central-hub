<script setup lang="ts">
// Каркас страниц «Настройки» и «MCP» — одинаковые фон, отступы, ширина и шапка: плитка с иконкой, заголовок, подзаголовок.
// Фон — глубже, чем у остальных страниц в тёмной теме, как в макетах; слот decor — свой свет по краям (на телефоне не
// нужен: резал бы карточки), tile — цвет плитки, слот icon — иконка на ней.
// Контент — по центру и не шире 1280px (решение владельца): на широком мониторе карточки не растягиваются
defineProps<{ title: string, subtitle: string, tile: string }>()
defineSlots<{ default: () => unknown, icon: () => unknown, decor?: () => unknown }>()
</script>

<template>
  <div class="relative isolate min-h-full overflow-hidden bg-muted dark:bg-default">
    <div
      class="pointer-events-none absolute inset-0 -z-10 max-sm:hidden"
      aria-hidden="true"
    >
      <slot name="decor" />
    </div>
    <div class="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-9">
      <header class="flex items-center gap-4 sm:gap-6">
        <div
          class="grid size-14 shrink-0 place-items-center rounded-2xl ring-1 ring-inset sm:size-[72px] sm:rounded-[20px]"
          :class="tile"
        >
          <slot name="icon" />
        </div>
        <div class="min-w-0">
          <h1 class="text-2xl font-bold tracking-tight text-highlighted sm:text-[28px]">
            {{ title }}
          </h1>
          <p class="mt-1 max-w-[34rem] text-sm text-muted sm:text-[15px]">
            {{ subtitle }}
          </p>
        </div>
      </header>
      <slot />
    </div>
  </div>
</template>
