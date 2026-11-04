<script setup lang="ts">
// Лог эмулятора: что экран отправил бы в InApp, новые записи сверху; подозрительное (дубли, порядок) подсвечено
import { computed } from 'vue'
import type { LogEntry } from './inapp'

const props = defineProps<{ log: LogEntry[] }>()

defineEmits<{ copy: [text: string] }>()

const problems = computed(() => props.log.filter(item => item.problem).length)
const newestFirst = computed(() => [...props.log].reverse())

const arrow = (item: LogEntry) => (item.dir === 'in' ? '→' : '←')
const asText = () => props.log
  .map(item => `${item.at} мс ${arrow(item)} ${item.text}${item.problem ? `  [${item.problem}]` : ''}${item.note ? `  (${item.note})` : ''}`)
  .join('\n')
</script>

<template>
  <section class="emu-log">
    <header>
      <h2>Лог: что экран отправил бы в InApp</h2>
      <span
        v-if="problems"
        class="emu-bad"
      >подозрительно: {{ problems }}</span>
      <button
        type="button"
        @click="$emit('copy', asText())"
      >
        Копировать
      </button>
    </header>
    <ol>
      <li
        v-for="item in newestFirst"
        :key="item.id"
        :class="[`emu-log--${item.dir}`, { 'emu-log--bad': item.problem }]"
      >
        <span class="emu-time">{{ item.at }}</span>
        <span>{{ arrow(item) }} {{ item.text }}</span>
        <small v-if="item.problem">{{ item.problem }}</small>
        <small
          v-else-if="item.note"
          class="emu-note"
        >{{ item.note }}</small>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.emu-log {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 160px;
  border-top: 1px solid #e3e5e9;
  padding-top: 10px;
}

.emu-log header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.emu-log h2 {
  flex: 1;
  margin: 0;
  font-size: 14px;
}

.emu-bad {
  color: #cf222e;
  font-weight: 600;
}

.emu-log ol {
  flex: 1;
  margin: 8px 0 0;
  padding: 0;
  overflow: auto;
  font: 12px/1.5 ui-monospace, 'Cascadia Mono', Consolas, monospace;
  list-style: none;
}

.emu-log li {
  display: grid;
  grid-template-columns: 52px 1fr;
  column-gap: 6px;
  padding: 2px 4px;
  border-radius: 4px;
  word-break: break-all;
}

.emu-log small {
  grid-column: 2;
  color: #cf222e;
}

.emu-log .emu-note {
  color: #57606a;
}

.emu-time {
  color: #8c959f;
  text-align: right;
}

.emu-log--out {
  color: #0550ae;
}

.emu-log--bad {
  background: #ffebe9;
}
</style>
