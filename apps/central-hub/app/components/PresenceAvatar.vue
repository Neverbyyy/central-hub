<script setup lang="ts">
// Кружок человека: инициалы на его цвете — в шапке и в карточке. Цвет по имени одинаковый у всех коллег
defineProps<{ name: string }>()
</script>

<template>
  <UAvatar
    :text="presenceInitials(name)"
    :alt="name"
    size="sm"
    :style="{ backgroundColor: presenceColor(name) }"
    :ui="{ fallback: 'font-semibold text-white' }"
  />
</template>
