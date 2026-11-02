<script setup lang="ts">
// Пейволл Cars 2 (pw-slider): шаблон PwHeroSlider с конфигом этого экрана. Устроен как вариант InApp —
// папку можно перенести в InApp почти без изменений: нужна только реализация окружения поверх его mitt и сторов
import { PwHeroSlider, type PaywallEnv } from '@amaya/paywall-kit'
import type { DsTheme } from '@amaya/ui'
import { config } from './config'

withDefaults(defineProps<{
  env: PaywallEnv
  theme?: DsTheme
  forcePurchasing?: boolean
}>(), {
  theme: undefined,
  forcePurchasing: false
})
</script>

<template>
  <PwHeroSlider
    :env="env"
    :config="config"
    :theme="theme"
    :force-purchasing="forcePurchasing"
  />
</template>
