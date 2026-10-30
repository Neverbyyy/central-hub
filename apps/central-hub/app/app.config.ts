export default defineAppConfig({
  ui: {
    colors: {
      primary: 'green',
      // «Устарело» и прочие предупреждения — янтарный: жёлтый на светлом фоне не читается
      warning: 'amber',
      // Та же шкала, что у остального интерфейса: смысловые text-muted, bg-muted… совпадают с gray-500, gray-50…
      neutral: 'gray'
    }
  }
})
