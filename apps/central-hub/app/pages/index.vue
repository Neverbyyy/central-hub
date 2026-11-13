<script lang="ts" setup>
// Главная: сервисы по группам. Список — app/utils/services.ts, тот же, что в палитре команд
const user = useHubUser()
// Та же палитра, что по Ctrl+K / ⌘K (CommandPalette в лейауте)
const paletteOpen = useCommandPaletteOpen()

const groups = HUB_SERVICE_GROUPS.map(group => ({
  ...group,
  services: HUB_SERVICES.filter(service => service.group === group.id)
}))

// Плитка с иконкой — цветом группы: тексты — основной цвет сервиса, дизайн-система — синий, рабочие стенды — нейтральный
const TILE: Record<HubServiceGroup, string> = {
  texts: 'bg-primary/10 text-primary',
  design: 'bg-info/10 text-info',
  work: 'bg-elevated text-muted ring ring-default'
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-6xl flex-col gap-8 p-4 lg:p-6">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="min-w-0">
        <h1 class="text-2xl font-bold text-highlighted">
          {{ user.firstName ? `Привет, ${user.firstName}` : 'Amaya Central Hub' }}
        </h1>
        <p class="mt-1 text-muted">
          Тексты всех продуктов, дизайн-система и стенды — в одном месте.
        </p>
      </div>

      <UButton
        data-home-search
        icon="i-lucide-search"
        color="neutral"
        variant="outline"
        class="self-start sm:self-auto"
        @click="paletteOpen = true"
      >
        Найти ключ
        <template #trailing>
          <!-- На телефоне клавиатуры нет — подсказка только с 640 px -->
          <span class="ms-2 hidden items-center gap-0.5 sm:flex">
            <UKbd value="meta" />
            <UKbd value="K" />
          </span>
        </template>
      </UButton>
    </header>

    <section
      v-for="group in groups"
      :key="group.id"
      :aria-labelledby="`services-${group.id}`"
    >
      <h2
        :id="`services-${group.id}`"
        class="mb-3 text-xs font-semibold uppercase tracking-wider text-muted"
      >
        {{ group.label }}
      </h2>

      <UPageGrid class="gap-4">
        <!-- Отклик на нажатие — сразу, на касании (active), а не после перехода -->
        <UPageCard
          v-for="service in group.services"
          :key="service.id"
          :title="service.title"
          :description="service.description"
          :to="service.to"
          :target="service.external ? '_blank' : undefined"
          variant="outline"
          class="transition-transform hover:ring-accented active:scale-[0.99]"
          :class="service.id === 'localizations' && 'lg:col-span-2'"
          :ui="{ leading: 'mb-3', description: 'text-sm text-muted', footer: 'pt-3' }"
        >
          <template #leading>
            <span
              class="flex size-10 items-center justify-center rounded-lg"
              :class="TILE[group.id]"
            >
              <UIcon
                :name="service.icon"
                class="size-5"
              />
            </span>
          </template>

          <template #footer>
            <span class="flex items-center gap-1 text-xs text-muted">
              {{ service.external ? serviceHost(service) : 'Открыть' }}
              <UIcon
                :name="service.external ? 'i-lucide-arrow-up-right' : 'i-lucide-arrow-right'"
                class="size-3.5"
              />
            </span>
          </template>
        </UPageCard>
      </UPageGrid>
    </section>
  </div>
</template>
