// Форматтеры создаются один раз: грид зовёт их на каждую строку, а toLocaleString строит новый каждый вызов
const WITH_YEAR = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
const NO_YEAR = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

/** «30.10.26, 11:48»; с year: false — «30.10, 11:48». Нет даты — «—». */
export function formatDateTime(value?: string | null, { year = true }: { year?: boolean } = {}): string {
  if (!value) return '—'
  return (year ? WITH_YEAR : NO_YEAR).format(new Date(value))
}
