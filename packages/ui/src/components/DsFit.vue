<script setup lang="ts">
/**
 * Подгонка по высоте: содержимое раскладывается в своих размерах, как в макете, и если оно выше места — весь блок
 * уменьшается целиком (transform: scale), вёрстка внутри не меняется и ничего не обрезается. Логическая ширина
 * растёт обратно масштабу, так что после уменьшения блок ровно по месту. Хватает места — масштаб 1, ничего не делается.
 * Когда использовать: экран без прокрутки (пейволл), который должен целиком помещаться и на низких экранах —
 * iPhone SE в альбомной (568×320), вебвью в половину окна. Не для текста, который можно прокрутить.
 *
 * Сколько высоты нужно содержимому — по умолчанию его естественная высота (scrollHeight). Если содержимое само
 * растягивается на всю высоту (ряд с прокруткой), нужную высоту даёт экран: проп measure.
 * Пересчёт — при изменении размера блока и содержимого (смена языка, другие тарифы); до первой отрисовки.
 * Сам блок — position: relative (ds:absolute снаружи его не перебьёт): чтобы поставить блок абсолютно, оберните его
 * в позиционированный div и дайте DsFit ds:size-full. Высота блока должна быть задана — иначе подгонять не к чему.
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(defineProps<{
  // Сколько высоты нужно содержимому в его размерах, px
  measure?: () => number
  // Меньше не уменьшаем: текст должен оставаться читаемым
  minScale?: number
}>(), {
  measure: undefined,
  minScale: 0.6
})

const box = ref<HTMLElement | null>(null)
const inner = ref<HTMLElement | null>(null)
let observer: ResizeObserver | undefined

const apply = (scale: number) => {
  const el = inner.value
  if (!el) return
  const size = scale === 1 ? '100%' : `${100 / scale}%`
  el.style.width = size
  el.style.height = size
  el.style.transform = scale === 1 ? '' : `scale(${scale})`
}

const fit = () => {
  const el = box.value
  const content = inner.value
  if (!el || !content) return
  // Мерим в своих размерах: масштаб 1, потом сразу нужный — в одном такте, кадр не отрисуется посередине
  apply(1)
  const available = el.clientHeight
  const need = props.measure ? props.measure() : content.scrollHeight
  const scale = need > available + 0.5 ? Math.max(props.minScale, available / need) : 1
  apply(scale)
}

let mutations: MutationObserver | undefined

onMounted(() => {
  fit()
  // Шрифт догрузился — текст переложился, высота другая
  if (typeof document !== 'undefined') document.fonts?.ready.then(() => fit())
  if (typeof ResizeObserver === 'undefined') return
  observer = new ResizeObserver(() => fit())
  if (box.value) observer.observe(box.value)
  const content = inner.value?.firstElementChild
  if (!content) return
  observer.observe(content)
  // Содержимое во всю высоту (h-full) своего размера не меняет, когда текст внутри растёт (другой язык, шрифт):
  // следим и за его детьми, и за тем, какие они (v-if)
  const watchChildren = () => {
    for (const child of content.children) observer!.observe(child)
  }
  watchChildren()
  if (typeof MutationObserver === 'undefined') return
  mutations = new MutationObserver(() => {
    watchChildren()
    fit()
  })
  mutations.observe(content, { childList: true })
})

onBeforeUnmount(() => {
  observer?.disconnect()
  mutations?.disconnect()
})

defineExpose({ fit })
</script>

<template>
  <div
    ref="box"
    class="ds:relative ds:overflow-hidden"
  >
    <div
      ref="inner"
      class="ds:absolute ds:start-0 ds:top-0 ds:size-full ds:origin-top-left"
    >
      <slot />
    </div>
  </div>
</template>
