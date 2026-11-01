<script setup lang="ts">
/**
 * Значки App Store и Google Play со ссылками в сторы. Значок, адрес и подпись — снаружи: у Apple и Google значки свои
 * для каждого языка, а UTM в адрес добавляет лендинг. Событие click(store) — для track(), сам компонент аналитику не шлёт.
 * Когда использовать: первый экран, финальная кнопка и футер лендинга.
 */
import { computed, ref } from 'vue'
import type { DsStore, DsStoreBadge } from '../types'
import DsImage from './DsImage.vue'

const props = withDefaults(defineProps<{
  appStore?: DsStoreBadge
  googlePlay?: DsStoreBadge
}>(), {
  appStore: undefined,
  googlePlay: undefined
})

const emit = defineEmits<{ click: [store: DsStore] }>()

const badges = computed(() => [
  { store: 'app-store' as DsStore, badge: props.appStore },
  { store: 'google-play' as DsStore, badge: props.googlePlay }
].filter((item): item is { store: DsStore, badge: DsStoreBadge } => !!item.badge))

// «Нажато» сразу на касании, как у DsButton
const pressed = ref<DsStore | null>(null)
</script>

<template>
  <div class="ds:flex ds:flex-wrap ds:items-center ds:justify-center ds:space-x-3">
    <a
      v-for="{ store, badge } in badges"
      :key="store"
      :href="badge.href"
      :aria-label="badge.label"
      :data-store="store"
      :data-pressed="pressed === store ? '' : undefined"
      target="_blank"
      rel="noopener"
      class="ds:inline-flex ds:min-h-touch ds:items-center ds:no-select ds:transition-transform ds:duration-(--ds-duration-fast) ds:data-pressed:scale-95"
      @pointerdown="pressed = store"
      @pointerup="pressed = null"
      @pointercancel="pressed = null"
      @pointerleave="pressed = null"
      @click="emit('click', store)"
    >
      <DsImage
        :src="badge.src"
        alt=""
        size="intrinsic"
        class="ds:h-store-badge"
      />
    </a>
  </div>
</template>
