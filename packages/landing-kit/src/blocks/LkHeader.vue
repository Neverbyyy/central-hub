<script setup lang="ts">
/** Шапка лендинга: логотип на цветной секции. */
import { DsImage } from '@amaya/ui'
import { useI18n } from 'vue-i18n'
import { useLanding } from '../useLanding'

const { config } = useLanding()
const { t } = useI18n()
</script>

<template>
  <header class="ds:bg-lp-section ds:px-14 ds:py-6 ds:wide:px-12">
    <div class="ds:h-lp-logo-h ds:w-lp-logo-w">
      <DsImage
        :src="config.header.logo"
        :alt="t(config.header.logoLabel)"
      />
    </div>
  </header>
</template>
