// Форматтеры создаются один раз на язык: грид зовёт их на каждую строку, а toLocaleString строит новый каждый вызов
const formatters = new Map<string, Intl.DateTimeFormat>()

const formatter = (locale: HubLocale, year: boolean) => {
  const key = `${locale}:${year}`
  let format = formatters.get(key)
  if (!format) {
    format = new Intl.DateTimeFormat(intlLocale(locale), {
      day: '2-digit',
      month: '2-digit',
      ...(year ? { year: '2-digit' } : {}),
      hour: '2-digit',
      minute: '2-digit'
    })
    formatters.set(key, format)
  }
  return format
}

/** «30.10.26, 11:48» (по-английски — «10/30/26, 11:48 AM»); с year: false — без года. Нет даты — «—». Язык — интерфейса. */
export function formatDateTime(value?: string | null, { year = true }: { year?: boolean } = {}): string {
  if (!value) return '—'
  return formatter(currentHubLocale(), year).format(new Date(value))
}
