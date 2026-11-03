<script setup lang="ts">
/**
 * Аккордеон: вопросы и ответы (FAQ). Пункты — массивом { id, question, answer }, тексты — ключами из сервиса.
 * Вопрос — кнопка с aria-expanded и aria-controls; ↑/↓, Home, End переводят фокус между вопросами (шаблон WAI-ARIA).
 * Открыть можно несколько сразу. Высота меняется сразу, ответ проявляется через opacity и transform — анимируются
 * только они. id — пространство имён для id вопросов и ответов (одинаковые на сервере и в браузере, без счётчиков).
 * Когда использовать: FAQ на лендинге. Вид — карточки как у отзывов: surface.lp-card, shadow.lp-card, radius.lp-card.
 */
import { ref } from 'vue'
import type { DsAccordionItem } from '../types'
import DsIcon from './DsIcon.vue'

const props = withDefaults(defineProps<{
  id: string
  items: DsAccordionItem[]
  // Уровень заголовков вопросов в структуре страницы
  headingLevel?: 2 | 3 | 4
  // Открытые с самого начала
  defaultOpen?: string[]
}>(), {
  headingLevel: 3,
  defaultOpen: () => []
})

const emit = defineEmits<{ toggle: [id: string, open: boolean] }>()

const open = ref(new Set(props.defaultOpen))
const root = ref<HTMLElement | null>(null)

const questionId = (item: DsAccordionItem) => `${props.id}-${item.id}-q`
const answerId = (item: DsAccordionItem) => `${props.id}-${item.id}-a`

function toggle(item: DsAccordionItem) {
  const next = new Set(open.value)
  const isOpen = !next.has(item.id)
  if (isOpen) next.add(item.id)
  else next.delete(item.id)
  open.value = next
  emit('toggle', item.id, isOpen)
}

// Стрелки, Home и End — между вопросами; Enter и Space нажимают кнопку сами
function onKeydown(event: KeyboardEvent) {
  const buttons = [...(root.value?.querySelectorAll<HTMLButtonElement>('[data-accordion-question]') ?? [])]
  const index = buttons.indexOf(event.target as HTMLButtonElement)
  if (index < 0) return
  const last = buttons.length - 1
  const target = { ArrowDown: index === last ? 0 : index + 1, ArrowUp: index === 0 ? last : index - 1, Home: 0, End: last }[event.key]
  if (target === undefined) return
  event.preventDefault()
  buttons[target]?.focus()
}
</script>

<template>
  <div
    ref="root"
    class="ds:flex ds:flex-col ds:space-y-3"
    @keydown="onKeydown"
  >
    <div
      v-for="item in items"
      :key="item.id"
      class="ds:rounded-lp-card ds:surface-lp-card ds:shadow-(--ds-shadow-lp-card)"
      :data-open="open.has(item.id) ? '' : undefined"
    >
      <component
        :is="`h${headingLevel}`"
        class="ds:m-0"
      >
        <button
          :id="questionId(item)"
          type="button"
          class="ds:flex ds:min-h-touch ds:w-full ds:items-center ds:justify-between ds:px-6 ds:py-4 ds:text-start ds:font-display ds:text-lp-question ds:text-lp-text"
          :aria-expanded="open.has(item.id)"
          :aria-controls="answerId(item)"
          data-accordion-question
          @click="toggle(item)"
        >
          <span class="ds:me-3">{{ item.question }}</span>
          <span
            class="ds:inline-flex ds:shrink-0 ds:transition-transform ds:duration-(--ds-duration-base) ds:ease-standard"
            :class="open.has(item.id) ? 'ds:rotate-180' : ''"
          >
            <DsIcon name="chevron-down" />
          </span>
        </button>
      </component>
      <div
        v-show="open.has(item.id)"
        :id="answerId(item)"
        role="region"
        :aria-labelledby="questionId(item)"
        class="ds-accordion__answer ds:px-6 ds:pb-5 ds:font-lp-body ds:text-lp-review ds:text-lp-text"
      >
        {{ item.answer }}
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Ответ проявляется и чуть съезжает вниз: анимация запускается заново при каждом показе (display: none → block) */
.ds-accordion__answer {
  animation: ds-accordion-in var(--ds-duration-base) var(--ds-ease-standard);
}

@keyframes ds-accordion-in {
  from {
    opacity: 0;
    transform: translateY(calc(var(--ds-spacing) * -1));
  }
}

@media (prefers-reduced-motion: reduce) {
  .ds-accordion__answer {
    animation: none;
  }
}
</style>
