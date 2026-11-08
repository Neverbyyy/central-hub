// Amaya Hub — локализация: переменные Figma из сервиса локализации.
//
//   Открыть          окно: токен, разделы и языки, «Загрузить», живое обновление
//   Обновить тексты  без окна: та же выборка, что в прошлый раз, итог — во всплывающем сообщении
//   Следить в фоне   окно скрыто, тексты обновляются сразу после правки — до закрытия файла
//                    или запуска другого плагина (Figma держит запущенным один плагин)
//
// Коллекция «Amaya Hub»: режим на каждый язык (English, Russian…), переменная на ключ, имя — ключ через /.
// Переменные не пересоздаются и не удаляются — привязки текстовых слоёв переживают любое обновление.
// Адрес сервиса и Supabase подставляет сервис при скачивании плагина. Токен — figma.clientStorage
// (на этом компьютере), выборка и коллекция — в самом файле (figma.root), у каждого файла своя.
//
// Живое обновление: окно подписано на Supabase Realtime (WebSocket есть только в окне) и сообщает,
// какие ключи изменились. Тексты берутся не из события, а у сервиса — тем же запросом «что изменилось
// с прошлого ответа» по токену плагина. Пока Realtime не на связи — опрос раз в 5 с, на связи —
// страховочный раз в минуту: событие может потеряться.
// Синтаксис не новее ES2017: песочница основного потока Figma отставала от браузеров.

var HUB = '__HUB_ORIGIN__'
// Пусто — Realtime в сервисе не настроен, живое обновление идёт опросом
var REALTIME_URL = '__SUPABASE_URL__'
var REALTIME_KEY = '__SUPABASE_KEY__'
var COLLECTION_NAME = 'Amaya Hub'
// Служебная переменная с именем режима — видно, какой язык включён у фрейма
var LANGUAGE_KEY = '@language'
var LIVE_INTERVAL = 5000
var LIVE_MAX_INTERVAL = 60000
var SAFETY_INTERVAL = 60000
// Пачка событий (импорт, «Утвердить всё») — один запрос, а не по запросу на строку
var NUDGE_DELAY = 300
var WINDOW_BUTTON = { text: 'Окно', action: showWindow }

var liveTimer = null
var liveDelay = LIVE_INTERVAL
// now из ответа сервиса: следующий запрос живого обновления просит изменения с этого момента
var cursor = null
var running = Promise.resolve()
// Подписка в окне: off — не запущена, connecting, on, offline (окно само переподключается)
var realtime = 'off'
// Запрос живого обновления в пути; dirty — пока он шёл, пришли новые события
var polling = false
var dirty = false
// Запрос по событию уже запланирован — следующие события его не откладывают
var nudged = false
// Окно скрыто: итоги и ошибки — уведомлениями Figma
var background = false
var offlineNotified = false

function post(message) {
  figma.ui.postMessage(message)
}

function readSettings() {
  try {
    return JSON.parse(figma.root.getPluginData('settings') || 'null')
  } catch (error) {
    return null
  }
}

function saveSettings(settings) {
  figma.root.setPluginData('settings', JSON.stringify(settings))
}

async function getToken() {
  return (await figma.clientStorage.getAsync('token')) || ''
}

function authError(message) {
  var error = new Error(message)
  error.auth = true
  return error
}

function query(params) {
  return Object.keys(params)
    .filter(function (name) { return params[name] })
    .map(function (name) { return encodeURIComponent(name) + '=' + encodeURIComponent(params[name]) })
    .join('&')
}

async function api(path, params) {
  var token = await getToken()
  if (!token) throw authError('Вставьте токен плагина')
  var response
  try {
    response = await fetch(HUB + path + '?' + query(params || {}), { headers: { Authorization: 'Bearer ' + token } })
  } catch (error) {
    throw new Error('Сервис не отвечает: ' + HUB)
  }
  var body = {}
  try {
    body = await response.json()
  } catch (error) {
    // не JSON — ниже хватит кода ответа
  }
  if (response.status === 401) throw authError(body.error || 'Неверный токен')
  if (!response.ok) throw new Error(body.error || 'Ошибка сервиса (' + response.status + ')')
  return body
}

// Применения не накладываются: живое обновление ждёт, пока закончится загрузка, и наоборот
function exclusive(task) {
  var next = running.then(task, task)
  running = next.catch(function () {})
  return next
}

async function findCollection(settings, modes) {
  // Ищем среди локальных коллекций, а не по id: удалённую коллекцию Figma по id ещё отдаёт,
  // и переменные создавались бы в ней — невидимыми
  var local = await figma.variables.getLocalVariableCollectionsAsync()
  var existing = local.filter(function (collection) { return collection.id === settings.collectionId })[0]
  if (existing) return existing
  var collection = figma.variables.createVariableCollection(COLLECTION_NAME)
  // В новой коллекции один режим «Mode 1» — он становится первым языком
  collection.renameMode(collection.modes[0].modeId, modes[0].name)
  settings.collectionId = collection.id
  saveSettings(settings)
  return collection
}

function ensureModes(collection, modes) {
  var ids = {}
  modes.forEach(function (mode) {
    var found = collection.modes.filter(function (m) { return m.name === mode.name })[0]
    if (found) {
      ids[mode.code] = found.modeId
      return
    }
    try {
      ids[mode.code] = collection.addMode(mode.name)
    } catch (error) {
      throw new Error('Figma не добавила режим «' + mode.name + '»: ' + error.message + '. Число режимов в коллекции ограничено тарифом Figma.')
    }
  })
  return ids
}

function setValues(variable, modes, modeIds, valueOf) {
  var changed = false
  modes.forEach(function (mode) {
    var value = valueOf(mode)
    if (variable.valuesByMode[modeIds[mode.code]] !== value) {
      variable.setValueForMode(modeIds[mode.code], value)
      changed = true
    }
  })
  return changed
}

function createVariable(name, collection, key) {
  var variable = figma.variables.createVariable(name, collection, 'STRING')
  // Тексты нужны только текстовым слоям — в остальных списках переменных они бы мешали
  variable.scopes = ['TEXT_CONTENT']
  variable.setPluginData('key', key)
  return variable
}

/**
 * Тексты из ответа сервиса → переменные коллекции. full — вся выборка: переменные с ключами не из неё
 * попадают в extra; иначе только изменения, и в extra — ключи, помеченные в сервисе устаревшими.
 */
async function applyTexts(payload, settings, full) {
  var collection = await findCollection(settings, payload.modes)
  var modeIds = ensureModes(collection, payload.modes)

  var byKey = new Map()
  var byName = new Map()
  var local = await figma.variables.getLocalVariablesAsync('STRING')
  local.forEach(function (variable) {
    if (variable.variableCollectionId !== collection.id) return
    var key = variable.getPluginData('key')
    if (key) byKey.set(key, variable)
    byName.set(variable.name, variable)
  })

  var stats = { collection: collection.name, total: payload.variables.length, created: 0, updated: 0, unchanged: 0, extra: [], full: full }
  payload.variables.forEach(function (item) {
    var variable = byKey.get(item.key) || byName.get(item.name)
    var changed = false
    var created = !variable
    if (created) {
      variable = createVariable(item.name, collection, item.key)
      byName.set(item.name, variable)
    } else {
      if (variable.getPluginData('key') !== item.key) variable.setPluginData('key', item.key)
      if (variable.name !== item.name) {
        variable.name = item.name
        changed = true
      }
    }
    byKey.set(item.key, variable)
    if (variable.description !== item.description) {
      variable.description = item.description
      changed = true
    }
    if (setValues(variable, payload.modes, modeIds, function (mode) { return item.values[mode.code] || '' })) changed = true
    if (created) stats.created++
    else if (changed) stats.updated++
    else stats.unchanged++
  })

  var language = byKey.get(LANGUAGE_KEY) || byName.get('language')
  if (!language) {
    language = createVariable('language', collection, LANGUAGE_KEY)
    language.description = 'Название режима: видно, какой язык включён у фрейма'
  } else if (language.getPluginData('key') !== LANGUAGE_KEY) {
    language.setPluginData('key', LANGUAGE_KEY)
  }
  setValues(language, payload.modes, modeIds, function (mode) { return mode.name })

  if (full) {
    var wanted = new Set(payload.variables.map(function (item) { return item.key }))
    byKey.forEach(function (variable, key) {
      if (key !== LANGUAGE_KEY && !wanted.has(key)) stats.extra.push(variable.name)
    })
  } else {
    (payload.removed || []).forEach(function (key) {
      if (byKey.has(key)) stats.extra.push(byKey.get(key).name)
    })
  }
  stats.extra.sort()
  return stats
}

function textsParams(settings, since) {
  return { prefixes: settings.prefixes.join(','), langs: settings.langs.join(','), since: since }
}

async function fullSync(settings) {
  var payload = await api('/api/figma/plugin/texts', textsParams(settings))
  var stats = await exclusive(function () { return applyTexts(payload, settings, true) })
  cursor = payload.now
  // Кнопки плагина в правой панели файла, когда ничего не выделено
  figma.root.setRelaunchData({ sync: 'Разделы: ' + settings.prefixes.join(', '), watch: '', open: '' })
  return stats
}

function plural(n, forms) {
  var mod10 = n % 10
  var mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1]
  return forms[2]
}

function summary(stats) {
  if (!stats.created && !stats.updated) return 'Тексты актуальны: ' + stats.total + ' ' + plural(stats.total, ['ключ', 'ключа', 'ключей'])
  var parts = []
  if (stats.created) parts.push('создано ' + stats.created)
  if (stats.updated) parts.push('обновлено ' + stats.updated)
  return 'Тексты обновлены: ' + parts.join(', ') + ' из ' + stats.total
}

function updatedText(n) {
  return 'обновлено ' + n + ' ' + plural(n, ['текст', 'текста', 'текстов'])
}

function showWindow() {
  background = false
  figma.ui.show()
}

function goBackground() {
  background = true
  offlineNotified = false
  figma.ui.hide()
  figma.notify('Amaya Hub следит за текстами в фоне — до закрытия файла или запуска другого плагина', { timeout: 6000, button: WINDOW_BUTTON })
}

function realtimeEnabled() {
  return !!REALTIME_URL && REALTIME_URL.indexOf('__') !== 0 && !!REALTIME_KEY && REALTIME_KEY.indexOf('__') !== 0
}

function startRealtime() {
  // Подписка одна на все ключи — новая выборка её не перезапускает
  if (!realtimeEnabled() || realtime !== 'off') return
  realtime = 'connecting'
  post({ type: 'realtime-start', url: REALTIME_URL, key: REALTIME_KEY })
}

function stopRealtime() {
  if (realtime === 'off') return
  realtime = 'off'
  post({ type: 'realtime-stop' })
}

function stopLive() {
  if (liveTimer) clearTimeout(liveTimer)
  liveTimer = null
  nudged = false
}

function scheduleLive(delay) {
  stopLive()
  liveTimer = setTimeout(pollLive, delay)
}

// Пауза до следующего запроса без событий: с Realtime — страховка, без него — опрос
function idleDelay() {
  return realtime === 'on' ? SAFETY_INTERVAL : liveDelay
}

function startLive() {
  startRealtime()
  scheduleLive(idleDelay())
}

function liveOn(settings) {
  return !!settings && settings.live !== false && !!cursor
}

async function pollLive() {
  liveTimer = null
  nudged = false
  var settings = readSettings()
  if (!liveOn(settings)) return
  polling = true
  dirty = false
  try {
    var payload = await api('/api/figma/plugin/texts', textsParams(settings, cursor))
    var stats = await exclusive(function () { return applyTexts(payload, settings, false) })
    cursor = payload.now
    liveDelay = LIVE_INTERVAL
    offlineNotified = false
    var changed = stats.created + stats.updated
    post({ type: 'live', at: Date.now(), changed: changed, extra: stats.extra })
    if (background && changed) figma.notify('Amaya Hub: ' + updatedText(changed), { timeout: 3000, button: WINDOW_BUTTON })
    polling = false
    scheduleLive(dirty ? NUDGE_DELAY : idleDelay())
  } catch (error) {
    polling = false
    if (error.auth) {
      report(error)
      return
    }
    // Нет связи — пробуем реже, но не бросаем
    liveDelay = Math.min(liveDelay * 2, LIVE_MAX_INTERVAL)
    post({ type: 'live-error', message: error.message, retryIn: liveDelay })
    if (background && !offlineNotified) {
      offlineNotified = true
      figma.notify('Amaya Hub: ' + error.message + '. Повторяю', { error: true, button: WINDOW_BUTTON })
    }
    scheduleLive(liveDelay)
  }
}

function inSelection(key, prefixes) {
  return prefixes.some(function (prefix) { return key === prefix || key.indexOf(prefix + '.') === 0 })
}

// Окно: эти ключи изменились в сервисе. Чужие разделы не трогаем, пачку собираем в один запрос
function onChanged(keys) {
  var settings = readSettings()
  // Подписку остановили (галка, неверный токен) — запоздалые события окна не в счёт
  if (realtime === 'off' || !liveOn(settings)) return
  if (!keys.some(function (key) { return inSelection(key, settings.prefixes) })) return
  if (polling) {
    dirty = true
    return
  }
  if (nudged) return
  scheduleLive(NUDGE_DELAY)
  nudged = true
}

function onRealtime(state) {
  var was = realtime
  // Остановленную подписку не оживляет запоздалое сообщение окна
  if (was === 'off') return
  realtime = state
  if (!liveOn(readSettings())) return
  // Подключились — одним запросом забираем то, что поменялось, пока шло подключение
  var connected = state === 'on' && was !== 'on'
  // Связь пропала — снова опрос
  var lost = state === 'offline' && was === 'on'
  if (polling) {
    // Идущий запрос сам выберет паузу по новому состоянию; после подключения нужен ещё один
    if (connected) dirty = true
    return
  }
  if (connected) scheduleLive(0)
  else if (lost) scheduleLive(liveDelay)
}

function report(error) {
  if (error.auth) {
    stopLive()
    stopRealtime()
    // Токен вводят в окне — прятать его дальше нельзя
    if (background) showWindow()
    post({ type: 'auth', message: error.message })
    return
  }
  // Загрузка не удалась — в фоне ничего бы не обновлялось молча: показываем окно с причиной
  if (background) showWindow()
  post({ type: 'error', message: error.message })
}

async function runFull(settings) {
  stopLive()
  post({ type: 'busy' })
  try {
    var stats = await fullSync(settings)
    post({ type: 'result', stats: stats, text: summary(stats), at: Date.now() })
    liveDelay = LIVE_INTERVAL
    if (settings.live !== false) startLive()
    return stats
  } catch (error) {
    report(error)
    return null
  }
}

async function loadSections() {
  try {
    post(Object.assign({ type: 'sections' }, await api('/api/figma/plugin/sections')))
    return true
  } catch (error) {
    report(error)
    return false
  }
}

async function onMessage(message) {
  if (message.type === 'token') {
    await figma.clientStorage.setAsync('token', String(message.token || '').trim())
    var settings = readSettings()
    if ((await loadSections()) && settings) await runFull(settings)
  } else if (message.type === 'forget-token') {
    stopLive()
    stopRealtime()
    await figma.clientStorage.setAsync('token', '')
    post({ type: 'auth', message: '' })
  } else if (message.type === 'load') {
    var next = readSettings() || {}
    next.prefixes = message.prefixes
    next.langs = message.langs
    if (next.live === undefined) next.live = true
    saveSettings(next)
    await runFull(next)
  } else if (message.type === 'live') {
    var current = readSettings()
    if (!current) return
    current.live = !!message.on
    saveSettings(current)
    if (current.live) {
      startRealtime()
      scheduleLive(0)
    } else {
      stopLive()
      stopRealtime()
    }
  } else if (message.type === 'changed') {
    onChanged(message.keys || [])
  } else if (message.type === 'realtime') {
    onRealtime(message.state)
  } else if (message.type === 'background') {
    // Кнопка видна только при живом обновлении после загрузки — без них в фоне нечего делать
    if (liveOn(readSettings())) goBackground()
  }
}

// Окно — видимое или скрытое (в фоне оно держит подписку Realtime). Возвращает выборку файла и токен
async function setupWindow(visible) {
  figma.showUI(__html__, { width: 340, height: 560, themeColors: true, title: 'Amaya Hub — локализация', visible: visible })
  figma.on('close', stopLive)
  figma.ui.onmessage = function (message) {
    onMessage(message).catch(report)
  }
  var settings = readSettings()
  var token = await getToken()
  post({ type: 'init', hub: HUB, hasToken: !!token, settings: settings })
  return { settings: settings, token: token }
}

async function openWindow() {
  var opened = await setupWindow(true)
  if (!opened.token) return
  if ((await loadSections()) && opened.settings) await runFull(opened.settings)
}

// «Следить в фоне»: без окна, если плагин уже настроен в этом файле; иначе — окно
async function watchCommand() {
  var settings = readSettings()
  if (!settings || !(await getToken())) return openWindow()
  // Слежение в фоне и есть живое обновление — включаем его, даже если в окне сняли галку
  if (settings.live === false) {
    settings.live = true
    saveSettings(settings)
  }
  background = true
  await setupWindow(false)
  // Разделы — чтобы окно, если его откроют из уведомления, было готово
  if (!(await loadSections())) return
  var stats = await runFull(settings)
  if (stats) figma.notify(summary(stats) + ' · слежу в фоне до закрытия файла', { timeout: 5000, button: WINDOW_BUTTON })
}

// «Обновить тексты»: без окна, если плагин уже настроен в этом файле; иначе — окно
async function syncCommand() {
  var settings = readSettings()
  if (!settings || !(await getToken())) return openWindow()
  try {
    figma.closePlugin(summary(await fullSync(settings)))
  } catch (error) {
    if (error.auth) return openWindow()
    figma.closePlugin('Тексты не обновились: ' + error.message)
  }
}

var COMMANDS = { sync: syncCommand, watch: watchCommand }

;(COMMANDS[figma.command] || openWindow)().catch(function (error) {
  figma.closePlugin('Amaya Hub: ' + error.message)
})
