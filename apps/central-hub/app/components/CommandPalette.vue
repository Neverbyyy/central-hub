<script setup lang="ts">
import type { CommandPaletteGroup, CommandPaletteItem } from '@nuxt/ui'
import { escapeLike } from '@amaya/l10n-core'

// Палитра команд по Ctrl+K / ⌘K: найти ключ, открыть очередь перевода, применить частый фильтр
const open = ref(false)
const searchTerm = ref('')
const searching = ref(false)

const supabase = useSupabaseClient()
const route = useRoute()

defineShortcuts({
  meta_k: {
    usingInput: true,
    handler: () => {
      open.value = !open.value
    }
  }
})

const go = (to: Parameters<typeof navigateTo>[0]) => {
  open.value = false
  return navigateTo(to)
}

const colorMode = useColorMode()

const setTheme = (theme: 'light' | 'dark') => {
  open.value = false
  colorMode.preference = theme
}

// --- Ключи: ищем в базе, а не в загруженных строках грида ---
interface Found {
  technical_key: string
  translations: Record<string, string>
}

const found = ref<Found[]>([])

watchDebounced(searchTerm, async (value) => {
  const term = value.trim().toLowerCase()
  if (term.length < 2) {
    found.value = []
    return
  }
  searching.value = true
  const { data } = await supabase
    .from('localizations')
    .select('technical_key, translations')
    .is('deprecated_at', null)
    .ilike('search_text', `%${escapeLike(term)}%`)
    .order('technical_key')
    .limit(8)
  // Пока ждали ответ, человек мог допечатать — старый ответ не показываем
  if (searchTerm.value.trim().toLowerCase() === term) found.value = (data ?? []) as Found[]
  searching.value = false
}, { debounce: 200 })

// --- Языки для очереди перевода ---
// Общие с гридом и очередью (useLanguages) — грузятся при первом открытии, если ещё не загружены
const { targets: languages, load: loadLanguages } = useLanguages()

watch(open, (value) => {
  if (!value) {
    searchTerm.value = ''
    return
  }
  loadLanguages()
})

const groups = computed<CommandPaletteGroup<CommandPaletteItem>[]>(() => {
  const keys: CommandPaletteItem[] = found.value.map(row => ({
    label: row.technical_key,
    suffix: row.translations?.en ?? '',
    icon: 'i-lucide-key-round',
    onSelect: () => go({ path: '/localizations', query: { q: row.technical_key, key: row.technical_key } })
  }))

  const actions: CommandPaletteItem[] = [
    { label: 'Новый ключ', icon: 'i-lucide-plus', onSelect: () => go({ path: '/localizations', query: { ...(route.path === '/localizations' ? route.query : {}), new: '1' } }) },
    ...languages.value.map(lang => ({
      label: `Очередь перевода: ${lang.code.toUpperCase()}`,
      suffix: lang.name,
      icon: 'i-lucide-list-todo',
      onSelect: () => go({ path: '/localizations/queue', query: { lang: lang.code } })
    })),
    { label: 'Показать: не утверждённые', icon: 'i-lucide-circle-dashed', onSelect: () => go({ path: '/localizations', query: { status: 'pending' } }) },
    { label: 'Показать: от ИИ', icon: 'i-lucide-sparkles', onSelect: () => go({ path: '/localizations', query: { status: 'ai' } }) },
    { label: 'Показать: устаревшие переводы', icon: 'i-lucide-history', onSelect: () => go({ path: '/localizations', query: { stale: '1' } }) },
    { label: 'Показать: изменённые за неделю', icon: 'i-lucide-calendar-clock', onSelect: () => go({ path: '/localizations', query: { recent: '1' } }) },
    { label: 'Тема: светлая', icon: 'i-lucide-sun', onSelect: () => setTheme('light') },
    { label: 'Тема: тёмная', icon: 'i-lucide-moon', onSelect: () => setTheme('dark') }
  ]

  const pages: CommandPaletteItem[] = [
    { label: 'Главная', icon: 'i-lucide-house', onSelect: () => go('/') },
    { label: 'Локализации', icon: 'i-lucide-languages', onSelect: () => go('/localizations') },
    { label: 'Настройки', icon: 'i-lucide-settings', onSelect: () => go('/settings') }
  ]

  return [
    // Ключи уже отобраны базой — повторно фильтровать их нечётким поиском не нужно
    { id: 'keys', label: 'Ключи', items: keys, ignoreFilter: true },
    { id: 'actions', label: 'Действия', items: actions },
    { id: 'pages', label: 'Разделы', items: pages }
  ]
})
</script>

<template>
  <UModal
    v-model:open="open"
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #content>
      <UCommandPalette
        v-model:search-term="searchTerm"
        :groups="groups"
        :loading="searching"
        placeholder="Ключ, текст или команда…"
        close
        class="h-96"
        @update:open="open = $event"
      />
    </template>
  </UModal>
</template>
