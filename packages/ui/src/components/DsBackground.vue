<script setup lang="ts">
/**
 * Фон экрана или блока по конвенции small/medium/large × 1x/2x × png/webp: картинка на всю площадь (cover) под содержимым.
 * Когда использовать: арт за экраном или карточкой. Сделан картинкой <picture>, а не background-image:
 * так работают ленивая загрузка и событие load (у пейволла «готов» — только когда арт загрузился).
 */
import type { DsImageSet } from '../image'
import DsImage from './DsImage.vue'

withDefaults(defineProps<{
  set: DsImageSet
  position?: 'center' | 'top' | 'bottom'
  loading?: 'eager' | 'lazy'
  priority?: 'high' | 'low' | 'auto'
}>(), {
  position: 'center',
  loading: 'eager',
  priority: 'auto'
})

const emit = defineEmits<{ load: [], error: [] }>()
</script>

<template>
  <div class="ds:relative ds:overflow-hidden">
    <DsImage
      :set="set"
      alt=""
      fit="cover"
      :position="position"
      :loading="loading"
      :priority="priority"
      class="ds:absolute ds:inset-0 ds:h-full ds:w-full"
      @load="emit('load')"
      @error="emit('error')"
    />
    <div class="ds:relative">
      <slot />
    </div>
  </div>
</template>
