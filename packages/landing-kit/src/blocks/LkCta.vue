<script setup lang="ts">
/** Главная кнопка лендинга по центру: стор по платформе (useLanding().cta). Без config.cta блока нет: вход в стор значками. */
import { DsButton } from '@amaya/ui'
import { useI18n } from 'vue-i18n'
import { useLanding } from '../useLanding'

defineProps<{ source: string }>()

const { config, cta } = useLanding()
const { t } = useI18n()
</script>

<template>
  <div
    v-if="config.cta"
    class="ds:flex ds:justify-center ds:px-6"
  >
    <DsButton
      class="ds:max-w-full"
      variant="lp"
      size="lg"
      :data-cta="source"
      @click="cta(source)"
    >
      {{ t(config.cta) }}
    </DsButton>
  </div>
</template>
