import type { H3Event } from 'h3'

/**
 * Сообщить открытым окнам «Выгрузка в код», что у набора поменялся PR: выгрузили кнопкой (свой или чужой браузер)
 * или вебхук GitHub сообщил о мерже. Канал публичный — в событии только имя набора, окна перечитывают статус сами.
 * Не дошло — в лог: выгрузка уже сделана, а окна догонят при возврате на вкладку.
 */
export async function notifyExportChanged(event: H3Event, set: string) {
  const db = useDb(event)
  const channel = db.channel(EXPORT_PR_CHANNEL)
  try {
    await channel.httpSend('pr', { set })
  } catch (error) {
    console.error('[export] рассылка не дошла', set, error)
  } finally {
    await db.removeChannel(channel)
  }
}
