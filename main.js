const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const fs   = require('fs')
const path = require('path')

// ── Create the window ─────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 750,
    title: 'WinDir Explorer',
    webPreferences: {
      // This allows our renderer.js to talk to main.js
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    }
  })
  win.loadFile('index.html')
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => app.quit())

// ── Recursive folder size calculator ──────────
// Walks every file inside a folder and adds up sizes
// Async version — doesn't block the main process
async function getFolderSize(dirPath) {
  let total = 0
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      try {
        if (entry.isDirectory()) {
          total += await getFolderSize(fullPath)
        } else {
          const stat = await fs.promises.stat(fullPath)
          total += stat.size
        }
      } catch { /* skip inaccessible */ }
    }
  } catch { /* skip inaccessible */ }
  return total
}

// ── LISTENER 1: Open folder dialog ────────────
// When renderer says "browse", show the folder picker
// and send back the path the user chose
ipcMain.handle('browse-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Choose a folder to explore'
  })
  // If user cancelled, return null
  if (result.canceled) return null
  return result.filePaths[0]
})


// ── LISTENER 2: Read a directory ──────────────
// When renderer says "read this path",
// return all files and folders inside it
ipcMain.handle('read-directory', async (_event, dirPath) => {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    const results = []

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)

      try {
        const stat = fs.statSync(fullPath)
        const isDir = entry.isDirectory()

        results.push({
          name:        entry.name,
          fullPath:    fullPath,
          isDirectory: isDir,
          size:        stat.size,
          modified:    stat.mtime.toISOString(),
          mode:        stat.mode,        // raw number → we convert in renderer
        })

      } catch (e) {
        // Some system files block access — skip them gracefully
        results.push({
          name:        entry.name,
          fullPath:    fullPath,
          isDirectory: entry.isDirectory(),
          size:        0,
          modified:    null,
          mode:        0,
          error:       true
        })
      }
    }

    return { success: true, entries: results }

  } catch (e) {
    return { success: false, error: e.message, entries: [] }
  }
})

// When renderer asks for a folder's size, calculate and return it
// In-memory cache — lives only while the app is open
const sizeCache = new Map()

// ── LISTENER 3: Calculate size of a directory ──────────────
ipcMain.handle('get-folder-size', async (_event, dirPath) => {
  try {
    // Already calculated this session? Return instantly
    if (sizeCache.has(dirPath)) {
      return { success: true, size: sizeCache.get(dirPath), cached: true }
    }

    // Not cached yet — calculate it
    const size = await getFolderSize(dirPath)

    // Store it for next time
    sizeCache.set(dirPath, size)

    return { success: true, size, cached: false }
  } catch (e) {
    return { success: false, size: 0 }
  }
})

// ── LISTENER 4:Clear cache when user wants fresh data ──────────────
ipcMain.handle('clear-cache', () => {
  sizeCache.clear()
  return true
})

// ── LISTENER 5: Open a file with default app ──

ipcMain.handle('open-file', (_event, filePath) => {
  shell.openPath(filePath)
})

// ── LISTENER 6: Delete file or folder ─────────
ipcMain.handle('delete-entry', async (_event, fullPath) => {
  try {
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      // recursive: true removes folder and everything inside
      fs.rmSync(fullPath, { recursive: true, force: true })
    } else {
      fs.unlinkSync(fullPath)
    }
    return { success: true }
  } catch (e) {
    // Common reasons: access denied, file in use
    return { success: false, error: e.message }
  }
})