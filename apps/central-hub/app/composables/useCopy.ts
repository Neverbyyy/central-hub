/** Копирование в буфер с тостом — одинаково в гриде, панели ключа, форме и фильтрах. */
export function useCopy() {
  const toast = useToast()

  // Длинный текст в тосте — только началом
  const notifyCopied = (text: string, title = 'Скопировано') => {
    toast.add({ title, description: text.length > 80 ? `${text.slice(0, 80)}…` : text, duration: 1500 })
  }

  const copy = async (text: string, title?: string) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      notifyCopied(text, title)
    } catch (error) {
      console.error(error)
    }
  }

  return { copy, notifyCopied }
}
