// PostgREST отдаёт не больше 1000 строк за раз — всё остальное читается страницами.
// Без Nuxt-глобалов: общий для ключей, истории и тестов базы.

export const PAGE = 1000

/** Все строки запроса по страницам [from, to]; у запроса должен быть стабильный порядок, иначе страницы пересекутся. */
export async function fetchAllPages<T>(page: (from: number, to: number) => PromiseLike<{ data: unknown[] | null, error: unknown }>): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1)
    if (error) throw error
    rows.push(...((data ?? []) as T[]))
    if (!data || data.length < PAGE) return rows
  }
}
