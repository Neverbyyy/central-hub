<script setup lang="ts">
/**
 * Картинка по конвенции small/medium/large × 1x/2x × png/webp: браузер сам берёт размер под экран (телефон от 844 px, iPad — от 844 px при высоте от 600),
 * webp — где понимает, иначе png. Один файл (например, SVG значка) — проп src.
 * Когда использовать: любая картинка — арт, иконка игры, значок стора. <img> напрямую не пишем.
 * ratio занимает место до загрузки — экран не прыгает; событие load — для «готов» у пейволла.
 */
import { computed } from 'vue'
import { imageSources, srcset, type DsImageSet } from '../image'

const props = withDefaults(defineProps<{
  set?: DsImageSet
  src?: string
  // Текст для скринридера ключом из сервиса; '' — картинка-украшение
  alt: string
  fit?: 'contain' | 'cover'
  // right-bottom — арт, у которого важное справа внизу (первый экран лендинга Cars 2)
  position?: 'center' | 'top' | 'bottom' | 'right-bottom'
  // fill — во всю ширину блока; intrinsic — по высоте блока, ширина своя (значки)
  size?: 'fill' | 'intrinsic'
  // «16 / 9»: место под картинку занято до загрузки
  ratio?: string
  loading?: 'eager' | 'lazy'
  priority?: 'high' | 'low' | 'auto'
}>(), {
  set: undefined,
  src: undefined,
  fit: 'contain',
  position: 'center',
  size: 'fill',
  ratio: undefined,
  loading: 'eager',
  priority: 'auto'
})

const emit = defineEmits<{ load: [], error: [] }>()

const sources = computed(() => (props.set ? imageSources(props.set) : []))
// <img>: png small для браузеров без webp; без png — webp
const img = computed(() => {
  if (!props.set) return { src: props.src, srcset: undefined }
  const small = props.set.small
  return small.png
    ? { src: small.png, srcset: srcset(small.png, small.png2x) || undefined }
    : { src: small.webp, srcset: srcset(small.webp, small.webp2x) || undefined }
})

const FIT = { contain: 'ds:object-contain', cover: 'ds:object-cover' }
const POSITION = { 'center': 'ds:object-center', 'top': 'ds:object-top', 'bottom': 'ds:object-bottom', 'right-bottom': 'ds:object-right-bottom' }
const SIZE = { fill: 'ds:h-full ds:w-full', intrinsic: 'ds:h-full ds:w-auto' }
</script>

<template>
  <picture
    class="ds:block"
    :style="ratio ? { aspectRatio: ratio } : undefined"
  >
    <source
      v-for="source in sources"
      :key="source.key"
      :media="source.media"
      :type="source.type"
      :srcset="source.srcset"
    >
    <img
      :src="img.src"
      :srcset="img.srcset"
      :alt="alt"
      :loading="loading"
      :fetchpriority="priority"
      decoding="async"
      class="ds:block"
      :class="[SIZE[size], FIT[fit], POSITION[position]]"
      @load="emit('load')"
      @error="emit('error')"
    >
  </picture>
</template>
