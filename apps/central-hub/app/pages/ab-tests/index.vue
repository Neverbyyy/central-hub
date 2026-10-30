<script setup lang="ts">
import { h, resolveComponent, ref, onMounted, computed } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import JSZip from 'jszip' 

definePageMeta({ title: 'Локализации' })

interface Localization {
  technical_key: string
  translations: Record<string, string>
  created_at: string
  updated_at: string
  _isSkeleton?: boolean 
}

const languages = ['en', 'ru', 'de', 'es', 'it', 'pt', 'fr', 'sv', 'nl']
const supabase = useSupabaseClient()
const toast = useToast()

// --- Состояние данных ---
const pageSize = 50
const currentPage = ref(0)
const pending = ref(false)
const allLoaded = ref(false)
const q = ref('')

// Теги
const availableTags = ref<{ label: string, value: string }[]>([])
const selectedTags = ref<string[]>([])

const localizations = ref<Localization[]>(
  Array.from({ length: pageSize }, () => ({
    technical_key: '',
    translations: {},
    created_at: '',
    updated_at: '',
    _isSkeleton: true
  }))
)

// --- Загрузка списка тегов из Supabase ---
// Просто массив строк

const fetchTags = async () => {
  const { data, error } = await supabase.rpc('get_unique_tags')
  if (!error && data) {
    // Получаем плоский массив строк: ['1', '2', '3', '4']
    availableTags.value = data.map((item: any) => String(item.tag)).filter(Boolean)
  }
}

// --- Состояние выбора (Чекбоксы) ---
const selectedKeys = ref<Set<string>>(new Set())
const isAllSelected = ref(false)

const toggleAll = (val: any) => {
  const isChecked = val === true 
  
  isAllSelected.value = isChecked
  if (isChecked) {
    localizations.value.forEach(r => {
      if (!r._isSkeleton) selectedKeys.value.add(r.technical_key)
    })
  } else {
    selectedKeys.value.clear()
  }
}

const toggleRow = (key: string, val: boolean) => {
  if (val) {
    selectedKeys.value.add(key)
  } else {
    selectedKeys.value.delete(key)
    isAllSelected.value = false 
  }
}

// --- Действия со строками ---
const deletingRowKey = ref<string | null>(null)
const deletingBulk = ref(false)

const editRow = (row: Localization) => {
  console.log('Редактирование:', row)
  toast.add({ title: 'Редактирование', description: 'Функция в разработке (заглушка)', color: 'blue' })
}

const deleteRow = async (key: string) => {
  if (!confirm(`Удалить ключ "${key}"?`)) return
  
  deletingRowKey.value = key
  const { error } = await supabase
    .from('localizations')
    .delete()
    .eq('technical_key', key)

  if (error) {
    toast.add({ title: 'Ошибка удаления', description: error.message, color: 'error' })
  } else {
    localizations.value = localizations.value.filter(r => r.technical_key !== key)
    selectedKeys.value.delete(key)
    toast.add({ title: 'Запись удалена', color: 'success' })
  }
  deletingRowKey.value = null
}

const deleteSelected = async () => {
  if (selectedKeys.value.size === 0) return
  if (!confirm(`Удалить ${selectedKeys.value.size} выбранных записей?`)) return

  deletingBulk.value = true
  const keysToDelete = Array.from(selectedKeys.value)

  const { error } = await supabase
    .from('localizations')
    .delete()
    .in('technical_key', keysToDelete)

  if (error) {
    toast.add({ title: 'Ошибка удаления', description: error.message, color: 'error' })
  } else {
    localizations.value = localizations.value.filter(r => !selectedKeys.value.has(r.technical_key))
    selectedKeys.value.clear()
    isAllSelected.value = false
    toast.add({ title: `Удалено записей: ${keysToDelete.length}`, color: 'success' })
  }
  deletingBulk.value = false
}

// --- Состояние редактирования ячейки (быстрое) ---
const editingCell = ref<{ key: string, lang: string } | null>(null)
const editValue = ref('')

const onInputFocus = (e: FocusEvent) => {
  const input = e.target as HTMLInputElement
  setTimeout(() => {
    input.select() // Полное выделение текста
    // input.setSelectionRange(0, 0)
  }, 0)
}

// --- Утилиты ---
const isNewKey = (dateString?: string) => {
  if (!dateString) return false
  const date = new Date(dateString).getTime()
  return (Date.now() - date) <= (3 * 24 * 60 * 60 * 1000)
}

const formatDate = (dateString?: string) => {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

// --- Загрузка данных ---
const fetchMore = async (reset = false) => {
  if (pending.value || (allLoaded.value && !reset)) return
  
  pending.value = true
  if (reset) {
    localizations.value = Array.from({ length: pageSize }, () => ({
      technical_key: '', translations: {}, created_at: '', updated_at: '', _isSkeleton: true
    }))
    currentPage.value = 0
    allLoaded.value = false
  }

  const from = currentPage.value * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('localizations')
    .select('technical_key, translations, created_at, updated_at')
    .range(from, to)
    .order('technical_key', { ascending: true })

  if (q.value) {
    const safeSearch = q.value.replace(/"/g, '')
    const searchTerm = `"%${safeSearch}%"` 
    const conditions = [`technical_key.ilike.${searchTerm}`]
    languages.forEach(lang => conditions.push(`translations->>${lang}.ilike.${searchTerm}`))
    query = query.or(conditions.join(','))
  }

  if (selectedTags.value.length > 0) {
    query = query.contains('attributes', { tags: selectedTags.value })
  }

  const { data, error } = await query

  if (!error && data) {
    if (data.length < pageSize) allLoaded.value = true
    
    if (isAllSelected.value) {
      data.forEach(r => selectedKeys.value.add(r.technical_key))
    }

    if (currentPage.value === 0) {
      localizations.value = data as Localization[]
    } else {
      localizations.value.push(...(data as Localization[]))
    }
    currentPage.value++
  } else if (error && currentPage.value === 0) {
    localizations.value = []
  }
  pending.value = false
}

// --- Сохранение ячейки ---
const saveTranslation = async (row: Localization, lang: string) => {
  if (!editingCell.value || row._isSkeleton) return
  
  const newValue = editValue.value.trim()
  const oldValue = row.translations?.[lang] || ''

  if (newValue === oldValue) {
    editingCell.value = null
    return
  }

  const updatedTranslations = { ...row.translations, [lang]: newValue }
  const now = new Date().toISOString()

  editingCell.value = null 

  const { error } = await supabase
    .from('localizations')
    .update({ translations: updatedTranslations, updated_at: now })
    .eq('technical_key', row.technical_key)

  if (error) {
    toast.add({ title: 'Ошибка', description: error.message, color: 'error' })
  } else {
    row.translations = { ...updatedTranslations } 
    row.updated_at = now
  }
}

const copyToClipboard = async (text: string) => {
  if (!text || text === '—') return
  try {
    await navigator.clipboard.writeText(text)
  } catch (err) { console.error(err) }
}

const columns = computed<TableColumn<Localization>[]>(() => [
  {
    accessorKey: 'technical_key',
    header: 'Ключ',
    meta: {
      class: {
        th: 'w-[220px] min-w-[220px] max-w-[220px] sticky left-0 top-0 bg-white z-30 text-left px-4 border-r border-b border-gray-200',
        td: 'w-[220px] min-w-[220px] max-w-[220px] sticky left-0 bg-white z-10 font-mono text-[10px] font-bold border-r border-gray-200 p-0'
      }
    },
    cell: ({ row }) => {
      if (row.original._isSkeleton) return h('div', { class: 'flex items-center w-full h-full min-h-[40px] px-4' }, [ h('div', { class: 'h-4 bg-gray-200 rounded animate-pulse w-32' }) ])
      
      const keyText = row.getValue('technical_key') as string
      const textColorClass = isNewKey(row.original.created_at) ? 'text-green-600' : 'text-blue-600'
      
      return h('div', {
        class: `flex items-center w-full h-full min-h-[40px] px-4 cursor-pointer hover:bg-gray-50 overflow-hidden ${textColorClass}`,
        onClick: () => copyToClipboard(keyText)
      }, [ h('span', { class: 'truncate block w-full', title: keyText }, keyText) ])
    }
  },
  ...languages.map(lang => ({
    id: lang,
    header: lang.toUpperCase(),
    meta: {
      class: {
        th: 'w-[180px] min-w-[180px] max-w-[180px] text-left px-4 border-r border-b border-gray-100 sticky top-0 bg-white z-20',
        td: 'w-[180px] min-w-[180px] max-w-[180px] p-0 border-r border-gray-50 relative'
      }
    },
    cell: ({ row }: { row: any }) => {
      if (row.original._isSkeleton) return h('div', { class: 'flex items-center w-full h-full min-h-[40px] px-3' }, [ h('div', { class: 'h-3 bg-gray-100 rounded animate-pulse w-full' }) ])

      const val = row.original.translations?.[lang] || ''
      const isEditing = editingCell.value?.key === row.original.technical_key && editingCell.value?.lang === lang

      if (isEditing) {
        return h('div', { class: 'absolute inset-0 flex items-center z-50 bg-white' }, [
          h(resolveComponent('UInput'), {
            modelValue: editValue.value,
            'onUpdate:modelValue': (v: string) => (editValue.value = v),
            size: 'xs', autofocus: true,
            class: 'w-[calc(100%+2px)] h-[calc(100%+2px)] -ml-[1px] -mt-[1px]',
            onFocus: onInputFocus,
            ui: { base: 'w-full h-full rounded-none ring-2 ring-inset ring-blue-500 bg-white', padding: { xs: 'px-3' } },
            onBlur: () => saveTranslation(row.original, lang),
            onKeydown: (e: KeyboardEvent) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              if (e.key === 'Escape') editingCell.value = null
            }
          })
        ])
      }

      return h('div', {
        class: 'flex items-center px-3 w-full h-full min-h-[40px] text-[11px] cursor-pointer select-none outline-none focus:bg-blue-50 hover:bg-gray-50/50 overflow-hidden',
        tabindex: 0,
        onClick: (e: MouseEvent) => { e.stopPropagation(); copyToClipboard(val) },
        onDblclick: (e: MouseEvent) => {
          e.stopPropagation()
          editingCell.value = { key: row.original.technical_key, lang }
          editValue.value = val
        }
      }, [ h('span', { class: 'truncate block w-full', title: val }, val || h('span', { class: 'text-gray-300' }, '—')) ])
    }
  })),
  {
    accessorKey: 'created_at',
    header: 'Created At',
    meta: {
      class: {
        th: 'w-[130px] min-w-[130px] max-w-[130px] text-left px-4 border-r border-b border-gray-100 sticky top-0 bg-white z-20',
        td: 'w-[130px] min-w-[130px] max-w-[130px] p-0 border-r border-gray-50'
      }
    },
    cell: ({ row }) => {
      if (row.original._isSkeleton) return h('div', { class: 'flex items-center w-full h-full min-h-[40px] px-4' }, [ h('div', { class: 'h-3 bg-gray-200 rounded animate-pulse w-20' }) ])
      return h('div', { class: 'flex items-center px-4 w-full h-full min-h-[40px] text-gray-500 text-[10px]' }, formatDate(row.getValue('created_at')))
    }
  },
  {
    accessorKey: 'updated_at',
    header: 'Updated At',
    meta: {
      class: {
        th: 'w-[130px] min-w-[130px] max-w-[130px] text-left px-4 border-r border-b border-gray-100 sticky top-0 bg-white z-20',
        td: 'w-[130px] min-w-[130px] max-w-[130px] p-0 border-r border-gray-100'
      }
    },
    cell: ({ row }) => {
      if (row.original._isSkeleton) return h('div', { class: 'flex items-center w-full h-full min-h-[40px] px-4' }, [ h('div', { class: 'h-3 bg-gray-200 rounded animate-pulse w-20' }) ])
      return h('div', { class: 'flex items-center px-4 w-full h-full min-h-[40px] text-gray-500 text-[10px]' }, formatDate(row.getValue('updated_at')))
    }
  },
  {
    id: 'actions',
    header: '',
    meta: {
      class: {
        th: 'w-[80px] min-w-[80px] max-w-[80px] sticky right-[50px] bg-white z-20 border-b border-gray-100',
        td: 'w-[80px] min-w-[80px] max-w-[80px] sticky right-[50px] bg-white z-10 p-0 sticky-right border-l border-gray-100'
      }
    },
    cell: ({ row }) => {
      if (row.original._isSkeleton) return h('div')
      return h('div', { class: 'flex items-center justify-center gap-1 w-full h-full min-h-[40px]' }, [
        h(resolveComponent('UButton'), { 
          icon: 'i-heroicons-pencil-square', size: 'xs', color: 'gray', variant: 'ghost',
          onClick: () => editRow(row.original)
        }),
        h(resolveComponent('UButton'), { 
          icon: 'i-heroicons-trash', size: 'xs', color: 'red', variant: 'ghost',
          loading: deletingRowKey.value === row.original.technical_key,
          onClick: () => deleteRow(row.original.technical_key)
        })
      ])
    }
  },
  {
    id: 'selection',
    header: () => {
      const loadedCount = localizations.value.filter(r => !r._isSkeleton).length
      const isAll = isAllSelected.value || (loadedCount > 0 && selectedKeys.value.size === loadedCount)
      const isIndeterminate = selectedKeys.value.size > 0 && !isAll

      return h('div', { class: 'flex items-center justify-center w-full h-full' }, [
        h(resolveComponent('UCheckbox'), {
          modelValue: isIndeterminate ? 'indeterminate' : isAll,
          'onUpdate:modelValue': (val: any) => toggleAll(val)
        })
      ])
    },
    meta: {
      class: {
        th: 'w-[50px] min-w-[50px] max-w-[50px] sticky right-0 bg-white z-30 border-l border-b border-gray-100 px-0',
        td: 'w-[50px] min-w-[50px] max-w-[50px] sticky right-0 bg-white z-20 p-0 border-l border-gray-100 sticky-right'
      }
    },
    cell: ({ row }) => {
      if (row.original._isSkeleton) return h('div')
      return h('div', { class: 'flex items-center justify-center w-full h-full min-h-[40px]' }, [
        h(resolveComponent('UCheckbox'), {
          modelValue: selectedKeys.value.has(row.original.technical_key),
          'onUpdate:modelValue': (val: boolean) => toggleRow(row.original.technical_key, val)
        })
      ])
    }
  }
])

// --- Скролл ---
let lastScrollTop = 0
let lastScrollTime = Date.now()

const onTableScroll = (e: Event) => {
  const el = e.target as HTMLElement
  if (!el || typeof el.scrollTop !== 'number') return

  const { scrollTop, scrollHeight, clientHeight } = el
  const now = Date.now()
  const dt = now - lastScrollTime
  
  lastScrollTop = scrollTop
  lastScrollTime = now

  if (scrollHeight - scrollTop - clientHeight < 800) {
    fetchMore()
  }
}

// --- Поиск и фильтрация ---
let searchTimeout: NodeJS.Timeout

const handleSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    fetchMore(true)
  }, 400)
}

const handleTagChange = () => {
  fetchMore(true)
}

// --- Экспорт ZIP ---
const exporting = ref(false)

const exportArchive = async () => {
  if (exporting.value) return
  exporting.value = true

  try {
    const allData: any[] = []
    let hasMore = true
    let from = 0
    const step = 1000

    while (hasMore) {
      let query = supabase
        .from('localizations')
        .select('technical_key, translations')
        .range(from, from + step - 1)

      if (q.value) {
        const safeSearch = q.value.replace(/"/g, '')
        const searchTerm = `"%${safeSearch}%"` 
        const conditions = [`technical_key.ilike.${searchTerm}`]
        languages.forEach(lang => conditions.push(`translations->>${lang}.ilike.${searchTerm}`))
        query = query.or(conditions.join(','))
      }

      if (selectedTags.value.length > 0) {
        query = query.contains('attributes', { tags: selectedTags.value })
      }

      const { data, error } = await query

      if (error) throw error
      if (data && data.length > 0) { allData.push(...data); from += step }
      if (!data || data.length < step) hasMore = false
    }

    const archives: Record<string, Record<string, string>> = {}
    languages.forEach(lang => archives[lang] = {})

    allData.forEach(row => {
      if (!row.technical_key) return
      languages.forEach(lang => archives[lang][row.technical_key] = row.translations?.[lang] || '')
    })

    const zip = new JSZip()
    languages.forEach(lang => zip.file(`${lang}.json`, JSON.stringify(archives[lang], null, 2)))

    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = 'localizations.zip'
    document.body.appendChild(a)
    a.click()
    
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.add({ title: 'Экспорт ZIP завершен', color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'Ошибка экспорта', description: error.message, color: 'error' })
  } finally {
    exporting.value = false
  }
}

// --- Экспорт Figma ---
const exportingFigma = ref(false)

const exportFigma = async () => {
  if (exportingFigma.value) return
  exportingFigma.value = true

  try {
    const allData: any[] = []
    let hasMore = true
    let from = 0
    const step = 1000

    while (hasMore) {
      let query = supabase
        .from('localizations')
        .select('technical_key, translations')
        .range(from, from + step - 1)

      if (q.value) {
        const safeSearch = q.value.replace(/"/g, '')
        const searchTerm = `"%${safeSearch}%"` 
        const conditions = [`technical_key.ilike.${searchTerm}`]
        languages.forEach(lang => conditions.push(`translations->>${lang}.ilike.${searchTerm}`))
        query = query.or(conditions.join(','))
      }

      if (selectedTags.value.length > 0) {
        query = query.contains('attributes', { tags: selectedTags.value })
      }

      const { data, error } = await query

      if (error) throw error
      if (data && data.length > 0) { allData.push(...data); from += step }
      if (!data || data.length < step) hasMore = false
    }

    const figmaVariables: Record<string, any> = {}

    allData.forEach(row => {
      if (!row.technical_key) return

      const values: Record<string, string> = {}
      
      languages.forEach(lang => {
        values[lang] = row.translations?.[lang] || ''
      })

      figmaVariables[row.technical_key] = {
        $type: 'string',
        $value: values
      }
    })

    const finalJson = {
      "Localizations": figmaVariables
    }

    const blob = new Blob([JSON.stringify(finalJson, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = 'figma-variables.json'
    document.body.appendChild(a)
    a.click()
    
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.add({ title: 'Экспорт для Figma завершен', color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'Ошибка экспорта', description: error.message, color: 'error' })
  } finally {
    exportingFigma.value = false
  }
}

onMounted(() => {
  fetchTags()
  fetchMore()
})
</script>

<template>
  <div class="flex flex-col h-[calc(100dvh-64px)] bg-white overflow-hidden text-black overscroll-none">
    <div class="flex items-center justify-between gap-4 p-4 border-b border-gray-200 shrink-0 bg-white">
      
      <div class="flex items-center gap-3 w-full max-w-2xl">
        <UInput 
          v-model="q" 
          icon="i-heroicons-magnifying-glass" 
          placeholder="Поиск по ключу..." 
          class="w-full max-w-sm" 
          @input="handleSearch" 
        />
        <USelectMenu
          v-model="selectedTags"
          :items="availableTags"
          value-attribute="value"
          option-attribute="label"
          multiple
          searchable
          searchable-placeholder="Искать тег..."
          placeholder="Теги"
          class="w-64"
          @update:model-value="handleTagChange"
        >
          <template #label>
            <span v-if="selectedTags.length" class="truncate">
              {{ selectedTags.join(', ') }}
            </span>
            <span v-else>Все теги</span>
          </template>
        </USelectMenu>
      </div>
      
      <div class="flex items-center gap-4">
        <UButton 
          v-if="selectedKeys.size > 0"
          icon="i-heroicons-trash" 
          color="red" 
          variant="soft" 
          :loading="deletingBulk" 
          @click="deleteSelected"
        >
          Удалить выбранные ({{ selectedKeys.size }})
        </UButton>

        <span class="text-xs text-gray-500">
          На экране: {{ localizations.filter(l => !l._isSkeleton).length }}
        </span>
        
        <UButton 
          icon="i-heroicons-swatch" 
          color="blue" 
          variant="soft" 
          :loading="exportingFigma" 
          @click="exportFigma"
        >
          Export Figma
        </UButton>

        <UButton 
          icon="i-heroicons-arrow-down-tray" 
          color="gray" 
          variant="solid" 
          :loading="exporting" 
          @click="exportArchive"
        >
          Export ZIP
        </UButton>
      </div>
    </div>

    <div class="flex-1 overflow-auto bg-white" @scroll.capture="onTableScroll">
      <UTable
        :data="localizations"
        :columns="columns"
        :virtual="{ itemHeight: 40 }"
        class="min-w-max border-separate border-spacing-0"
        style="height: 100%"
      >
        <template #empty-state>
          <div v-if="!pending" class="py-20 text-center text-sm text-gray-500">Пусто</div>
        </template>
      </UTable>

      <div v-if="pending && currentPage > 0" class="flex justify-center py-4 bg-white border-t border-gray-100">
        <UIcon name="i-heroicons-arrow-path" class="animate-spin text-gray-500 w-5 h-5" />
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(td) {
  height: 1px;
}

:deep([data-slot="root"]) {
  overflow: visible !important;
}

:deep(table) {
  width: auto;
  min-width: 100%;
  transform: translateZ(0);
}

:deep(input:focus) {
  outline: none;
}

.flex-1::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
.flex-1::-webkit-scrollbar-track {
  background: #f9fafb;
}
.flex-1::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 5px;
  border: 2px solid #f9fafb;
}
.flex-1::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

:deep(tr:nth-child(even) td) {
  background-color: #f9fafb;
}

:deep(tr:nth-child(even) td.sticky) {
  background-color: #f9fafb;
}
:deep(tr:nth-child(even) td.sticky-right) {
  background-color: #f9fafb;
}

:deep(tr:hover td) {
  background-color: #f3f4f6 !important;
}
</style>