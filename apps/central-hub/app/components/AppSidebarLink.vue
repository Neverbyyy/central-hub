<script setup lang="ts">
// Пункт боковой панели: значок и подпись, раздел, где человек сейчас, — с подложкой и жирным.
// Отступы между пунктами задаёт место (class)
defineProps<{ to: string, icon: string, label: string }>()
</script>

<template>
  <ULink
    raw
    :to="to"
    class="flex px-4 py-2 rounded-lg text-sm text-highlighted hover:bg-accented dark:hover:bg-gray-800"
    active-class="bg-accented dark:bg-gray-800 font-bold"
    inactive-class=""
  >
    <UIcon
      :name="icon"
      class="size-5 mr-2"
    />
    {{ label }}
  </ULink>
</template>
