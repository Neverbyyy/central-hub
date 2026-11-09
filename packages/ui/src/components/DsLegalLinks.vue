<script setup lang="ts">
/**
 * Строка документов внизу пейволла: Terms · Privacy · Restore. Тексты — пропсами, ключами из сервиса
 * (common.link.terms_of_use, common.link.privacy_policy, common.button.restore); нет текста — нет ссылки.
 * Когда использовать: низ пейволла и футер лендинга. Компонент только отдаёт события: адреса документов,
 * родительский гейт и восстановление покупок — дело экрана (интерфейс окружения), он не знает про InApp.
 * Вид по макетам Cars 2 и Farm: подчёркнутые ссылки стилем text.legal через промежуток, без точек; underline=false —
 * без подчёркивания (Baby Care).
 * На узком экране строка переносится. Если ссылки стоят в разных углах экрана (Cars 2) — экран ставит DsLink сам.
 */
import { computed } from 'vue'
import DsLink from './DsLink.vue'

type LegalItem = 'terms' | 'privacy' | 'restore'

const props = withDefaults(defineProps<{
  terms?: string
  privacy?: string
  restore?: string
  tone?: 'link' | 'secondary' | 'muted' | 'inverse'
  underline?: boolean
  // Подпись блока для скринридера
  label?: string
}>(), {
  terms: undefined,
  privacy: undefined,
  restore: undefined,
  tone: 'link',
  underline: true,
  label: undefined
})

const emit = defineEmits<{ terms: [], privacy: [], restore: [] }>()

const items = computed(() => (['terms', 'privacy', 'restore'] as LegalItem[])
  .filter(item => props[item])
  .map(item => ({ item, text: props[item]! })))

const select = (item: LegalItem) => {
  if (item === 'terms') emit('terms')
  else if (item === 'privacy') emit('privacy')
  else emit('restore')
}
</script>

<template>
  <nav
    :aria-label="label"
    class="ds:flex ds:flex-wrap ds:items-center ds:justify-center ds:text-center ds:font-link ds:text-legal"
  >
    <!-- Промежуток — полями у каждой ссылки, не gap (старые вебвью); при переносе строки тоже ровно -->
    <DsLink
      v-for="{ item, text } in items"
      :key="item"
      class="ds:mx-1.5 ds:my-0.5"
      :tone="tone"
      :underline="underline"
      :data-legal="item"
      @click="select(item)"
    >
      {{ text }}
    </DsLink>
  </nav>
</template>
