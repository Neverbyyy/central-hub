/** Копирование в буфер с тостом — одинаково в гриде, панели ключа, форме и фильтрах. */
export function useCopy() {
  const toast = useToast()
  const { t } = useI18n()

  // Длинный текст в тосте — только началом
  const notifyCopied = (text: string, title?: string) => {
    toast.add({ title: title ?? t('common.copied'), description: text.length > 80 ? `${text.slice(0, 80)}…` : text, duration: 1500 })
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
