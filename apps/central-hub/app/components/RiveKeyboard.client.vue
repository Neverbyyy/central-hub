<script lang="ts" setup>
import { ref, shallowRef, onUnmounted, watch } from 'vue'
import { Rive, Layout, Fit, Alignment } from '@rive-app/webgl2'
import keyboardAsset from '@/assets/rive/piano.riv?url'

const riveCanvas = ref<HTMLCanvasElement | null>(null)
const riveInstance = shallowRef<any>(null)
let observer: ResizeObserver | null = null

function createRive() {
  if (!riveCanvas.value || riveInstance.value) return

  riveInstance.value = new Rive({
    src: keyboardAsset,
    canvas: riveCanvas.value,
    autoplay: true,
    artboard: 'Main',
    stateMachines: 'State Machine 1',
    shouldDisableRiveListeners: false,
    layout: new Layout({
      fit: Fit.FitWidth,
      alignment: Alignment.Center,
    }),
    onLoad: () => {
      const r = riveInstance.value
      if (!riveCanvas.value || !r) return

      // Берём оригинальные размеры артборда и считаем высоту под текущую ширину
      const bounds = r.bounds
      const canvasWidth = riveCanvas.value.clientWidth
      const ratio = bounds.maxY / bounds.maxX
      riveCanvas.value.style.height = `${canvasWidth * ratio}px`

      r.resizeDrawingSurfaceToCanvas()
    }
  })
}

watch(riveCanvas, (canvas) => {
  if (!canvas) return

  observer = new ResizeObserver((entries) => {
    const { width, height } = entries[0].contentRect
    if (width === 0 || height === 0) return

    if (!riveInstance.value) {
      createRive()
    } else {
      // При ресайзе пересчитываем высоту
      const bounds = riveInstance.value.bounds
      const ratio = bounds.maxY / bounds.maxX
      canvas.style.height = `${width * ratio}px`
      requestAnimationFrame(() => riveInstance.value?.resizeDrawingSurfaceToCanvas())
    }
  })

  observer.observe(canvas)
})

onUnmounted(() => {
  observer?.disconnect()
  riveInstance.value?.cleanup()
  riveInstance.value = null
})
</script>

<template>
  <canvas ref="riveCanvas" class="keyboard" />
</template>

<style scoped>
.keyboard {
  width: 100%;
  display: block;
}
</style>