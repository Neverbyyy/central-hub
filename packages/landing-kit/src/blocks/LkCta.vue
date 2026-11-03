<script setup lang="ts">
/** Главная кнопка лендинга по центру: стор по платформе (useLanding().cta). source — откуда нажали, для track. */
import { DsButton } from '@amaya/ui'
import { useI18n } from 'vue-i18n'
import { useLanding } from '../useLanding'

defineProps<{ source: string }>()

const { config, cta } = useLanding()
const { t } = useI18n()
</script>

<template>
  <div class="ds:flex ds:justify-center ds:px-6">
    <DsButton
      variant="lp"
      size="lg"
      :data-cta="source"
      @click="cta(source)"
    >
      {{ t(config.cta) }}
    </DsButton>
  </div>
</template>
