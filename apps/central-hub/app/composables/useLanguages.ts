import type { Language } from './useLocalizations'

/**
 * Языки редактора — один запрос на всё приложение: грид, очередь перевода и палитра Ctrl+K читают одни данные.
 * Грузятся по первому load(), а не на каждой странице: палитре они нужны, только когда её открыли.
 */
export function useLanguages() {
  const supabase = useSupabaseClient()
  const { data: languages, status, error, execute } = useAsyncData('languages', async () => {
    const { data, error } = await supabase
      .from('languages')
      .select('code, name, dir, is_source')
      .eq('in_editor', true)
      .order('position')
    if (error) throw error
    return (data ?? []) as Language[]
  }, { server: false, immediate: false, default: () => [] as Language[] })

  // Языки перевода — без исходного английского
  const targets = computed(() => languages.value.filter(l => !l.is_source))

  // Уже загружены или грузятся — второй раз не просим
  const load = async () => {
    if (status.value === 'idle' || status.value === 'error') await execute()
  }

  return { languages, targets, error, load }
}
