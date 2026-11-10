/** Отдать файл браузеру на скачивание. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Файлы JSON архивом на скачивание. JSZip грузится только здесь, по нажатию: ~150 КБ не тянутся со страницей. */
export async function downloadJsonZip(files: Record<string, unknown>, filename: string) {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  for (const [name, content] of Object.entries(files)) zip.file(name, JSON.stringify(content, null, 2))
  downloadBlob(await zip.generateAsync({ type: 'blob' }), filename)
}
