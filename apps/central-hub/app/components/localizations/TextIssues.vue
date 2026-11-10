<script setup lang="ts">
import type { TextIssue } from '@amaya/l10n-core'

// Замечания к тексту под полем: ошибки (не сохранится) — красным, предупреждения — янтарным.
// Те же проверки в очереди перевода и в шторке правки (checkText из l10n-core)
defineProps<{ issues: TextIssue[] }>()
</script>

<template>
  <ul
    v-if="issues.length"
    class="mt-1 flex flex-col gap-0.5 text-xs"
  >
    <li
      v-for="issue in issues"
      :key="issue.message"
      :class="issue.level === 'error' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'"
    >
      {{ issue.message }}
    </li>
  </ul>
</template>
