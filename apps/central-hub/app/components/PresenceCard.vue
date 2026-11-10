<script setup lang="ts">
// Человек в сервисе: кружок с инициалами, имя, устройство, где он, сколько уже здесь и что правит.
// Одна и та же карточка — в подсказке над аватаром и в списке «Сейчас в сервисе»
import type { PresencePerson } from '~/utils/presence'

const props = defineProps<{
  person: PresencePerson
  now: number
  // «вы» рядом с именем — своя карточка в списке
  self?: boolean
  // Правку можно открыть ссылкой (в списке); в подсказке ссылки не нажать — простой текст
  linkable?: boolean
}>()

const device = computed(() => PRESENCE_DEVICE[props.person.device])
const duration = computed(() => presenceDuration(props.person.since, props.now))
const editingTo = computed(() => (props.person.editing ? keyRoute(props.person.editing.key) : undefined))
</script>

<template>
  <div class="flex min-w-0 items-start gap-2.5">
    <PresenceAvatar
      :name="person.name"
      class="shrink-0"
    />
    <div class="min-w-0 flex-1 text-xs leading-5">
      <div class="flex items-center gap-1.5">
        <span class="truncate text-sm font-medium text-highlighted">{{ person.name }}</span>
        <span
          v-if="self"
          class="text-muted"
        >вы</span>
        <UIcon
          :name="device.icon"
          class="ms-auto size-3.5 shrink-0 text-muted"
          :aria-label="device.label"
        />
      </div>
      <p class="truncate text-muted">
        {{ person.page || 'В сервисе' }}<template v-if="duration">
          · в сервисе {{ duration }}
        </template>
      </p>
      <p
        v-if="person.editing"
        class="flex min-w-0 items-center gap-1"
      >
        <UIcon
          name="i-lucide-pencil"
          class="size-3 shrink-0"
          :style="{ color: presenceColor(person.name) }"
        />
        <span class="shrink-0">Правит</span>
        <ULink
          v-if="linkable && editingTo"
          :to="editingTo"
          :title="person.editing.key"
          class="truncate font-mono text-[11px] text-highlighted underline-offset-2 hover:underline"
        >{{ person.editing.key }}</ULink>
        <span
          v-else
          :title="person.editing.key"
          class="truncate font-mono text-[11px] text-highlighted"
        >{{ person.editing.key }}</span>
        <span class="shrink-0 font-semibold">{{ person.editing.lang.toUpperCase() }}</span>
      </p>
    </div>
  </div>
</template>
