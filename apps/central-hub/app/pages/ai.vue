<script setup lang="ts">
definePageMeta({ title: 'MCP' })

// Подключение нейросетей по MCP: адрес этого стенда, общий токен и короткая инструкция для Claude Code. Страница
// не на /mcp: там сам MCP-сервер, и клиенты MCP ходят туда в том числе GET-запросом. В командах на экране —
// «<токен>», а копируются они с настоящим значением (CopyCommand with-token)
const mcpUrl = `${useRequestURL().origin}/mcp`
const mcpJson = JSON.stringify(
  { mcpServers: { 'amaya-hub': { type: 'http', url: mcpUrl, headers: { Authorization: 'Bearer ${AMAYA_HUB_TOKEN}' } } } },
  null,
  2
)
const setEnv = [
  { os: 'Windows', command: 'setx AMAYA_HUB_TOKEN "<токен>"' },
  { os: 'macOS', command: `echo 'export AMAYA_HUB_TOKEN="<токен>"' >> ~/.zshrc` }
]
const addForUser = `claude mcp add --transport http --scope user amaya-hub ${mcpUrl} --header "Authorization: Bearer <токен>"`

// Что умеет — по инструментам сервера (server/routes/mcp.ts)
const CAN = [
  'искать и читать строки на любом языке',
  'находить похожие строки — перед новым ключом обязательно',
  'смотреть дерево ключей и справочники игр, сайтов и тестов',
  'создавать ключи — только с описанием',
  'писать черновые переводы со статусом «от ИИ»',
  'показывать непереведённое, проверять подстановки и длину'
]
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
    <h1 class="text-lg font-semibold text-highlighted">
      MCP для нейросетей
    </h1>
    <p class="mt-1 max-w-xl text-sm text-muted">
      Claude Code и другие клиенты MCP работают с текстами сервиса напрямую: находят строки, заводят ключи и пишут
      черновые переводы.
    </p>

    <div class="mt-8 max-w-xl">
      <dl class="space-y-3">
        <div>
          <dt class="text-xs font-medium text-toned">
            Адрес
          </dt>
          <dd class="mt-1">
            <CopyCommand
              :text="mcpUrl"
              label="Скопировать адрес"
            />
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium text-toned">
            Токен — один на всех, в репозиторий его не кладут
          </dt>
          <dd class="mt-1">
            <SharedToken kind="mcp" />
          </dd>
        </div>
      </dl>

      <section class="mt-10">
        <h2 class="text-sm font-semibold text-highlighted">
          Как подключить Claude Code
        </h2>
        <ol class="mt-3 list-decimal space-y-5 pl-4 text-sm text-toned">
          <li>
            Сохраните токен в переменную <code>AMAYA_HUB_TOKEN</code> — кнопка копирует команду уже с токеном.
            <div class="mt-2 space-y-1.5">
              <div
                v-for="item in setEnv"
                :key="item.os"
                class="flex items-start gap-2"
              >
                <span class="w-16 shrink-0 pt-1.5 text-xs text-muted">{{ item.os }}</span>
                <CopyCommand
                  class="min-w-0 flex-1"
                  :text="item.command"
                  :label="`Скопировать команду для ${item.os}`"
                  with-token="mcp"
                />
              </div>
            </div>
          </li>
          <li>
            Положите <code>.mcp.json</code> в корень проекта.
            <CopyCommand
              class="mt-2"
              :text="mcpJson"
              label="Скопировать .mcp.json"
            />
          </li>
          <li>
            Запустите Claude Code в проекте и разрешите сервер <code>amaya-hub</code>. Команда <code>/mcp</code> покажет
            его подключённым — дальше можно просить словами: «найди в amaya-hub строки про Continue».
          </li>
        </ol>

        <p class="mt-6 text-sm text-toned">
          Сразу во всех проектах, без файла и переменной, — одна команда; токен сохранится в <code>~/.claude.json</code>:
        </p>
        <CopyCommand
          class="mt-2"
          :text="addForUser"
          label="Скопировать команду claude mcp add"
          with-token="mcp"
        />
      </section>

      <section class="mt-10">
        <h2 class="text-sm font-semibold text-highlighted">
          Что может нейросеть
        </h2>
        <ul class="mt-3 space-y-1.5 text-sm">
          <li
            v-for="item in CAN"
            :key="item"
            class="flex gap-2 text-toned"
          >
            <UIcon
              name="i-lucide-check"
              class="mt-0.5 size-4 shrink-0 text-success"
            />
            {{ item }}
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
