<script setup lang="ts">
// Кто сейчас в сервисе — справа в шапке: кружки коллег и «N онлайн» (вместе с вами).
// Наведение на кружок — подсказка: имя, устройство, где человек, сколько уже здесь, что правит.
// Нажатие на полосу (и пальцем на телефоне, где наведения нет) — список всех, правку коллеги можно открыть ссылкой.
// Цвет человека — тот же, что у метки на ячейке, которую он правит
const { others, me, online } = usePresence()
const now = useNow({ interval: 30_000 })
const { lg } = useScreen()

// Кружков — не больше четырёх (на узком экране — двух), остальные — «+N»
const max = computed(() => (lg.value ? 4 : 2))
const shown = computed(() => others.value.slice(0, max.value))
const hidden = computed(() => others.value.length - shown.value.length)

const summary = computed(() => {
  const names = others.value.map(person => person.name)
  const who = names.length ? `${names.join(', ')} и вы` : 'только вы'
  return `Сейчас в сервисе ${online.value} — ${who}. Показать список`
})
</script>

<template>
  <UPopover
    v-if="me || others.length"
    :content="{ align: 'end', sideOffset: 8 }"
  >
    <button
      type="button"
      class="flex shrink-0 items-center gap-2 rounded-full py-1 pe-3 ps-1 transition-colors hover:bg-elevated active:scale-[0.98]"
      :aria-label="summary"
    >
      <span
        v-if="shown.length"
        class="flex items-center"
      >
        <UTooltip
          v-for="(person, index) in shown"
          :key="person.name"
          :delay-duration="150"
          :content="{ side: 'bottom', sideOffset: 8 }"
          :ui="{ content: 'h-auto w-72 px-3 py-2.5' }"
        >
          <PresenceAvatar
            :name="person.name"
            class="ring-2 ring-(--ui-bg)"
            :class="index ? '-ms-1.5' : ''"
          />
          <template #content>
            <PresenceCard
              :person="person"
              :now="now.getTime()"
              class="w-full"
            />
          </template>
        </UTooltip>
        <UAvatar
          v-if="hidden"
          :text="`+${hidden}`"
          size="sm"
          class="-ms-1.5 ring-2 ring-(--ui-bg)"
        />
      </span>

      <span class="flex items-center gap-1.5 text-sm text-muted">
        <span class="size-2 rounded-full bg-success" />
        {{ online }} онлайн
      </span>
    </button>

    <template #content>
      <div class="w-80 p-1.5">
        <p class="px-2 pb-1.5 pt-1 text-xs font-semibold uppercase tracking-wide text-muted">
          Сейчас в сервисе · {{ online }}
        </p>
        <ul class="flex flex-col">
          <li
            v-for="person in others"
            :key="person.name"
            class="rounded-md px-2 py-2 hover:bg-elevated"
          >
            <PresenceCard
              :person="person"
              :now="now.getTime()"
              linkable
            />
          </li>
          <li
            v-if="me"
            class="mt-1 border-t border-default px-2 pb-1 pt-2.5"
          >
            <PresenceCard
              :person="me"
              :now="now.getTime()"
              self
            />
          </li>
        </ul>
        <p
          v-if="!others.length"
          class="px-2 pb-1 pt-2 text-xs text-muted"
        >
          Кроме вас, сейчас никого нет.
        </p>
      </div>
    </template>
  </UPopover>
</template>
