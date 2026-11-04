<script setup lang="ts">
/**
 * Картинка под слоем грязи: ведёшь пальцем — грязь стирается, как на автомойке в игре. Стёрто достаточно — слой уходит
 * целиком, событие done. Без скрипта и пока блок не подъехал к экрану видна чистая картинка: ничего не ломается.
 * Когда использовать: мини-интерактив на лендинге. Звук и похвала — снаружи, по событиям. label — подпись для скринридера.
 * Вид: цвет грязи color.wipe.mud; грязь ложится только на непрозрачные части картинки.
 * Палец: вертикальное движение прокручивает страницу как обычно, стирают движением вбок и наискосок (touch-action: pan-y).
 * Клавиатура: Enter и пробел моют сразу.
 */
import { ref, watch } from 'vue'
import { useInView } from '../composables/useInView'
import type { DsImageSet } from '../image'
import DsImage from './DsImage.vue'

const props = withDefaults(defineProps<{
  set: DsImageSet
  label: string
  // «56 / 52»: место занято до загрузки
  ratio?: string
  // Какая доля картинки должна быть чистой, от 0 до 1
  threshold?: number
  // Смена значения снова пачкает картинку
  resetKey?: number | string
}>(), {
  ratio: undefined,
  threshold: 0.7,
  resetKey: undefined
})

const emit = defineEmits<{
  // Палец опустился: можно включать звук
  start: []
  // Палец движется: координаты в долях блока, от 0 до 1
  stroke: [x: number, y: number]
  // Палец поднялся или страницу начали прокручивать
  stop: []
  // Картинка чистая
  done: []
}>()

// Стёртое считается по сетке: читать пиксели на каждое движение пальца дорого
const GRID = 12
// Толщина мазка — доля ширины
const BRUSH = 0.22
// Шлепки грязи и брызги вокруг каждого
const BLOTS = 15
const DROPS = 8
// Плёнка под шлепками: машина тусклая, но видно, какая она
const FILM = 0.22

const root = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const clean = ref(false)

let context: CanvasRenderingContext2D | null = null
let dirty = new Set<number>()
let total = 0
let last: { x: number, y: number } | null = null

// Клетки сетки, в которых есть картинка: прозрачные поля мыть не нужно
function findCells(width: number, height: number) {
  dirty = new Set()
  try {
    const { data } = context!.getImageData(0, 0, width, height)
    for (let row = 0; row < GRID; row++) {
      for (let column = 0; column < GRID; column++) {
        const x = Math.floor((column + 0.5) / GRID * width)
        const y = Math.floor((row + 0.5) / GRID * height)
        if (data[(y * width + x) * 4 + 3]! > 128) dirty.add(row * GRID + column)
      }
    }
  } catch {
    // Картинка с чужого адреса: пиксели не прочитать, считаем все клетки
    for (let cell = 0; cell < GRID * GRID; cell++) dirty.add(cell)
  }
  total = dirty.size
}

function paint(image: HTMLImageElement) {
  const element = canvas.value
  const drawing = element?.getContext('2d')
  if (!element || !drawing || !root.value) return
  const { naturalWidth: width, naturalHeight: height } = image
  element.width = width
  element.height = height
  context = drawing

  drawing.drawImage(image, 0, 0, width, height)
  findCells(width, height)

  drawing.globalCompositeOperation = 'source-atop'
  drawing.fillStyle = getComputedStyle(root.value).color
  drawing.globalAlpha = FILM
  drawing.fillRect(0, 0, width, height)
  // Кляксы всегда одни и те же: случайные числа тут ни к чему, а кадр в проверках стабилен
  let seed = 7
  const next = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  const circle = (x: number, y: number, radius: number) => {
    drawing.beginPath()
    drawing.arc(x, y, radius, 0, Math.PI * 2)
    drawing.fill()
  }
  for (let blot = 0; blot < BLOTS; blot++) {
    const x = next() * width
    const y = next() * height
    const radius = (0.05 + next() * 0.06) * width
    drawing.globalAlpha = 0.8 + next() * 0.2
    circle(x, y, radius)
    for (let drop = 0; drop < DROPS; drop++) {
      const angle = next() * Math.PI * 2
      const distance = radius * (1.1 + next())
      circle(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, radius * (0.1 + next() * 0.22))
    }
  }

  drawing.globalAlpha = 1
  drawing.globalCompositeOperation = 'destination-out'
  drawing.lineCap = 'round'
  drawing.lineJoin = 'round'
  drawing.lineWidth = width * BRUSH
}

function prepare() {
  const image = root.value?.querySelector('img')
  if (!image) return
  if (image.complete && image.naturalWidth) paint(image)
  else image.addEventListener('load', () => paint(image), { once: true })
}

function finish() {
  if (clean.value) return
  clean.value = true
  last = null
  emit('done')
}

function erase(from: { x: number, y: number }, to: { x: number, y: number }) {
  const element = canvas.value
  if (!context || !element) return
  context.beginPath()
  context.moveTo(from.x * element.width, from.y * element.height)
  context.lineTo(to.x * element.width, to.y * element.height)
  context.stroke()

  const steps = Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) * GRID * 2) + 1
  for (let step = 0; step <= steps; step++) {
    const x = from.x + (to.x - from.x) * step / steps
    const y = from.y + (to.y - from.y) * step / steps
    for (const cell of dirty) {
      const distance = Math.hypot((cell % GRID + 0.5) / GRID - x, (Math.floor(cell / GRID) + 0.5) / GRID - y)
      if (distance < BRUSH / 2) dirty.delete(cell)
    }
  }
  if (total && 1 - dirty.size / total >= props.threshold) finish()
}

function position(event: PointerEvent) {
  const box = canvas.value!.getBoundingClientRect()
  return { x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height }
}

function onDown(event: PointerEvent) {
  if (clean.value || !context) return
  last = position(event)
  emit('start')
  emit('stroke', last.x, last.y)
  // Точка: у линии нулевой длины браузер не рисует скругление
  erase(last, { x: last.x + 0.001, y: last.y })
}

function onMove(event: PointerEvent) {
  if (!last) return
  const next = position(event)
  emit('stroke', next.x, next.y)
  erase(last, next)
  if (last) last = next
}

function onUp() {
  if (!last) return
  last = null
  emit('stop')
}

// С запасом: блок приезжает на экран уже грязным
useInView(root, (visible) => {
  if (visible && !context) prepare()
}, { rootMargin: '300px' })

watch(() => props.resetKey, () => {
  clean.value = false
  last = null
  prepare()
})
</script>

<template>
  <div
    ref="root"
    class="ds-wipe ds:relative ds:text-wipe-mud ds:no-select"
    :style="ratio ? { aspectRatio: ratio } : undefined"
    role="button"
    :tabindex="clean ? -1 : 0"
    :aria-label="label"
    @keydown.enter.prevent="finish"
    @keydown.space.prevent="finish"
  >
    <DsImage
      class="ds:size-full"
      :set="set"
      alt=""
    />
    <canvas
      ref="canvas"
      class="ds-wipe__dirt ds:absolute ds:inset-0 ds:block ds:size-full ds:transition-opacity ds:duration-(--ds-duration-base)"
      :class="clean ? 'ds:pointer-events-none ds:opacity-0' : 'ds:opacity-100'"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
      @pointerleave="onUp"
    />
  </div>
</template>

<style scoped>
.ds-wipe__dirt {
  touch-action: pan-y;
}
</style>
