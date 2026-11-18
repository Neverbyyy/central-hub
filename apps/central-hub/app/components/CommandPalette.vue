<script setup lang="ts">
import type { CommandPaletteGroup, CommandPaletteItem } from '@nuxt/ui'
import { escapeLike } from '@amaya/l10n-core'

// Палитра команд по Ctrl+K / ⌘K: найти ключ, открыть очередь перевода, применить частый фильтр.
// Состояние общее: её открывает и кнопка «Найти ключ» на главной
const open = useCommandPaletteOpen()
const searchTerm = ref('')
const searching = ref(false)

const supabase = useSupabaseClient()
const route = useRoute()
const { t } = useI18n()

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
    onSelect: () => go(keyRoute(row.technical_key))
  }))

  const actions: CommandPaletteItem[] = [
    { label: t('palette.newKey'), icon: 'i-lucide-plus', onSelect: () => go({ path: '/localizations', query: { ...(route.path === '/localizations' ? route.query : {}), new: '1' } }) },
    ...languages.value.map(lang => ({
      label: t('palette.queue', { lang: lang.code.toUpperCase() }),
      suffix: languageName(lang.code),
      icon: 'i-lucide-list-todo',
      onSelect: () => go({ path: '/localizations/queue', query: { lang: lang.code } })
    })),
    { label: t('palette.showPending'), icon: 'i-lucide-circle-dashed', onSelect: () => go({ path: '/localizations', query: { status: 'pending' } }) },
    { label: t('palette.showAi'), icon: 'i-lucide-sparkles', onSelect: () => go({ path: '/localizations', query: { status: 'ai' } }) },
    { label: t('palette.showStale'), icon: 'i-lucide-history', onSelect: () => go({ path: '/localizations', query: { stale: '1' } }) },
    { label: t('palette.showRecent'), icon: 'i-lucide-calendar-clock', onSelect: () => go({ path: '/localizations', query: { recent: '1' } }) },
    { label: t('palette.themeLight'), icon: 'i-lucide-sun', onSelect: () => setTheme('light') },
    { label: t('palette.themeDark'), icon: 'i-lucide-moon', onSelect: () => setTheme('dark') }
  ]

  const pages: CommandPaletteItem[] = [
    { label: t('nav.home'), icon: 'i-lucide-house', onSelect: () => go('/') },
    { label: t('nav.localizations'), icon: 'i-lucide-languages', onSelect: () => go('/localizations') },
    { label: t('nav.settings'), icon: 'i-lucide-settings', onSelect: () => go('/settings') },
    { label: t('palette.mcp'), suffix: t('palette.mcpHint'), icon: 'ri:robot-2-line', onSelect: () => go('/ai') },
    // Внешние сервисы — из того же списка, что карточки на главной (utils/services.ts), в новой вкладке
    ...HUB_SERVICES.filter(service => service.external).map(service => ({
      label: t(`home.services.${service.id}.title`),
      icon: service.icon,
      onSelect: () => {
        open.value = false
        window.open(service.to, '_blank', 'noopener')
      }
    }))
  ]

  return [
    // Ключи уже отобраны базой — повторно фильтровать их нечётким поиском не нужно
    { id: 'keys', label: t('palette.groups.keys'), items: keys, ignoreFilter: true },
    { id: 'actions', label: t('palette.groups.actions'), items: actions },
    { id: 'pages', label: t('palette.groups.pages'), items: pages }
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
        :placeholder="$t('palette.placeholder')"
        close
        class="h-96"
        @update:open="open = $event"
      />
    </template>
  </UModal>
</template>
