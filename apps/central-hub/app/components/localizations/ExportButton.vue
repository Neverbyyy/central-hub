<script setup lang="ts">
// «Выгрузить в код» — главное действие сервиса, выделено. Бадж — сколько PR выгрузки открыто и ждёт мержа,
// у всех сразу (useOpenPrs слушает вебхук GitHub), в подсказке — какие и кто выгрузил
defineEmits<{ click: [] }>()

const { openPrs } = useOpenPrs()
</script>

<template>
  <!-- У тултипа Nuxt UI высота в одну строку (h-6): список PR вылезал бы за фон -->
  <UTooltip
    :disabled="!openPrs.length"
    :content="{ side: 'bottom' }"
    :ui="{ content: 'h-auto px-3 py-2' }"
  >
    <UButton
      icon="i-lucide-git-pull-request"
      color="neutral"
      class="relative"
      :title="$t('exportButton.label')"
      @click="$emit('click')"
    >
      <!-- Главное действие видно всегда; уже 768 px — значком с баджем -->
      <span class="max-md:sr-only">{{ $t('exportButton.label') }}</span>
      <template
        v-if="openPrs.length"
        #trailing
      >
        <span
          class="absolute -right-1.5 -top-1.5 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] font-semibold leading-4 text-inverted ring-2 ring-(--ui-bg)"
          :aria-label="$t('exportButton.openCount', { count: openPrs.length })"
        >{{ openPrs.length }}</span>
      </template>
    </UButton>
    <template #content>
      <div class="text-xs">
        <p class="mb-1.5 text-muted">
          {{ $t('exportButton.waiting', openPrs.length) }}
        </p>
        <div class="grid grid-cols-[auto_auto] gap-x-4 gap-y-1">
          <template
            v-for="pr in openPrs"
            :key="pr.set"
          >
            <span class="font-medium">{{ projectName(pr.set) }} #{{ pr.number }}</span>
            <span class="text-muted">{{ pr.actor ? `${pr.actor} · ${formatDateTime(pr.at, { year: false })}` : '' }}</span>
          </template>
        </div>
      </div>
    </template>
  </UTooltip>
</template>
