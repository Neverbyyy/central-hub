<script setup lang="ts">
import type { ChangeKind, FileChange } from '~/utils/exportChanges'

// Все изменения выгрузки одного проекта: что уйдёт в PR, сгруппировано по ключу.
// Изменений бывают тысячи, поэтому список показывается порциями.
const props = defineProps<{
  project: string
  repo: string | null
  changes: FileChange[]
  prLabel: string
  canPush: boolean
  pushing: boolean
  // Почему выгружать пока нельзя: сначала дизайн-система — строкой рядом с кнопкой, а не немой серой кнопкой
  blocked?: string
}>()

const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{
  push: []
  // Путь строки в файле проекта — страница ищет его в таблице
  findKey: [key: string]
}>()

interface Row {
  lang: string
  kind: ChangeKind
  before?: string | null
  after?: string | null
}

const PAGE = 200

const KIND: Record<ChangeKind, { label: string, sign: string, class: string }> = {
  added: { label: 'exportChanges.kinds.added', sign: '+', class: 'text-green-600 dark:text-green-400' },
  changed: { label: 'exportChanges.kinds.changed', sign: '~', class: 'text-amber-600 dark:text-amber-400' },
  removed: { label: 'exportChanges.kinds.removed', sign: '−', class: 'text-red-600 dark:text-red-400' }
}

const shown = ref(PAGE)
watch(open, (value) => {
  if (value) shown.value = PAGE
})

// По ключу — языки в порядке файлов набора
const groups = computed(() => {
  const map = new Map<string, Row[]>()
  for (const change of props.changes) {
    for (const line of change.lines) {
      const row: Row = { lang: change.lang, kind: changeKind(line), before: line.before, after: line.after }
      const rows = map.get(line.key)
      if (rows) rows.push(row)
      else map.set(line.key, [row])
    }
  }
  return [...map].map(([key, rows]) => ({ key, rows })).sort((a, b) => a.key.localeCompare(b.key))
})

const visible = computed(() => groups.value.slice(0, shown.value))
const truncated = computed(() => props.changes.filter(c => c.truncated))

// Ctrl+Enter — выгрузить, как в окне Figma
useEventListener('keydown', (event: KeyboardEvent) => {
  if (!open.value || !isModEnter(event)) return
  if (!props.canPush || props.pushing) return
  event.preventDefault()
  emit('push')
})
</script>

<template>
  <UModal
    v-model:open="open"
    :title="$t('exportChanges.title', { project })"
    :description="repo ? $t('exportChanges.descriptionRepo', { repo }) : $t('exportChanges.descriptionNoRepo')"
    :ui="{ content: 'sm:max-w-4xl' }"
  >
    <template #body>
      <div class="space-y-3 text-sm">
        <p
          v-for="change in truncated"
          :key="change.path"
          class="text-xs text-warning"
        >
          {{ $t('exportChanges.truncated', { file: changeFileName(change.path), shown: change.lines.length, total: change.added + change.changed + change.removed }) }}
        </p>

        <ul class="divide-y divide-default">
          <li
            v-for="group in visible"
            :key="group.key"
            class="py-2"
          >
            <button
              type="button"
              class="break-all text-left font-mono text-xs font-medium text-highlighted hover:underline"
              :title="$t('exportChanges.findInTable')"
              @click="emit('findKey', group.key)"
            >
              {{ group.key }}
            </button>
            <div
              v-for="row in group.rows"
              :key="row.lang"
              class="mt-1 grid grid-cols-[1.75rem_0.75rem_minmax(0,1fr)] gap-x-1.5 text-xs"
            >
              <span class="font-mono uppercase text-muted">{{ row.lang }}</span>
              <span
                class="font-mono font-semibold"
                :class="KIND[row.kind].class"
                :title="$t(KIND[row.kind].label)"
              >{{ KIND[row.kind].sign }}</span>
              <span class="whitespace-pre-line break-words">
                <span
                  v-if="row.kind !== 'added'"
                  class="text-muted line-through"
                >{{ quoteChange(row.before) }}</span>
                <span
                  v-if="row.kind === 'changed'"
                  class="text-muted"
                > → </span>
                <span
                  v-if="row.kind !== 'removed'"
                  class="text-highlighted"
                >{{ quoteChange(row.after) }}</span>
              </span>
            </div>
          </li>
        </ul>

        <div
          v-if="visible.length < groups.length"
          class="text-center"
        >
          <UButton
            color="neutral"
            variant="soft"
            size="sm"
            @click="shown += PAGE"
          >
            {{ $t('exportChanges.showMore', { count: Math.min(PAGE, groups.length - visible.length), left: groups.length - visible.length }) }}
          </UButton>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full items-center justify-between gap-3">
        <span
          v-if="blocked"
          class="flex min-w-0 items-center gap-1.5 text-xs text-warning"
        >
          <UIcon
            name="i-lucide-lock"
            class="size-3.5 shrink-0"
          />
          {{ blocked }}
        </span>
        <span
          v-else
          class="text-xs text-muted"
        >
          {{ $t('exportChanges.footer', { changes: $t('exportChanges.changes', totalChanges(changes)), files: $t('exportChanges.files', changes.length) }) }}
        </span>
        <UButton
          v-bind="prButton(!!blocked)"
          class="shrink-0"
          :loading="pushing"
          :disabled="!canPush || pushing"
          @click="emit('push')"
        >
          {{ prLabel }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
