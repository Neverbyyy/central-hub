<script setup lang="ts">
// Пейволл Cars 2 (pw-slider): шаблон PwHeroSlider с конфигом этого экрана. Устроен как вариант InApp — папку можно
// перенести в InApp почти без изменений: нужна только реализация окружения поверх его mitt и сторов
import { PwHeroSlider, type ScreenProps } from '@amaya/paywall-kit'
import { config } from './config'

defineProps<ScreenProps>()
</script>

<template>
  <PwHeroSlider
    v-bind="$props"
    :config="config"
  />
</template>
