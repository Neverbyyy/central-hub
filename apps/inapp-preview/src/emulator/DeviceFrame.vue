<script setup lang="ts">
// Рамка устройства эмулятора: вебвью в логическом размере, зоны Duo поверх него и заглушка «экран закрыт».
// Экран уменьшается под свободное место, как в DevTools. Инструмент разработки: подписи по-русски, свой CSS
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Screen } from './devices'

const props = defineProps<{
  screen: Screen
  src: string | null
  reloadKey: number
  zones: boolean
  closed: boolean
  shown: boolean
}>()

defineEmits<{ open: [] }>()

// Рамка вокруг экрана не должна упираться в края
const MARGIN = 48

const stage = ref<HTMLElement | null>(null)
const stageSize = ref({ width: 0, height: 0 })
const scale = computed(() => Math.min(1, (stageSize.value.width - MARGIN) / props.screen.width, (stageSize.value.height - MARGIN) / props.screen.height))
const radius = computed(() => props.screen.radii.map(value => `${value}px`).join(' '))
const pose = computed(() => (props.zones ? props.screen.duo : undefined))

let observer: ResizeObserver | undefined
onMounted(() => {
  if (!stage.value) return
  observer = new ResizeObserver(([item]) => {
    stageSize.value = { width: item!.contentRect.width, height: item!.contentRect.height }
  })
  observer.observe(stage.value)
})
onBeforeUnmount(() => observer?.disconnect())

// Эмулятор говорит с окном этого iframe
const frame = ref<HTMLIFrameElement | null>(null)
defineExpose({ frame })
</script>

<template>
  <main
    ref="stage"
    class="emu-stage"
  >
    <div
      class="emu-device"
      :style="{ width: `${screen.width}px`, height: `${screen.height}px`, transform: `scale(${scale})`, borderRadius: radius }"
    >
      <iframe
        v-if="src"
        :key="reloadKey"
        ref="frame"
        class="emu-frame"
        :src="src"
        title="Экран InApp"
      />
      <svg
        v-if="pose"
        class="emu-zones"
        :viewBox="`0 0 ${pose.width} ${pose.height}`"
        aria-hidden="true"
      >
        <rect
          v-if="pose.insets.top"
          x="0"
          y="0"
          :width="pose.width"
          :height="pose.insets.top"
          class="emu-zone--inset"
        />
        <rect
          v-if="pose.insets.bottom"
          x="0"
          :y="pose.height - pose.insets.bottom"
          :width="pose.width"
          :height="pose.insets.bottom"
          class="emu-zone--inset"
        />
        <rect
          v-if="pose.insets.left"
          x="0"
          y="0"
          :width="pose.insets.left"
          :height="pose.height"
          class="emu-zone--inset"
        />
        <rect
          v-if="pose.insets.right"
          :x="pose.width - pose.insets.right"
          y="0"
          :width="pose.insets.right"
          :height="pose.height"
          class="emu-zone--inset"
        />
        <rect
          :x="pose.insets.left"
          :y="pose.insets.top"
          :width="pose.width - pose.insets.left - pose.insets.right"
          :height="pose.height - pose.insets.top - pose.insets.bottom"
          class="emu-zone--safe"
        />
        <rect
          :x="pose.island[0]"
          :y="pose.island[1]"
          :width="pose.island[2]"
          :height="pose.island[3]"
          class="emu-zone--system"
        />
        <rect
          v-if="pose.camera"
          :x="pose.camera[0]"
          :y="pose.camera[1]"
          :width="pose.camera[2]"
          :height="pose.camera[3]"
          rx="18"
          class="emu-zone--camera"
        />
        <rect
          v-if="pose.innerCamera"
          :x="pose.innerCamera[0]"
          :y="pose.innerCamera[1]"
          :width="pose.innerCamera[2]"
          :height="pose.innerCamera[3]"
          rx="12"
          class="emu-zone--system"
        />
      </svg>
      <div
        v-if="closed"
        class="emu-closed"
      >
        <p>Экран закрыт{{ shown ? '' : ' и не показывался' }}</p>
        <button
          type="button"
          @click="$emit('open')"
        >
          Открыть снова
        </button>
      </div>
    </div>
  </main>
</template>

<style scoped>
.emu-stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #2a2d33;
}

.emu-device {
  position: relative;
  flex-shrink: 0;
  overflow: hidden;
  /* Под вебвью — игра: экран InApp прозрачный, как в приложении */
  background: linear-gradient(160deg, #3b6f9e, #1e3348);
  box-shadow: 0 0 0 10px #0d0e10, 0 20px 60px rgb(0 0 0 / 0.5);
}

.emu-frame {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  background: transparent;
}

.emu-zones {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.emu-zone--inset {
  fill: rgb(255 105 180 / 0.25);
}

.emu-zone--safe {
  fill: none;
  stroke: rgb(46 204 113 / 0.9);
  stroke-width: 2;
  stroke-dasharray: 6 4;
}

.emu-zone--system {
  fill: rgb(142 68 173 / 0.55);
}

.emu-zone--camera {
  fill: rgb(20 20 20 / 0.9);
  stroke: rgb(142 68 173 / 0.9);
  stroke-width: 2;
}

.emu-closed {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #fff;
  background: rgb(0 0 0 / 0.55);
}

.emu-closed p {
  margin: 0;
}
</style>
