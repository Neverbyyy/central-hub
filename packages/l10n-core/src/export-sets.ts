// Какие ключи набор выгрузки кладёт в файлы проекта. Одно правило для выгрузки на сервере
// и для подсказок в интерфейсе «куда попадёт ключ» — чтобы они не разошлись.

export interface ExportSetPrefixes {
  // Старые ключи проекта, например legacy.inapp.
  legacy_prefix: string | null
  // Новые ключи, которые тоже идут в проект, например common., app.
  include_prefixes: readonly string[]
  // Например служебные ключи автотестов common.selftest.
  exclude_prefixes: readonly string[]
}

/** Ключ попадает в файлы набора: свой legacy-префикс или одно из включённых начал — и не из исключённых. */
export function keyInExportSet(set: ExportSetPrefixes, key: string): boolean {
  const included = (!!set.legacy_prefix && key.startsWith(set.legacy_prefix)) || set.include_prefixes.some(prefix => key.startsWith(prefix))
  return included && !set.exclude_prefixes.some(prefix => key.startsWith(prefix))
}
