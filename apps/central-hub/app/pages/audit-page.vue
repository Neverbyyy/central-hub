<template>
  <div class="audit-page">
    <h1>Mixpanel Events Audit</h1>
    <p class="hint">
      Данные читаются автоматически из <code>public/data.json</code>. Если файла нет
      или он поменялся — положи его туда же и обнови страницу, либо загрузи вручную ниже.
    </p>

    <div class="upload-block">
      <button @click="loadFromPublic" :disabled="loading">
        {{ loading ? 'Загружаю...' : 'Перечитать data.json' }}
      </button>
      <span class="or">или</span>
      <input type="file" accept=".json,.jsonl,.txt" @change="onFileChange" />
      <span v-if="fileName" class="filename">{{ fileName }} — {{ events.length }} событий</span>
    </div>

    <div class="filters">
      <label>
        С (МСК)
        <input type="date" v-model="fromDate" />
      </label>
      <label>
        По (МСК, включительно)
        <input type="date" v-model="toDate" />
      </label>
      <label>
        Порог "левых" действий (юзер = тестировщик, если больше)
        <input type="number" v-model.number="testerThreshold" min="1" />
      </label>
      <span class="hint range-hint">
        Диапазон: {{ rangeLabel }}
      </span>
    </div>

    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="fileName" class="debug">
      raw length: {{ rawLength }} chars · parsed события: {{ events.length }} ·
      попадают в диапазон: {{ filteredEvents.length }} ·
      events with distinct_id: {{ eventsWithId }} · unique distinct_id: {{ allUsers.size }} ·
      похожих на тестировщиков: {{ suspiciousUsers.size }}
    </div>

    <div v-if="filteredEvents.length" class="results">
      <section class="summary">
        <h2>Воронка</h2>
        <table>
          <thead>
            <tr>
              <th>Шаг</th>
              <th>Уникальных юзеров</th>
              <th>% от предыдущего</th>
              <th>% от старта</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(step, i) in funnelSteps" :key="step">
              <td>{{ step }}</td>
              <td>{{ funnelCounts[i] }}</td>
              <td>{{ i === 0 ? '—' : pct(funnelCounts[i], funnelCounts[i - 1]) }}</td>
              <td>{{ pct(funnelCounts[i], funnelCounts[0]) }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="summary">
        <h2>Итого проблем</h2>
        <ul class="stats">
          <li>Всего уникальных distinct_id: <b>{{ allUsers.size }}</b></li>
          <li>Дублей событий (по $insert_id): <b>{{ duplicates.length }}</b></li>
          <li>Юзеров с пропущенным шагом: <b>{{ skipped.length }}</b></li>
          <li>Юзеров с нарушенным порядком: <b>{{ outOfOrder.length }}</b></li>
          <li class="suspicious-stat">
            ⚠️ Похожих на тестировщиков (много "левых" действий): <b>{{ suspiciousUsers.size }}</b>
          </li>
          <li class="opened-stat">
            🕓 landing_opened вообще не сработал: <b>{{ openedIssues.missing.length }}</b>
          </li>
          <li class="opened-stat">
            🕓 landing_opened сработал позже email_screen: <b>{{ openedIssues.late.length }}</b>
          </li>
          <li class="opened-stat">
            🕓 Попали сразу на email_screen в обход opened: <b>{{ emailBypassOpened.length }}</b>
          </li>
        </ul>
      </section>

      <section v-if="suspiciousList.length" class="issue-block">
        <h2>⚠️ Подозрительные пользователи / тестировщики ({{ suspiciousList.length }})</h2>
        <p class="hint">
          Юзеры, у которых число уникальных реальных действий (по $insert_id) выше порога —
          обычно это тестировщики, которые тыкают всё подряд по кругу, а не реальные юзеры на воронке.
        </p>
        <table>
          <thead>
            <tr><th>distinct_id</th><th>Уникальных действий</th><th>Чаще всего жал</th></tr>
          </thead>
          <tbody>
            <tr v-for="row in suspiciousList.slice(0, 200)" :key="row.id" class="suspicious">
              <td>⚠️ {{ row.id }}</td>
              <td>{{ row.uniqueActions }}</td>
              <td>{{ row.topEvent }} ×{{ row.topEventCount }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="suspiciousList.length > 200" class="hint">показаны первые 200 из {{ suspiciousList.length }}</p>
      </section>

      <section v-if="openedIssuesAll.length" class="issue-block">
        <h2>🕓 Проблемы с landing_opened ({{ openedIssuesAll.length }})</h2>
        <p class="hint">
          Юзеры, у которых landing_opened либо вообще не прилетел, либо прилетел позже,
          чем landing_email_screen (то есть по факту не был первым событием воронки).
        </p>
        <table>
          <thead>
            <tr><th>distinct_id</th><th>Что не так</th><th>utm_source</th><th>utm_medium</th><th>utm_campaign</th><th>utm_content</th></tr>
          </thead>
          <tbody>
            <tr v-for="row in openedIssuesAll.slice(0, 200)" :key="row.id + row.case" class="opened-issue">
              <td>🕓 {{ row.id }}</td>
              <td>{{ row.case }}</td>
              <td>{{ row.utm.source }}</td>
              <td>{{ row.utm.medium }}</td>
              <td>{{ row.utm.campaign }}</td>
              <td>{{ row.utm.content }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="openedIssuesAll.length > 200" class="hint">показаны первые 200 из {{ openedIssuesAll.length }}</p>
      </section>

      <section v-if="emailBypassOpened.length" class="issue-block">
        <h2>Попали сразу на email_screen в обход opened ({{ emailBypassOpened.length }})</h2>
        <p class="hint">Разбивка этих юзеров по utm-меткам — чтобы понять, не один ли это канал/кампания</p>
        <table>
          <thead>
            <tr><th>utm_source</th><th>utm_medium</th><th>utm_campaign</th><th>utm_content</th><th>Юзеров</th></tr>
          </thead>
          <tbody>
            <tr v-for="row in emailBypassUtmBreakdown" :key="row.source + row.medium + row.campaign + row.content">
              <td>{{ row.source }}</td>
              <td>{{ row.medium }}</td>
              <td>{{ row.campaign }}</td>
              <td>{{ row.content }}</td>
              <td>{{ row.count }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section v-if="skipped.length" class="issue-block">
        <h2>Пропущенные шаги ({{ skipped.length }})</h2>
        <table>
          <thead>
            <tr><th>distinct_id</th><th>Дошёл до</th><th>Пропустил</th></tr>
          </thead>
          <tbody>
            <tr
              v-for="row in skipped.slice(0, 200)"
              :key="row.id"
              :class="{ suspicious: isSuspicious(row.id), 'opened-issue': isOpenedIssue(row.id) }"
            >
              <td>
                <span v-if="isSuspicious(row.id)">⚠️ </span>
                <span v-if="isOpenedIssue(row.id)">🕓 </span>{{ row.id }}
              </td>
              <td>{{ row.reached }}</td>
              <td>{{ row.missing.join(', ') }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="skipped.length > 200" class="hint">показаны первые 200 из {{ skipped.length }}</p>
      </section>

      <section v-if="outOfOrder.length" class="issue-block">
        <h2>Нарушенный порядок ({{ outOfOrder.length }})</h2>
        <table>
          <thead>
            <tr><th>distinct_id</th><th>Реальная последовательность</th></tr>
          </thead>
          <tbody>
            <tr
              v-for="row in outOfOrder.slice(0, 200)"
              :key="row.id"
              :class="{ suspicious: isSuspicious(row.id), 'opened-issue': isOpenedIssue(row.id) }"
            >
              <td>
                <span v-if="isSuspicious(row.id)">⚠️ </span>
                <span v-if="isOpenedIssue(row.id)">🕓 </span>{{ row.id }}
              </td>
              <td>{{ row.sequence.join(' → ') }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="outOfOrder.length > 200" class="hint">показаны первые 200 из {{ outOfOrder.length }}</p>
      </section>

      <section v-if="duplicates.length" class="issue-block">
        <h2>Дубли ({{ duplicates.length }})</h2>
        <table>
          <thead>
            <tr><th>distinct_id</th><th>event</th><th>insert_id</th><th>Кол-во</th></tr>
          </thead>
          <tbody>
            <tr
              v-for="row in duplicates.slice(0, 200)"
              :key="row.id + row.event + row.insertId"
              :class="{ suspicious: isSuspicious(row.id) }"
            >
              <td><span v-if="isSuspicious(row.id)">⚠️ </span>{{ row.id }}</td>
              <td>{{ row.event }}</td>
              <td>{{ row.insertId }}</td>
              <td>{{ row.count }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="duplicates.length > 200" class="hint">показаны первые 200 из {{ duplicates.length }}</p>
      </section>

      <div class="export-buttons">
        <button @click="downloadJson('skipped', skipped)">Скачать skipped.json</button>
        <button @click="downloadJson('out_of_order', outOfOrder)">Скачать out_of_order.json</button>
        <button @click="downloadJson('duplicates', duplicates)">Скачать duplicates.json</button>
        <button @click="downloadJson('suspicious_users', suspiciousList)">Скачать suspicious_users.json</button>
        <button @click="downloadJson('opened_issues', openedIssuesAll)">Скачать opened_issues.json</button>
        <button @click="downloadJson('email_bypass_opened', emailBypassOpened)">Скачать email_bypass_opened.json</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

// Порядок ожидаемой линейной воронки — поменяй под свой реальный флоу
const funnelSteps = [
  'landing_opened',
  'landing_email_screen',
  'landing_password_screen',
  'landing_congratulation_screen',
]

const events = ref([])
const fileName = ref('')
const error = ref('')
const loading = ref(false)
const rawLength = ref(0)

// Диапазон дат по МСК (UTC+3, без перевода часов) — по умолчанию 29 авг — 1 сен
const fromDate = ref('2026-08-29')
const toDate = ref('2026-09-01')
// порог "левых" действий (уникальных insert_id у одного юзера), после которого считаем его тестировщиком
const testerThreshold = ref(10)

const MOSCOW_OFFSET_MS = 3 * 60 * 60 * 1000

// Границы диапазона в unix-секундах: from 00:00 МСК, to 23:59:59 МСК (включительно)
const rangeBounds = computed(() => {
  const [fy, fm, fd] = fromDate.value.split('-').map(Number)
  const [ty, tm, td] = toDate.value.split('-').map(Number)
  const startMs = Date.UTC(fy, fm - 1, fd, 0, 0, 0) - MOSCOW_OFFSET_MS
  // конец — начало следующего дня по МСК минус 1мс, чтобы включить весь toDate целиком
  const endMs = Date.UTC(ty, tm - 1, td + 1, 0, 0, 0) - MOSCOW_OFFSET_MS
  return { startSec: Math.floor(startMs / 1000), endSec: Math.floor(endMs / 1000) }
})

const rangeLabel = computed(() => {
  const { startSec, endSec } = rangeBounds.value
  const fmt = (sec) =>
    new Date(sec * 1000).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })
  return `${fmt(startSec)} — ${fmt(endSec - 1)} (МСК)`
})

const eventsWithId = computed(
  () => events.value.filter((e) => e?.properties?.distinct_id).length
)

// Только события, у которых time попадает в выбранный диапазон по МСК
const filteredEvents = computed(() => {
  const { startSec, endSec } = rangeBounds.value
  return events.value.filter((e) => {
    const t = e.properties?.time
    return typeof t === 'number' && t >= startSec && t < endSec
  })
})

// data.json должен лежать в /public/data.json (тогда он доступен по /data.json)
async function loadFromPublic() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch('/data.json', { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const contentType = res.headers.get('content-type') || ''
    const text = await res.text()
    rawLength.value = text.length
    // если сервер вернул html (например, попал в SPA fallback / i18n роутинг вместо статики) — это не наш файл
    if (contentType.includes('text/html') || text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      throw new Error(
        'Ответ пришёл как HTML, а не JSON — значит /data.json не найден и сработал fallback-роут (проверь, что файл лежит в /public/data.json, а не в /pages или /assets)'
      )
    }
    events.value = parseEvents(text)
    fileName.value = 'data.json'
  } catch (err) {
    error.value =
      'Не удалось загрузить /data.json автоматически (' +
      err.message +
      '). Положи файл в public/data.json или загрузи вручную ниже.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadFromPublic()
})

function onFileChange(e) {
  const file = e.target.files[0]
  if (!file) return
  fileName.value = file.name
  error.value = ''
  const reader = new FileReader()
  reader.onload = () => {
    try {
      events.value = parseEvents(reader.result)
    } catch (err) {
      error.value = 'Не удалось распарсить файл: ' + err.message
      events.value = []
    }
  }
  reader.onerror = () => {
    error.value = 'Ошибка чтения файла'
  }
  reader.readAsText(file)
}

function parseEvents(text) {
  // убираем BOM, если он есть
  const cleaned = text.replace(/^\uFEFF/, '')
  // Посимвольный разбор по фигурным скобкам — работает независимо от того,
  // компактный это JSONL, pretty-printed JSONL (объект на много строк) или JSON-массив
  const result = []
  let depth = 0
  let start = -1
  let inString = false
  let escape = false
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i]
    if (inString) {
      if (escape) escape = false
      else if (ch === '\\') escape = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') {
      inString = true
      continue
    }
    if (ch === '{') {
      if (depth === 0) start = i
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0 && start !== -1) {
        const chunk = cleaned.slice(start, i + 1)
        try {
          result.push(JSON.parse(chunk))
        } catch {
          // пропускаем битый кусок, а не роняем весь парсинг
        }
        start = -1
      }
    }
  }
  return result
}

// Группировка по distinct_id, сортировка по time — теперь на отфильтрованных по дате событиях
const byUser = computed(() => {
  const map = new Map()
  for (const e of filteredEvents.value) {
    const id = e.properties?.distinct_id
    if (!id) continue
    if (!map.has(id)) map.set(id, [])
    map.get(id).push({
      event: e.event,
      time: e.properties?.time ?? 0,
      insertId: e.properties?.$insert_id ?? null,
      utm_source: e.properties?.utm_source ?? null,
      utm_medium: e.properties?.utm_medium ?? null,
      utm_campaign: e.properties?.utm_campaign ?? null,
      utm_content: e.properties?.utm_content ?? null,
    })
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => a.time - b.time)
  }
  return map
})

const allUsers = computed(() => new Set(byUser.value.keys()))

// Конверсия по шагам воронки
const funnelCounts = computed(() => {
  return funnelSteps.map((step) => {
    let count = 0
    for (const arr of byUser.value.values()) {
      if (arr.some((e) => e.event === step)) count++
    }
    return count
  })
})

function pct(part, whole) {
  if (!whole) return '—'
  return ((part / whole) * 100).toFixed(1) + '%'
}

// Пропущенные шаги: юзер дошёл до шага N, но не прошёл какой-то шаг < N
const skipped = computed(() => {
  const result = []
  for (const [id, arr] of byUser.value.entries()) {
    const stepEvents = arr.filter((e) => funnelSteps.includes(e.event))
    if (!stepEvents.length) continue
    const presentIdx = new Set(stepEvents.map((e) => funnelSteps.indexOf(e.event)))
    const maxIdx = Math.max(...presentIdx)
    const missing = []
    for (let i = 0; i < maxIdx; i++) {
      if (!presentIdx.has(i)) missing.push(funnelSteps[i])
    }
    if (missing.length) {
      result.push({ id, reached: funnelSteps[maxIdx], missing })
    }
  }
  return result
})

// Нарушенный порядок: индексы шагов по времени должны не убывать
const outOfOrder = computed(() => {
  const result = []
  for (const [id, arr] of byUser.value.entries()) {
    const stepEvents = arr.filter((e) => funnelSteps.includes(e.event))
    const indices = stepEvents.map((e) => funnelSteps.indexOf(e.event))
    let broken = false
    for (let i = 1; i < indices.length; i++) {
      if (indices[i] < indices[i - 1]) {
        broken = true
        break
      }
    }
    if (broken) {
      result.push({ id, sequence: stepEvents.map((e) => e.event) })
    }
  }
  return result
})

// Дубли по $insert_id (одно и то же событие с одним insert_id прилетело больше раза)
const duplicates = computed(() => {
  const result = []
  for (const [id, arr] of byUser.value.entries()) {
    const counts = new Map()
    for (const e of arr) {
      if (!e.insertId) continue
      const key = e.event + '|' + e.insertId
      counts.set(key, (counts.get(key) || 0) + 1)
    }
    for (const [key, count] of counts.entries()) {
      if (count > 1) {
        const [event, insertId] = key.split('|')
        result.push({ id, event, insertId, count })
      }
    }
  }
  return result
})

// Достаём первые попавшиеся utm-метки у юзера (обычно они одинаковые на всех событиях сессии)
function firstUtm(arr) {
  const withUtm = arr.find(
    (e) => e.utm_source || e.utm_medium || e.utm_campaign || e.utm_content
  )
  return {
    source: withUtm?.utm_source ?? '(нет)',
    medium: withUtm?.utm_medium ?? '(нет)',
    campaign: withUtm?.utm_campaign ?? '(нет)',
    content: withUtm?.utm_content ?? '(нет)',
  }
}

// Проблемы конкретно с landing_opened:
// - missing: юзер прошёл дальше по воронке (email/password/congrats), но landing_opened вообще не прилетел
// - late: landing_opened прилетел, но позже, чем landing_email_screen (т.е. по факту сработал не первым)
const openedIssues = computed(() => {
  const missing = []
  const late = []
  for (const [id, arr] of byUser.value.entries()) {
    const openedEvents = arr.filter((e) => e.event === 'landing_opened')
    const emailEvents = arr.filter((e) => e.event === 'landing_email_screen')
    const hasAnyFunnelStep = arr.some((e) => funnelSteps.includes(e.event))
    if (!hasAnyFunnelStep) continue

    if (!openedEvents.length) {
      missing.push({ id, case: 'не сработал вообще', utm: firstUtm(arr) })
    } else if (emailEvents.length) {
      const firstOpened = Math.min(...openedEvents.map((e) => e.time))
      const firstEmail = Math.min(...emailEvents.map((e) => e.time))
      if (firstOpened > firstEmail) {
        late.push({ id, case: 'сработал позже email_screen', utm: firstUtm(arr) })
      }
    }
  }
  return { missing, late }
})

const openedIssuesAll = computed(() => [...openedIssues.value.missing, ...openedIssues.value.late])
const openedIssueIds = computed(() => new Set(openedIssuesAll.value.map((r) => r.id)))

function isOpenedIssue(id) {
  return openedIssueIds.value.has(id)
}

// Именно "попал сразу на email_screen в обход opened" — подмножество missing, у кого точно есть email_screen
const emailBypassOpened = computed(() =>
  openedIssues.value.missing.filter((row) => {
    const arr = byUser.value.get(row.id) || []
    return arr.some((e) => e.event === 'landing_email_screen')
  })
)

// Разбивка этих юзеров по utm-меткам — чтобы понять, не один ли это конкретный канал/кампания
const emailBypassUtmBreakdown = computed(() => {
  const map = new Map()
  for (const row of emailBypassOpened.value) {
    const key = [row.utm.source, row.utm.medium, row.utm.campaign, row.utm.content].join(' | ')
    map.set(key, (map.get(key) || 0) + 1)
  }
  return [...map.entries()]
    .map(([key, count]) => {
      const [source, medium, campaign, content] = key.split(' | ')
      return { source, medium, campaign, content, count }
    })
    .sort((a, b) => b.count - a.count)
})

// Подозрительные юзеры / тестировщики: считаем число УНИКАЛЬНЫХ реальных действий
// (по уникальным insert_id — так технический баг "каждое действие шлётся 4 раза" не портит счёт),
// и если оно выше порога — юзер, скорее всего, тыкает всё подряд по кругу, а не проходит воронку как обычный человек
const suspiciousList = computed(() => {
  const result = []
  for (const [id, arr] of byUser.value.entries()) {
    const uniqueInsertIds = new Set()
    const perEvent = new Map()
    for (const e of arr) {
      const key = e.insertId ?? `${e.event}|${e.time}`
      if (!uniqueInsertIds.has(key)) {
        uniqueInsertIds.add(key)
        perEvent.set(e.event, (perEvent.get(e.event) || 0) + 1)
      }
    }
    const uniqueActions = uniqueInsertIds.size
    if (uniqueActions > testerThreshold.value) {
      let topEvent = ''
      let topEventCount = 0
      for (const [ev, count] of perEvent.entries()) {
        if (count > topEventCount) {
          topEvent = ev
          topEventCount = count
        }
      }
      result.push({ id, uniqueActions, topEvent, topEventCount })
    }
  }
  result.sort((a, b) => b.uniqueActions - a.uniqueActions)
  return result
})

const suspiciousUsers = computed(() => new Set(suspiciousList.value.map((r) => r.id)))

function isSuspicious(id) {
  return suspiciousUsers.value.has(id)
}

function downloadJson(name, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name}.json`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.audit-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px 20px;
  font-family: system-ui, sans-serif;
  color: #1a1a1a;
}
h1 {
  margin-bottom: 4px;
}
.hint {
  color: #666;
  font-size: 14px;
  margin-bottom: 20px;
}
.upload-block {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.filename {
  font-size: 14px;
  color: #444;
}
.filters {
  display: flex;
  align-items: flex-end;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 20px;
  padding: 14px 16px;
  background: #fafafa;
  border-radius: 10px;
  border: 1px solid #eee;
}
.filters label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #555;
}
.filters input {
  padding: 6px 8px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 13px;
}
.range-hint {
  margin-bottom: 0;
  font-size: 12px;
}
.error {
  background: #fde8e8;
  color: #b42318;
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 16px;
}
.debug {
  font-size: 12px;
  color: #888;
  margin-bottom: 20px;
  font-family: monospace;
}
.summary,
.issue-block {
  margin-bottom: 28px;
}
h2 {
  font-size: 18px;
  margin-bottom: 10px;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
th,
td {
  text-align: left;
  padding: 6px 10px;
  border-bottom: 1px solid #eee;
}
th {
  background: #fafafa;
  font-weight: 600;
}
.stats {
  list-style: none;
  padding: 0;
  font-size: 14px;
  display: grid;
  gap: 6px;
}
.suspicious-stat {
  color: #b42318;
  font-weight: 600;
}
tr.suspicious {
  background: #fdecec;
  color: #b42318;
}
tr.suspicious td {
  border-bottom-color: #f7c9c9;
}
.export-buttons {
  display: flex;
  gap: 10px;
  margin-top: 24px;
  flex-wrap: wrap;
}
.export-buttons button {
  padding: 8px 14px;
  border: 1px solid #ccc;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
}
.export-buttons button:hover {
  background: #f4f4f4;
}
</style>