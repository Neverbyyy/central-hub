<script setup lang="ts">
/** Видео геймплея над синим блоком отзывов: до нажатия — постер, ролик не качается (DsVideo). */
import { DsVideo } from '@amaya/ui'
import { useI18n } from 'vue-i18n'
import { track } from '../track'
import { useLanding } from '../useLanding'

withDefaults(defineProps<{
  // Без отступа сверху и заезда на блок снизу: заголовок и фон — у раскладки
  plain?: boolean
}>(), {
  plain: false
})

const { config, heroLoaded } = useLanding()
const { t } = useI18n()
const onPlay = () => track('video_play', { landing: config.id })
</script>

<template>
  <section
    v-if="config.video"
    class="ds:relative ds:z-10 ds:px-6"
    :class="plain ? '' : 'ds:mt-24 ds:wide:mt-11'"
  >
    <DsVideo
      :src="config.video.src"
      :poster="config.video.poster"
      :load-poster="heroLoaded"
      :label="t(config.video.label)"
      @play="onPlay"
    />
  </section>
</template>
