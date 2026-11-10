<!-- Полоса клавиш внизу грида и очереди. Уже 1024 px клавиатуры обычно нет — и полосы тоже.
     Клавиши — <kbd> внутри .hotkeys (assets/css/main.css) -->
<template>
  <div class="hotkeys hidden shrink-0 items-center gap-4 border-t border-default px-4 py-1.5 text-[11px] text-muted lg:flex">
    <slot />
  </div>
</template>
