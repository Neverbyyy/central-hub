<script setup lang="ts">
/**
 * Rive-анимация из файла .riv: артборд и стейт-машина (по умолчанию — первые в файле, как в редакторе Rive).
 * Сначала — постер (картинка по конвенции), анимация проявляется поверх, когда нарисован первый кадр; не загрузилась —
 * постер остаётся. Рантайм грузится, только когда анимация подъезжает к экрану; за экраном она на паузе.
 * Когда использовать: живой арт пейволла и лендинга (гонка на карточке Cars 2, шарики в попапе). Текстов в анимации нет —
 * тексты рядом, ключами из сервиса. Нажатия внутри — Listeners файла; прокрутку страницы они не держат.
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { DsImageSet } from '../image'
import { loadRive, type RiveInstance, type RiveRuntime } from '../rive'
import DsImage from './DsImage.vue'

const props = withDefaults(defineProps<{
  // Адрес файла: import animation from './animation.riv?url'
  src: string
  artboard?: string
  stateMachine?: string
  fit?: 'contain' | 'cover' | 'fill' | 'fitWidth' | 'fitHeight' | 'layout'
  alignment?: 'center' | 'topCenter' | 'bottomCenter' | 'centerLeft' | 'centerRight'
  // Картинка до первого кадра и вместо анимации, если та не загрузилась
  poster?: DsImageSet
  // Текст для скринридера ключом из сервиса; '' — украшение
  alt: string
  // «16 / 9»: место занято до загрузки — экран не прыгает
  ratio?: string
  // false — первый кадр без движения
  autoplay?: boolean
  // Файл с data binding: привязать view model артборда. Без неё рантайм пишет ошибку в консоль — поэтому не всегда
  bindViewModel?: boolean
}>(), {
  artboard: undefined,
  stateMachine: undefined,
  fit: 'contain',
  alignment: 'center',
  poster: undefined,
  ratio: undefined,
  autoplay: true,
  bindViewModel: false
})

const emit = defineEmits<{
  // Анимация загружена и запущена: экземпляр — чтобы экран управлял inputs и view model
  load: [rive: RiveInstance]
  // Не загрузился рантайм или файл: на месте остаётся постер
  error: [error: unknown]
  // Rive Event из файла: имя и данные
  event: [name: string, data: unknown]
}>()

const FIT = { contain: 'Contain', cover: 'Cover', fill: 'Fill', fitWidth: 'FitWidth', fitHeight: 'FitHeight', layout: 'Layout' } as const
const ALIGNMENT = { center: 'Center', topCenter: 'TopCenter', bottomCenter: 'BottomCenter', centerLeft: 'CenterLeft', centerRight: 'CenterRight' } as const
// Плотность пикселей — не больше 2x, как у картинок: 3x на телефоне — в 2,25 раза больше работы видеокарте
const pixelRatio = () => Math.min(window.devicePixelRatio || 1, 2)

const root = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
// Первый кадр нарисован — холст проявляется поверх постера
const shown = ref(false)

let runtime: RiveRuntime | undefined
let rive: RiveInstance | undefined
// Стейт-машина, которая играет: заданная или первая у артборда
let machine: string | undefined
let ready = false
let visible = false
let started = false
// Номер загрузки: ответ от прошлого файла, пришедший после смены src или размонтирования, не применяется
let generation = 0
let observer: IntersectionObserver | undefined
let resizer: ResizeObserver | undefined

const layout = (module: RiveRuntime) => new module.Layout({
  fit: module.Fit[FIT[props.fit]],
  alignment: module.Alignment[ALIGNMENT[props.alignment]]
})

function destroy() {
  rive?.cleanup()
  rive = undefined
  machine = undefined
  ready = false
  shown.value = false
}

// Играет и встаёт только своя стейт-машина: play() без имени запустил бы и первую анимацию файла, которую рантайм
// создаёт на паузе. Стейт-машины нет — первая анимация, как у рантайма
function play() {
  if (!rive || !ready) return
  const names = machine ? [machine] : []
  if (visible && props.autoplay) rive.play(names)
  else rive.pause(names)
}

function start(instance: RiveInstance, id: number) {
  // Не задана — первая стейт-машина артборда
  machine = props.stateMachine ?? instance.stateMachineNames[0]
  if (props.bindViewModel) {
    const viewModel = instance.defaultViewModel()
    const viewModelInstance = viewModel?.defaultInstance() ?? viewModel?.instance()
    if (viewModelInstance) instance.bindViewModelInstance(viewModelInstance)
  }
  instance.resizeDrawingSurfaceToCanvas(pixelRatio())
  ready = true
  // Создать стейт-машину и сразу решить, играть ли: вне экрана или при autoplay=false — первый кадр без движения
  instance.play(machine ? [machine] : [])
  play()
  // Проявить после того, как кадр нарисован: иначе мелькнёт пустой холст
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (id === generation) shown.value = true
  }))
  emit('load', instance)
}

async function create() {
  const id = ++generation
  destroy()
  let module: RiveRuntime
  try {
    module = await loadRive()
  } catch (error) {
    if (id === generation) emit('error', error)
    return
  }
  if (id !== generation || !canvas.value) return
  runtime = module

  const instance: RiveInstance = new module.Rive({
    src: props.src,
    canvas: canvas.value,
    artboard: props.artboard,
    // Заданная стейт-машина — сразу, как в InApp; запуск — после загрузки, когда видно, на экране ли анимация
    stateMachines: props.stateMachine,
    autoplay: false,
    // Как в InApp: один общий контекст WebGL на все анимации экрана
    useOffscreenRenderer: true,
    isTouchScrollEnabled: true,
    layout: layout(module),
    // Команды воспроизведения рантайм принимает только после onLoad: внутри него play() уходит в очередь,
    // а reset() вешает рантайм 2.39 — поэтому запуск следующей микрозадачей
    onLoad: () => {
      Promise.resolve().then(() => {
        if (id === generation) start(instance, id)
      })
    },
    onLoadError: (event) => {
      if (id === generation) emit('error', event.data)
    }
  })
  instance.on(module.EventType.RiveEvent, (event) => {
    const data = event.data as { name?: string } | undefined
    emit('event', data?.name ?? '', data)
  })
  rive = instance
}

onMounted(() => {
  if (typeof IntersectionObserver === 'undefined' || !root.value) {
    visible = true
    started = true
    create()
    return
  }
  // С запасом 200 px: файл начинает грузиться чуть раньше, чем анимация въедет в экран
  observer = new IntersectionObserver(([entry]) => {
    visible = !!entry?.isIntersecting
    if (visible && !started) {
      started = true
      create()
    }
    play()
  }, { rootMargin: '200px' })
  observer.observe(root.value)

  if (typeof ResizeObserver !== 'undefined') {
    resizer = new ResizeObserver(() => {
      if (rive && ready) rive.resizeDrawingSurfaceToCanvas(pixelRatio())
    })
    resizer.observe(root.value)
  }
})

watch(() => [props.src, props.artboard, props.stateMachine, props.bindViewModel], () => {
  if (started) create()
})
watch(() => [props.fit, props.alignment], () => {
  if (rive && runtime) rive.layout = layout(runtime)
})
watch(() => props.autoplay, play)

onBeforeUnmount(() => {
  generation++
  observer?.disconnect()
  resizer?.disconnect()
  destroy()
})
</script>

<template>
  <div
    ref="root"
    class="ds-rive ds:relative ds:overflow-hidden"
    :style="ratio ? { aspectRatio: ratio } : undefined"
    :role="alt ? 'img' : undefined"
    :aria-label="alt || undefined"
    :aria-hidden="alt ? undefined : 'true'"
  >
    <DsImage
      v-if="poster"
      class="ds:absolute ds:inset-0"
      :set="poster"
      alt=""
      :fit="fit === 'cover' ? 'cover' : 'contain'"
    />
    <canvas
      ref="canvas"
      class="ds:absolute ds:inset-0 ds:block ds:size-full ds:transition-opacity ds:duration-(--ds-duration-base) ds:ease-standard"
      :class="shown ? 'ds:opacity-100' : 'ds:opacity-0'"
    />
  </div>
</template>
