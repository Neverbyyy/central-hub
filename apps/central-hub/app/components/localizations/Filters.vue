<script setup lang="ts">
import type { StatusFilter } from '~/composables/useLocalizations'

// Фильтры выборки; их состояние живёт в адресе страницы (useLocalizations), ссылкой можно поделиться
const props = defineProps<{
  languages: string[]
  hasFilters: boolean
}>()

const emit = defineEmits<{ reset: [] }>()

const status = defineModel<StatusFilter>('status', { required: true })
const stale = defineModel<boolean>('stale', { required: true })
const missing = defineModel<string>('missing', { required: true })
const recent = defineModel<boolean>('recent', { required: true })
const prefix = defineModel<string>('prefix', { required: true })
const deprecated = defineModel<boolean>('deprecated', { required: true })

// У пунктов выбора не бывает пустого значения — «все» обозначаем отдельно
const ALL = 'all'

const statusItems = [
  { label: 'Все статусы', value: ALL },
  { label: '✦ От ИИ', value: 'ai' },
  { label: 'Не утверждённые', value: 'pending' },
  { label: 'Черновики', value: 'draft' },
  { label: 'Утверждённые', value: 'approved' }
]

const missingItems = computed(() => [
  { label: 'Переведено на все', value: ALL },
  ...props.languages.filter(l => l !== 'en').map(l => ({ label: `Нет перевода: ${l.toUpperCase()}`, value: l }))
])

const statusModel = computed({
  get: () => status.value || ALL,
  set: (value: string) => {
    status.value = (value === ALL ? '' : value) as StatusFilter
  }
})

const missingModel = computed({
  get: () => missing.value || ALL,
  set: (value: string) => {
    missing.value = value === ALL ? '' : value
  }
})

// Раздел — хлебными крошками: клик по части пути переводит фильтр на этот уровень, × снимает его целиком.
// Любой уровень — один клик, сколько бы ни было вложенности
const crumbs = computed(() => {
  const parts = prefix.value.replace(/\.$/, '').split('.')
  return parts.map((label, i) => ({ label, prefix: `${parts.slice(0, i + 1).join('.')}.` }))
})

const { copy } = useCopy()

const copyLink = () => copy(window.location.href, 'Ссылка на выборку скопирована')
</script>

<template>
  <div class="flex shrink-0 flex-wrap items-center gap-2 border-b border-default px-4 py-2">
    <USelect
      v-model="statusModel"
      :items="statusItems"
      size="sm"
      class="w-40"
    />
    <USelect
      v-model="missingModel"
      :items="missingItems"
      size="sm"
      class="w-48"
    />
    <UButton
      size="sm"
      icon="i-lucide-history"
      :color="stale ? 'warning' : 'neutral'"
      :variant="stale ? 'soft' : 'outline'"
      title="Английский поменяли после перевода — перевод нужно сверить"
      @click="stale = !stale"
    >
      Перевод устарел
    </UButton>
    <UButton
      size="sm"
      icon="i-lucide-archive"
      :color="deprecated ? 'warning' : 'neutral'"
      :variant="deprecated ? 'soft' : 'outline'"
      title="Ключи, помеченные устаревшими: их нет в таблице и выгрузках, вернуть можно в любой момент"
      @click="deprecated = !deprecated"
    >
      Ключ устарел
    </UButton>
    <UButton
      size="sm"
      icon="i-lucide-calendar-clock"
      :color="recent ? 'primary' : 'neutral'"
      :variant="recent ? 'soft' : 'outline'"
      @click="recent = !recent"
    >
      За неделю
    </UButton>
    <UBadge
      v-if="prefix"
      color="neutral"
      variant="subtle"
      size="lg"
      class="gap-1 font-mono"
    >
      <nav
        aria-label="Раздел"
        class="flex items-center gap-0.5"
      >
        <template
          v-for="(crumb, i) in crumbs"
          :key="crumb.prefix"
        >
          <span
            v-if="i"
            class="text-gray-300 dark:text-gray-600"
            aria-hidden="true"
          >›</span>
          <button
            v-if="i < crumbs.length - 1"
            type="button"
            class="text-muted underline-offset-2 hover:text-highlighted hover:underline"
            :title="`Перейти к ${crumb.prefix}`"
            @click="prefix = crumb.prefix"
          >
            {{ crumb.label }}
          </button>
          <span
            v-else
            class="text-highlighted"
            aria-current="location"
          >{{ crumb.label }}</span>
        </template>
      </nav>
      <button
        type="button"
        class="ml-1 text-muted hover:text-default"
        aria-label="Убрать раздел"
        title="Убрать раздел"
        @click="prefix = ''"
      >
        <UIcon
          name="i-lucide-x"
          class="size-3"
        />
      </button>
    </UBadge>

    <div class="ml-auto flex items-center gap-1">
      <UButton
        v-if="hasFilters"
        size="sm"
        variant="ghost"
        color="neutral"
        icon="i-lucide-x"
        @click="emit('reset')"
      >
        Сбросить
      </UButton>
      <UButton
        size="sm"
        variant="ghost"
        color="neutral"
        icon="i-lucide-link"
        @click="copyLink"
      >
        Ссылка на выборку
      </UButton>
    </div>
  </div>
</template>
