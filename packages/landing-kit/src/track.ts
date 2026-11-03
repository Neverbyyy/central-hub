// Аналитика лендинга — одна функция track, через неё идут все нажатия (ТЗ). Аналитику пока не подключаем:
// по умолчанию событие пишется в консоль. Подключить настоящую — setTrackHandler один раз при старте приложения

export type TrackProps = Record<string, string | number | boolean | undefined>
export type TrackHandler = (event: string, props: TrackProps) => void

const toConsole: TrackHandler = (event, props) => {
  console.info('[track]', event, props)
}

let handler: TrackHandler = toConsole

/** Событие лендинга: landing_open, cta_click, store_click, video_play, faq_toggle. */
export function track(event: string, props: TrackProps = {}): void {
  handler(event, props)
}

/** Куда отправлять события; без аргумента — снова в консоль. */
export function setTrackHandler(next?: TrackHandler): void {
  handler = next ?? toConsole
}
