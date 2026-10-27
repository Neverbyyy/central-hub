<script setup lang="ts">
import type { CommitMove } from '~/composables/useLocalizations'

// Редактор ячейки. Хранит текст локально — набор не перерисовывает таблицу.
const props = defineProps<{ initial: string }>()
const emit = defineEmits<{
  commit: [value: string, move: CommitMove]
  cancel: []
}>()

const value = ref(props.initial)
const el = ref<HTMLTextAreaElement>()
let done = false

const autosize = () => {
  if (!el.value) return
  el.value.style.height = 'auto'
  el.value.style.height = `${Math.min(el.value.scrollHeight, 240)}px`
}

onMounted(() => {
  const ta = el.value!
  ta.focus({ preventScroll: true })
  ta.setSelectionRange(ta.value.length, ta.value.length)
  autosize()
})

const finish = (move: CommitMove) => {
  if (done) return
  done = true
  emit('commit', value.value, move)
}

const onKeydown = (e: KeyboardEvent) => {
  e.stopPropagation()
  if (e.isComposing) return

  if (e.key === 'Escape') {
    e.preventDefault()
    done = true
    emit('cancel')
  } else if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
    e.preventDefault()
    finish(e.metaKey || e.ctrlKey ? 'stay' : 'down')
  } else if (e.key === 'Tab') {
    e.preventDefault()
    finish(e.shiftKey ? 'left' : 'right')
  }
}
</script>

<template>
  <textarea
    ref="el"
    v-model="value"
    rows="1"
    spellcheck="false"
    class="absolute left-0 top-0 z-40 block w-[max(100%,320px)] min-h-full resize-none bg-white px-3 py-[9px] text-xs leading-[18px] text-gray-900 shadow-lg ring-2 ring-inset ring-blue-500 outline-none"
    @input="autosize"
    @keydown="onKeydown"
    @blur="finish('blur')"
    @mousedown.stop
    @dblclick.stop
  />
</template>
