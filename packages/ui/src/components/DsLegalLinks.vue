<script setup lang="ts">
/**
 * Строка документов внизу пейволла: Terms · Privacy · Restore. Тексты — пропсами, ключами из сервиса
 * (common.link.terms_of_use, common.link.privacy_policy, common.button.restore); нет текста — нет ссылки.
 * Когда использовать: низ пейволла и футер лендинга. Компонент только отдаёт события: адреса документов,
 * родительский гейт и восстановление покупок — дело экрана (интерфейс окружения), он не знает про InApp.
 * На узком экране строка переносится.
 */
import { computed } from 'vue'
import DsLink from './DsLink.vue'

type LegalItem = 'terms' | 'privacy' | 'restore'

const props = withDefaults(defineProps<{
  terms?: string
  privacy?: string
  restore?: string
  tone?: 'link' | 'secondary' | 'inverse'
  // Подпись блока для скринридера
  label?: string
}>(), {
  terms: undefined,
  privacy: undefined,
  restore: undefined,
  tone: 'link',
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
    class="ds:flex ds:flex-wrap ds:items-center ds:justify-center ds:text-center ds:font-body ds:text-caption"
  >
    <template
      v-for="({ item, text }, index) in items"
      :key="item"
    >
      <span
        v-if="index"
        class="ds:mx-2 ds:text-text-secondary"
        aria-hidden="true"
      >·</span>
      <DsLink
        :tone="tone"
        :underline="false"
        :data-legal="item"
        @click="select(item)"
      >
        {{ text }}
      </DsLink>
    </template>
  </nav>
</template>
