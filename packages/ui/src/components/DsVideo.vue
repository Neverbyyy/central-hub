<script setup lang="ts">
/**
 * Видео с постером: до нажатия видна только картинка (DsImage) и кнопка «▶», ролик не качается (preload="none").
 * По нажатию — играет со звуком и с родными кнопками плеера: play() вызывается в самом обработчике нажатия,
 * иначе iOS не даст включить звук. Ушло с экрана — пауза. Событие play — для track(), сам компонент аналитику не шлёт.
 * Когда использовать: геймплей на лендинге. Подпись кнопки для скринридера — снаружи (ds.video.play.label).
 * Вид: скругление radius.lp-video, тени shadow.lp-video, рамка color.lp.video-line, кнопка color.video.*.
 */
import { ref } from 'vue'
import { useInView } from '../composables/useInView'
import { usePressed } from '../composables/usePressed'
import type { DsImageSet } from '../image'
import DsIcon from './DsIcon.vue'
import DsImage from './DsImage.vue'

const props = withDefaults(defineProps<{
  src: string
  poster: DsImageSet
  // Подпись кнопки «▶»
  label: string
  // false — постер пока не грузить: первому экрану нужна сеть. Место под видео уже занято
  loadPoster?: boolean
  // Место под видео занято до загрузки — страница не прыгает
  ratio?: string
  type?: string
}>(), {
  loadPoster: true,
  ratio: '16 / 9',
  type: 'video/mp4'
})

const emit = defineEmits<{ play: [] }>()

const root = ref<HTMLElement | null>(null)
const video = ref<HTMLVideoElement | null>(null)
const started = ref(false)
// Постер держится, пока не пошли кадры: без чёрного прямоугольника, пока ролик грузится
const playing = ref(false)
const { pressed, handlers } = usePressed()

function start() {
  if (started.value || !video.value) return
  started.value = true
  video.value.play().catch(() => {
    // Браузер не дал играть сам — остаются родные кнопки плеера
  })
  emit('play')
}

useInView(root, (visible) => {
  if (!visible && video.value && !video.value.paused) video.value.pause()
})
</script>

<template>
  <div
    ref="root"
    class="ds-video ds:relative ds:rounded-lp-video ds:shadow-(--ds-shadow-lp-video)"
    :style="{ aspectRatio: ratio }"
  >
    <div class="ds:absolute ds:inset-0 ds:overflow-hidden ds:rounded-lp-video">
      <video
        ref="video"
        class="ds:size-full ds:object-cover"
        :controls="started"
        preload="none"
        playsinline
        @playing="playing = true"
        @error="playing = true"
      >
        <source
          :src="props.src"
          :type="type"
        >
      </video>
      <DsImage
        v-if="loadPoster && !playing"
        class="ds:pointer-events-none ds:absolute ds:inset-0"
        :set="poster"
        alt=""
        fit="cover"
        loading="lazy"
      />
      <template v-if="!started">
        <button
          type="button"
          class="ds:absolute ds:inset-0 ds:flex ds:items-center ds:justify-center ds:no-select"
          :aria-label="label"
          :data-pressed="pressed ? '' : undefined"
          v-on="handlers"
          @click="start"
        >
          <span class="ds-video__play ds:flex ds:size-lp-play ds:items-center ds:justify-center ds:rounded-full ds:bg-video-play-bg ds:text-video-play-icon ds:transition-transform ds:duration-(--ds-duration-fast) ds:ease-standard">
            <DsIcon
              name="play"
              size="lg"
            />
          </span>
        </button>
      </template>
    </div>
    <!-- Рамка 1 px поверх картинки: у самого блока она ушла бы под постер -->
    <span
      class="ds:pointer-events-none ds:absolute ds:inset-0 ds:rounded-lp-video ds:inset-ring ds:inset-ring-lp-video-line"
      aria-hidden="true"
    />
  </div>
</template>

<style scoped>
/* «Нажато» — на касании */
[data-pressed] .ds-video__play {
  transform: scale(0.92);
}
</style>
