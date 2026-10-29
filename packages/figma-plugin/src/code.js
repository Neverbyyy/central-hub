// Amaya Hub — тексты: переменные Figma из сервиса локализации.
//
//   Открыть          окно: токен, разделы и языки, «Загрузить», живое обновление
//   Обновить тексты  без окна: та же выборка, что в прошлый раз, итог — во всплывающем сообщении
//
// Коллекция «Amaya Hub»: режим на каждый язык (English, Russian…), переменная на ключ, имя — ключ через /.
// Переменные не пересоздаются и не удаляются — привязки текстовых слоёв переживают любое обновление.
// Адрес сервиса подставляет сервис при скачивании плагина. Токен — figma.clientStorage (на этом компьютере),
// выборка и коллекция — в самом файле (figma.root), у каждого файла своя.
// Синтаксис не новее ES2017: песочница основного потока Figma отставала от браузеров.

var HUB = '__HUB_ORIGIN__'
var COLLECTION_NAME = 'Amaya Hub'
// Служебная переменная с именем режима — видно, какой язык включён у фрейма
var LANGUAGE_KEY = '@language'
var LIVE_INTERVAL = 5000
var LIVE_MAX_INTERVAL = 60000

var liveTimer = null
var liveDelay = LIVE_INTERVAL
// now из ответа сервиса: следующий запрос живого обновления просит изменения с этого момента
var cursor = null
var running = Promise.resolve()

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
  figma.root.setRelaunchData({ sync: 'Разделы: ' + settings.prefixes.join(', '), open: '' })
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

function stopLive() {
  if (liveTimer) clearTimeout(liveTimer)
  liveTimer = null
}

function scheduleLive(delay) {
  stopLive()
  liveTimer = setTimeout(pollLive, delay)
}

async function pollLive() {
  liveTimer = null
  var settings = readSettings()
  if (!settings || settings.live === false || !cursor) return
  try {
    var payload = await api('/api/figma/plugin/texts', textsParams(settings, cursor))
    var stats = await exclusive(function () { return applyTexts(payload, settings, false) })
    cursor = payload.now
    liveDelay = LIVE_INTERVAL
    post({ type: 'live', at: Date.now(), changed: stats.created + stats.updated, extra: stats.extra })
    scheduleLive(liveDelay)
  } catch (error) {
    if (error.auth) {
      post({ type: 'auth', message: error.message })
      return
    }
    // Нет связи — пробуем реже, но не бросаем
    liveDelay = Math.min(liveDelay * 2, LIVE_MAX_INTERVAL)
    post({ type: 'live-error', message: error.message, retryIn: liveDelay })
    scheduleLive(liveDelay)
  }
}

function report(error) {
  post(error.auth ? { type: 'auth', message: error.message } : { type: 'error', message: error.message })
}

async function runFull(settings) {
  stopLive()
  post({ type: 'busy' })
  try {
    var stats = await fullSync(settings)
    post({ type: 'result', stats: stats, text: summary(stats), at: Date.now() })
    liveDelay = LIVE_INTERVAL
    if (settings.live !== false) scheduleLive(LIVE_INTERVAL)
  } catch (error) {
    report(error)
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
    if (current.live) scheduleLive(0)
    else stopLive()
  }
}

async function openWindow() {
  figma.showUI(__html__, { width: 340, height: 540, themeColors: true, title: 'Amaya Hub — тексты' })
  figma.on('close', stopLive)
  figma.ui.onmessage = function (message) {
    onMessage(message).catch(report)
  }
  var settings = readSettings()
  var token = await getToken()
  post({ type: 'init', hub: HUB, hasToken: !!token, settings: settings })
  if (!token) return
  if ((await loadSections()) && settings) await runFull(settings)
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

(figma.command === 'sync' ? syncCommand() : openWindow()).catch(function (error) {
  figma.closePlugin('Amaya Hub: ' + error.message)
})
