<script setup lang="ts">
// Кто ещё сейчас в сервисе: кружки с инициалами в шапке, в подсказке — где человек и что правит.
// Цвет — тот же, что у метки на ячейке, которую он правит
const { others } = usePresence()

const describe = (person: { name: string, page: string, editing: { key: string, lang: string } | null }) =>
  [person.name, person.page, person.editing ? `правит ${person.editing.key} · ${person.editing.lang.toUpperCase()}` : '']
    .filter(Boolean)
    .join(' — ')

const summary = computed(() => `Сейчас в сервисе: ${others.value.map(person => person.name).join(', ')}`)
</script>

<template>
  <div
    v-if="others.length"
    role="group"
    :aria-label="summary"
    class="flex shrink-0 items-center"
  >
    <UAvatarGroup
      :max="4"
      size="sm"
    >
      <UTooltip
        v-for="person in others"
        :key="person.name"
        :text="describe(person)"
      >
        <UAvatar
          :alt="person.name"
          :style="{ backgroundColor: presenceColor(person.name) }"
          :ui="{ fallback: 'font-semibold text-white' }"
        />
      </UTooltip>
    </UAvatarGroup>
  </div>
</template>
