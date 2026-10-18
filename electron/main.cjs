const { app, BrowserWindow, shell } = require('electron')
const path = require('node:path')

// While `npm run dev` is running, `npm run desktop:dev` points the window at it (hot reload).
const DEV_URL = process.env.PMTS_DEV_URL

let mainWindow = null

const isWebUrl = (url) => /^(https?:|mailto:)/i.test(url)
const withoutHash = (url) => url.split('#')[0]

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: 'PMTS - Proje Mali Takip Sistemi',
    backgroundColor: '#f8fafc',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  // macOS needs the default menu for copy/paste shortcuts; elsewhere the menu bar is just noise.
  if (process.platform !== 'darwin') mainWindow.removeMenu()

  // The app never navigates away: external links open in the default browser instead.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isWebUrl(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (withoutHash(url) === withoutHash(mainWindow.webContents.getURL())) return
    event.preventDefault()
    if (isWebUrl(url)) shell.openExternal(url)
  })

  if (DEV_URL) mainWindow.loadURL(DEV_URL)
  else mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Data lives in this app's localStorage, so two running copies would overwrite each other.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  app.whenReady().then(() => {
    createWindow()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
