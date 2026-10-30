/** Текст для LIKE/ILIKE в Postgres: _ и % — обычные символы, а не шаблоны (cars_2 не найдёт cars22). */
export const escapeLike = (value: string) => value.replace(/[\\%_]/g, char => `\\${char}`)
