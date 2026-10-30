// Какие ключи в какой проект уходят — для подсказок «Выгрузка в код: InApp». Только наборы из базы, без GitHub
export default defineEventHandler(async (event) => {
  const { data, error } = await useDb(event)
    .from('export_sets')
    .select('name, path_template, legacy_prefix, include_prefixes, exclude_prefixes')
    .order('name')
  if (error) throwDbError(error)
  return data
})
