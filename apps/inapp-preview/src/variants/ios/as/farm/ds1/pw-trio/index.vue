<script setup lang="ts">
// Пейволл Farm «On click» (pw-trio): шаблон PwPlusSplit с конфигом этого экрана, устроен как вариант InApp
import { PwPlusSplit, type ScreenProps } from '@amaya/paywall-kit'
import { config } from './config'

defineProps<ScreenProps>()
</script>

<template>
  <PwPlusSplit
    v-bind="$props"
    :config="config"
  />
</template>
