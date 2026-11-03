<script setup lang="ts">
// Cars 2 с живой карточкой (Rive) — для сравнения с картинкой, пока в анимации нет плиток-иконок (см. config.ts, live)
import { PwHeroSlider, type PaywallEnv } from '@amaya/paywall-kit'
import { config, live } from '../variants/ios/as/cars2/ds1/pw-slider/config'

defineProps<{ env: PaywallEnv, forcePurchasing?: boolean }>()
const withLive = { ...config, art: { ...config.art, live } }
</script>

<template>
  <PwHeroSlider
    :env="env"
    :config="withLive"
    :force-purchasing="forcePurchasing"
  />
</template>
