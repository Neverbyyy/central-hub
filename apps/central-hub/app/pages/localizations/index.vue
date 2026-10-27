<script setup lang="ts">
import JSZip from 'jszip'

definePageMeta({ title: 'Локализации' })

const toast = useToast()

const {
  languageCodes,
  rows,
  total,
  loading,
  initialLoading,
  hasMore,
  q,
  selectedTags,
  availableTags,
  load,
  setTranslation,
  undo,
  redo,
  deprecateKeys,
  fetchAll
} = useLocalizations()

const grid = useTemplateRef('grid')

// --- Выделение строк ---
const selectedKeys = ref(new Set<string>())

const toggleRow = (key: string, value: boolean) => {
  const next = new Set(selectedKeys.value)
  if (value) next.add(key)
  else next.delete(key)
  selectedKeys.value = next
}

const toggleAll = (value: boolean) => {
  selectedKeys.value = value ? new Set(rows.value.map(r => r.technical_key)) : new Set()
}

// Новый поиск / фильтр — в начало таблицы, выделение сбрасываем
watch([q, selectedTags], () => {
  grid.value?.reset()
  selectedKeys.value = new Set()
}, { deep: true })

// Без подтверждения: действие обратимо — в тосте есть «Вернуть»
const deprecating = ref(false)

const deprecateSelected = async () => {
  const keys = [...selectedKeys.value]
  if (!keys.length) return

  deprecating.value = true
  if (await deprecateKeys(keys)) selectedKeys.value = new Set()
  deprecating.value = false
}

// --- Экспорт ---
const download = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const exporting = ref<'zip' | 'figma' | null>(null)

const exportZip = async () => {
  exporting.value = 'zip'
  try {
    const all = await fetchAll()
    const zip = new JSZip()
    for (const lang of languageCodes.value) {
      const file: Record<string, string> = {}
      for (const row of all) file[row.technical_key] = row.translations?.[lang] ?? ''
      zip.file(`${lang}.json`, JSON.stringify(file, null, 2))
    }
    download(await zip.generateAsync({ type: 'blob' }), 'localizations.zip')
    toast.add({ title: 'Экспорт ZIP завершён', color: 'success' })
  } catch (error) {
    toast.add({ title: 'Ошибка экспорта', description: (error as Error).message, color: 'error' })
  } finally {
    exporting.value = null
  }
}

const exportFigma = async () => {
  exporting.value = 'figma'
  try {
    const all = await fetchAll()
    const variables: Record<string, { $type: 'string', $value: Record<string, string> }> = {}
    for (const row of all) {
      variables[row.technical_key] = {
        $type: 'string',
        $value: Object.fromEntries(languageCodes.value.map(lang => [lang, row.translations?.[lang] ?? '']))
      }
    }
    download(new Blob([JSON.stringify({ Localizations: variables }, null, 2)], { type: 'application/json' }), 'figma-variables.json')
    toast.add({ title: 'Экспорт для Figma завершён', color: 'success' })
  } catch (error) {
    toast.add({ title: 'Ошибка экспорта', description: (error as Error).message, color: 'error' })
  } finally {
    exporting.value = null
  }
}
</script>

<template>
  <div class="flex h-[calc(100dvh-64px)] flex-col overflow-hidden bg-white text-gray-900">
    <div class="flex shrink-0 items-center justify-between gap-4 border-b border-gray-200 p-4">
      <div class="flex w-full max-w-2xl items-center gap-3">
        <UInput
          v-model="q"
          icon="i-lucide-search"
          placeholder="Поиск по ключу или тексту…"
          class="w-full max-w-sm"
        />
        <USelectMenu
          v-model="selectedTags"
          :items="availableTags"
          multiple
          placeholder="Все теги"
          class="w-64"
        />
      </div>

      <div class="flex items-center gap-3">
        <UButton
          v-if="selectedKeys.size"
          icon="i-lucide-archive"
          color="warning"
          variant="soft"
          :loading="deprecating"
          @click="deprecateSelected"
        >
          Пометить устаревшими ({{ selectedKeys.size }})
        </UButton>

        <span class="whitespace-nowrap text-xs text-gray-400">
          {{ total === null ? '…' : `${total} ${plural(total, ['ключ', 'ключа', 'ключей'])}` }}
        </span>

        <UButton
          icon="i-lucide-figma"
          color="neutral"
          variant="soft"
          :loading="exporting === 'figma'"
          :disabled="!!exporting"
          @click="exportFigma"
        >
          Export Figma
        </UButton>

        <UButton
          icon="i-lucide-download"
          color="neutral"
          :loading="exporting === 'zip'"
          :disabled="!!exporting"
          @click="exportZip"
        >
          Export ZIP
        </UButton>
      </div>
    </div>

    <LocalizationsGrid
      ref="grid"
      :rows="rows"
      :languages="languageCodes"
      :selected-keys="selectedKeys"
      :loading="loading"
      :initial-loading="initialLoading"
      :has-more="hasMore"
      @load-more="load()"
      @save="setTranslation"
      @toggle="toggleRow"
      @toggle-all="toggleAll"
      @undo="undo"
      @redo="redo"
    />

    <div class="flex shrink-0 items-center gap-4 border-t border-gray-200 px-4 py-1.5 text-[11px] text-gray-400">
      <span><kbd>↑↓←→</kbd> навигация</span>
      <span><kbd>Enter</kbd> / печатай — правка</span>
      <span><kbd>Enter</kbd> сохранить и вниз · <kbd>Tab</kbd> вправо · <kbd>Shift+Enter</kbd> перенос строки · <kbd>Esc</kbd> отмена</span>
      <span><kbd>⌘C</kbd> / <kbd>⌘V</kbd> · <kbd>Del</kbd> очистить · <kbd>⌘Z</kbd> отменить</span>
    </div>
  </div>
</template>

<style scoped>
kbd {
  font-family: inherit;
  padding: 0 4px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background: #f9fafb;
  color: #6b7280;
}
</style>
