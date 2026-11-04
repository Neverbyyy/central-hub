<script setup lang="ts">
/**
 * Звёздочки разлетаются от точки нажатия: отклик интерактива на касании, только transform и opacity.
 * Когда использовать: внутри блока с position: relative; запуск — fire(x, y) через ref, координаты в px от угла блока.
 * Цвет — color.lp.sign, размер — spacing.lp-road-star.
 */
import { DsIcon } from '@amaya/ui'
import { ref } from 'vue'

const RAYS = [0, 60, 120, 180, 240, 300]
// Больше одновременных вспышек не нужно: частые тапы не копят элементы
const LIMIT = 4

const bursts = ref<{ id: number, x: number, y: number }[]>([])
let nextId = 0

function fire(x: number, y: number) {
  bursts.value = [...bursts.value.slice(1 - LIMIT), { id: ++nextId, x, y }]
}

const remove = (id: number) => {
  bursts.value = bursts.value.filter(burst => burst.id !== id)
}

defineExpose({ fire })
</script>

<template>
  <div
    class="ds:pointer-events-none ds:absolute ds:inset-0"
    aria-hidden="true"
  >
    <span
      v-for="burst in bursts"
      :key="burst.id"
      class="ds:absolute"
      :style="{ left: `${burst.x}px`, top: `${burst.y}px` }"
    >
      <span
        v-for="(ray, index) in RAYS"
        :key="ray"
        class="lk-burst__star ds:absolute ds:size-lp-road-star ds:text-lp-sign"
        :style="{ '--lk-ray': `${ray}deg` }"
        @animationend="index === 0 && remove(burst.id)"
      >
        <DsIcon
          name="star"
          size="fill"
        />
      </span>
    </span>
  </div>
</template>

<style scoped>
.lk-burst__star {
  left: -0.625rem;
  top: -0.625rem;
  animation: lk-burst 0.6s var(--ds-ease-standard) forwards;
}

@keyframes lk-burst {
  from {
    opacity: 1;
    transform: rotate(var(--lk-ray)) translateY(0) scale(0.4);
  }

  to {
    opacity: 0;
    transform: rotate(var(--lk-ray)) translateY(-4.5rem) scale(1.2);
  }
}

@media (prefers-reduced-motion: reduce) {
  .lk-burst__star {
    animation-duration: 0.01s;
  }
}
</style>
