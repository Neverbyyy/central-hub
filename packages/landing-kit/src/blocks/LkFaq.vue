<script setup lang="ts">
/** Вопросы и ответы: заголовок на цветной секции и аккордеон (DsAccordion) в карточках, как у отзывов. */
import { DsAccordion } from '@amaya/ui'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { track } from '../track'
import { useLanding } from '../useLanding'

const { config } = useLanding()
const { t } = useI18n()

const items = computed(() => (config.faq?.items ?? []).map(item => ({ id: item.id, question: t(item.question), answer: t(item.answer) })))
const onToggle = (id: string, open: boolean) => track('faq_toggle', { landing: config.id, id, open })
</script>

<template>
  <section
    v-if="config.faq"
    class="ds:px-6 ds:wide:px-22.5"
  >
    <h2 class="ds:m-0 ds:mb-6 ds:text-center ds:font-display ds:text-lp-section-title ds:text-lp-on-section">
      {{ t(config.faq.title) }}
    </h2>
    <DsAccordion
      :id="`${config.id}-faq`"
      :items="items"
      @toggle="onToggle"
    />
  </section>
</template>
