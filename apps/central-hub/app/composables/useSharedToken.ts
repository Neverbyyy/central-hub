// Общие токены — плагина Figma и MCP: один на всех, значение — переменная окружения на сервере. Грузятся только
// в браузере и только там, где их показывают, поэтому в разметку и в payload SSR не попадают. Запрос — один на вкладку:
// поле токена и команды с ним в инструкции берут значение отсюда
export const SHARED_TOKENS = {
  figma: { label: 'Токен плагина', env: 'NUXT_FIGMA_TOKEN', hint: 'Вставьте его в плагин' },
  mcp: { label: 'Токен MCP', env: 'NUXT_MCP_TOKEN', hint: 'Сохраните его в переменную AMAYA_HUB_TOKEN' }
} as const

export type SharedTokenKind = keyof typeof SHARED_TOKENS

const requests = new Map<SharedTokenKind, Promise<string | null>>()

export function useSharedToken(kind: SharedTokenKind) {
  const notifyError = useNotifyError()
  const token = ref<string | null>(null)
  const loading = ref(true)
  const failed = ref(false)

  onMounted(async () => {
    // Об ошибке сообщает только тот, кто начал запрос: два места на странице — один тост
    const own = !requests.has(kind)
    if (own) requests.set(kind, $fetch<{ token: string | null }>(`/api/tokens/${kind}`).then(result => result.token))
    try {
      token.value = await requests.get(kind)!
    } catch (error) {
      requests.delete(kind)
      failed.value = true
      if (own) await notifyError('Токен не загрузился', error)
    } finally {
      loading.value = false
    }
  })

  // Загрузился, а значения нет — переменная не задана на сервере
  const missing = computed(() => !loading.value && !failed.value && !token.value)
  return { token, loading, missing }
}

// Тост последнего копирования — общий для всех кнопок страницы: на экране не больше одного, иначе стопка от нескольких
// копий подряд закрывает кнопки внизу. Прошлый убираем, новый — со своим id: обновление по тому же id не перезапускает
// таймер, и второй тост исчезал бы через долю секунды
let lastCopyToast: string | number | undefined

/** Текст с секретом — в буфер. Не useCopy: тот показывает скопированное в тосте. */
export function useCopySecret() {
  const toast = useToast()
  const copied = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  const copy = async (text: string, title: string, description?: string) => {
    try {
      await navigator.clipboard.writeText(text)
      if (lastCopyToast !== undefined) toast.remove(lastCopyToast)
      lastCopyToast = toast.add({ title, description, duration: 2000 }).id
      copied.value = true
      clearTimeout(timer)
      timer = setTimeout(() => {
        copied.value = false
      }, 2000)
    } catch (error) {
      console.error(error)
    }
  }

  onBeforeUnmount(() => clearTimeout(timer))
  return { copy, copied }
}
