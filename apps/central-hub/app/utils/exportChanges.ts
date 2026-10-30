// Изменения выгрузки в проекты: то, что отдают /api/export/*/preview и /push, и подписи для окон

export interface LocaleChange {
  // Путь в файле проекта: allapps_button, coloring1ua.special_offer_sticker
  key: string
  // Нет before — строку добавили, нет after — удалили
  before?: string | null
  after?: string | null
}

export interface FileChange {
  path: string
  lang: string
  added: number
  changed: number
  removed: number
  lines: LocaleChange[]
  // Сервер отдал не все строки файла — их слишком много
  truncated?: true
}

export type ChangeKind = 'added' | 'changed' | 'removed'

export const changeKind = (line: LocaleChange): ChangeKind =>
  line.before === undefined ? 'added' : line.after === undefined ? 'removed' : 'changed'

export const quoteChange = (value: string | null | undefined) =>
  value === undefined ? '—' : value === null ? 'null' : `«${value}»`

export const changeFileName = (path: string) => path.slice(path.lastIndexOf('/') + 1)

export const totalChanges = (changes: FileChange[]) =>
  changes.reduce((n, c) => n + c.added + c.changed + c.removed, 0)
