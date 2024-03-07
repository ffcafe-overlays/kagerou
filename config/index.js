import '../share/lib/util.js'
import '../share/lib/locale.js'
import '../share/lib/config.js'
import './lib/dialog.js'
import './lib/ui.js'
import './lib/tabconfig.js'
import './lib/import-export.js'

window.config = new Config()

config.load()
config.setResizeFactor()

window.locale = new Locale(window.config.get('lang'))

document.addEventListener('DOMContentLoaded', (_) => {
  window.tabconfig = new Tabconfig()
  window.editor = ace.edit('editor')
  editor.$blockScrolling = Infinity
  editor.setTheme('ace/theme/tomorrow_night_eighties')

  let session = editor.getSession()
  session.setMode('ace/mode/css')
  session.setTabSize(2)
  session.setUseSoftTabs(true)

  editor.setValue(config.get('custom_css') || CONFIG_DEFAULT.custom_css + '\n')
  editor.gotoLine(1)

  setTimeout((_) => window.locale.localizeAll(), 500)
})
