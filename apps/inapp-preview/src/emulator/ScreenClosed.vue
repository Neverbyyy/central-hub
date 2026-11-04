<script setup lang="ts">
// Заглушка «экран закрыт» поверх вебвью: открыть снова можно сразу, без перезагрузки. В эмуляторе и на странице
// «только экран», где приложения нет и открыть экран больше некому. Инструмент разработки: подписи по-русски, свой CSS
defineProps<{ neverShown?: boolean }>()

defineEmits<{ open: [] }>()
</script>

<template>
  <div class="screen-closed">
    <p>Экран закрыт{{ neverShown ? ' и не показывался' : '' }}</p>
    <button
      type="button"
      @click="$emit('open')"
    >
      Открыть снова
    </button>
  </div>
</template>

<style scoped>
.screen-closed {
  position: absolute;
  z-index: 100;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font: 14px/1.4 system-ui, -apple-system, 'Segoe UI', sans-serif;
  color: #fff;
  background: rgb(0 0 0 / 0.55);
}

.screen-closed p {
  margin: 0;
}

.screen-closed button {
  min-height: 44px;
  padding: 4px 16px;
  font: inherit;
  color: #1f2328;
  border: 1px solid #c4c8cf;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
}

.screen-closed button:active {
  background: #e8eaee;
}
</style>
