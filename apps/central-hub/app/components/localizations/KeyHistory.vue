<script setup lang="ts">
import { createReusableTemplate } from '@vueuse/core'
import type { HistoryAction, HistoryEntry } from '~/utils/history'

// История ключа в панели: действие — карточка (что и когда, было / стало, кто и откуда); правка на несколько
// записей — одна карточка со сводкой, подробности по клику. Загружает и раскрывает её панель ключа
defineProps<{
  actions: HistoryAction[]
  // Сколько действий всего — для «Вся история (N)» и «Показать ещё»
  total: number
  // Раскрытые действия
  open: Set<number>
  loadingMore: boolean
}>()

defineEmits<{ toggle: [id: number], more: [] }>()

const [DefineEntry, ReuseEntry] = createReusableTemplate<{ entry: HistoryEntry }>()
</script>

<template>
  <section>
    <h3 class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
      История
      <span
        v-if="total"
        class="ml-1 font-normal normal-case tracking-normal text-muted"
      >{{ total }}</span>
    </h3>
    <p
      v-if="!actions.length"
      class="text-muted"
    >
      Пока пусто
    </p>

    <!-- Было / стало одной записи: статус строкой, текст — красным и зелёным -->
    <DefineEntry v-slot="{ entry }">
      <p
        v-if="entry.field === 'status'"
        class="text-toned"
      >
        {{ entryValueText(entry, entry.old_value) }} → <span class="font-medium text-gray-800 dark:text-gray-100">{{ entryValueText(entry, entry.new_value) }}</span>
      </p>
      <template v-else-if="entryHasDiff(entry)">
        <p
          v-if="entry.old_value"
          class="whitespace-pre-line break-words rounded bg-red-50 dark:bg-red-950/40 px-2 py-1 text-red-800 dark:text-red-300 line-through decoration-red-300 dark:decoration-red-800"
        >
          {{ entry.old_value }}
        </p>
        <p
          v-if="entry.new_value"
          class="whitespace-pre-line break-words rounded bg-green-50 dark:bg-green-950/40 px-2 py-1 text-green-900 dark:text-green-200"
        >
          {{ entry.new_value }}
        </p>
        <p
          v-else
          class="italic text-muted"
        >
          Очищено
        </p>
      </template>
    </DefineEntry>

    <!-- Каждое действие — карточка: что и когда, было / стало, кто и откуда.
         Правка на несколько записей (импорт, «Утвердить всё») — одна карточка со сводкой, подробности по клику -->
    <ol class="space-y-2">
      <li
        v-for="action in actions"
        :key="action.id"
        class="overflow-hidden rounded-lg border border-default"
      >
        <div class="flex items-center gap-2 border-b border-default bg-muted px-3 py-1.5">
          <template v-if="action.entries.length === 1">
            <span
              v-if="action.entries[0]!.lang"
              class="rounded bg-default px-1 font-mono text-[10px] font-semibold uppercase text-muted ring-1 ring-default"
            >{{ action.entries[0]!.lang }}</span>
            <span class="font-medium text-gray-800 dark:text-gray-100">{{ entryTitle(action.entries[0]!) }}</span>
          </template>
          <span
            v-else
            class="font-medium text-gray-800 dark:text-gray-100"
          >{{ actionSummary(action) }}</span>
          <span class="ml-auto shrink-0 text-[10px] tabular-nums text-muted">{{ formatDateTime(action.created_at) }}</span>
        </div>
        <div class="space-y-1 px-3 py-2">
          <ReuseEntry
            v-if="action.entries.length === 1"
            :entry="action.entries[0]!"
          />
          <template v-else>
            <button
              type="button"
              class="flex items-center gap-1 text-toned hover:text-highlighted"
              :aria-expanded="open.has(action.id)"
              @click="$emit('toggle', action.id)"
            >
              <UIcon
                name="i-lucide-chevron-right"
                class="size-3.5 text-muted transition-transform"
                :class="{ 'rotate-90': open.has(action.id) }"
              />
              {{ open.has(action.id) ? (isCreationAction(action) ? 'Скрыть тексты' : 'Скрыть подробности') : actionDetailsLabel(action) }}
            </button>
            <ul
              v-if="open.has(action.id)"
              class="space-y-2 pt-1"
            >
              <li
                v-for="(entry, i) in actionDetailEntries(action)"
                :key="i"
                class="space-y-1"
              >
                <div class="flex items-center gap-2">
                  <span
                    v-if="entry.lang"
                    class="rounded bg-default px-1 font-mono text-[10px] font-semibold uppercase text-muted ring-1 ring-default"
                  >{{ entry.lang }}</span>
                  <span class="font-medium text-gray-800 dark:text-gray-100">{{ entryTitle(entry) }}</span>
                </div>
                <ReuseEntry :entry="entry" />
              </li>
            </ul>
          </template>
          <p class="text-[10px] text-muted">
            {{ action.actor || 'без имени' }} · {{ historySourceLabel(action.source) }}
          </p>
        </div>
      </li>
    </ol>

    <button
      v-if="actions.length < total"
      type="button"
      class="mt-3 text-xs font-medium text-toned underline underline-offset-2 hover:text-highlighted disabled:opacity-50"
      :disabled="loadingMore"
      @click="$emit('more')"
    >
      {{ loadingMore ? 'Загружаю…' : actions.length <= HISTORY_FIRST ? `Вся история (${total})` : `Показать ещё ${Math.min(HISTORY_MORE, total - actions.length)}` }}
    </button>
  </section>
</template>
