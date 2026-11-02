<script setup lang="ts">
// Пейволл Farm «On click» (pw-trio): шаблон PwPlusSplit с конфигом этого экрана, устроен как вариант InApp
import { PwPlusSplit, type PaywallEnv } from '@amaya/paywall-kit'
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
  <PwPlusSplit
    :env="env"
    :config="config"
    :theme="theme"
    :force-purchasing="forcePurchasing"
  />
</template>
