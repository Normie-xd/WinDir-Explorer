// =============================================
// renderer.js — this file runs in your window.
// It handles everything the user clicks/sees.
// We'll keep adding to this file as we build.
// =============================================

// ── Theme Switcher ────────────────────────────
// Grab all theme buttons from the HTML
const btnDark  = document.getElementById('theme-dark')
const btnBlue  = document.getElementById('theme-blue')
const btnLight = document.getElementById('theme-light')
const btnRefresh = document.getElementById('btn-refresh')
const btnOpenSel = document.getElementById('btn-open-sel')
const btnDelete  = document.getElementById('btn-delete')

let selectedEntries = new Set() // stores fullPaths of selected items

// ── Update toolbar button states ───────────────
// Called whenever selection changes
function updateToolbar() {
  const hasSelection = selectedEntries.size > 0
  btnOpenSel.disabled = !hasSelection
  btnDelete.disabled  = !hasSelection
}

// ── Refreshes the UI with updated cache ──────────────
btnRefresh.onclick = async () => {
  // Clear the backend cache
  await window.api.clearCache()

  // Reload current folder fresh
  if (currentPath) {
    loadDirectory(currentPath, false)
  }

  statusbar.textContent = 'Cache cleared — recalculating...'
}

// ── Open selected items ────────────────────────
btnOpenSel.onclick = () => {
  selectedEntries.forEach(fullPath => {
    const entry = allEntries.find(e => e.fullPath === fullPath)
    if (!entry) return
    if (entry.isDirectory) {
      loadDirectory(entry.fullPath)
    } else {
      window.api.openFile(entry.fullPath)
    }
  })
}

// ── Delete selected items ──────────────────────
btnDelete.onclick = async () => {
  const count = selectedEntries.size
  const names = [...selectedEntries]
    .map(p => allEntries.find(e => e.fullPath === p)?.name)
    .filter(Boolean)
    .join(', ')

  // Ask user to confirm before deleting
  const confirmed = confirm(
    `Delete ${count} item${count > 1 ? 's' : ''}?\n\n${names}\n\nThis cannot be undone.`
  )
  if (!confirmed) return

  const errors = []

  for (const fullPath of selectedEntries) {
    const result = await window.api.deleteEntry(fullPath)
    if (!result.success) {
      errors.push(result.error)
    }
  }

  // Clear selection and reload folder
  selectedEntries.clear()
  updateToolbar()

  if (errors.length > 0) {
    statusbar.textContent = `Done with ${errors.length} error(s): ${errors[0]}`
  } else {
    statusbar.textContent = `Deleted ${count} item${count > 1 ? 's' : ''} successfully`
  }

  // Refresh current folder to reflect changes
  await window.api.clearCache()
  loadDirectory(currentPath, false)
}

// ── Column sort on header click ────────────────
document.querySelectorAll('.sortable').forEach(th => {
  th.addEventListener('click', () => {
    const col = th.dataset.col

    if (sortCol === col) {
      // Same column → flip direction
      sortDir = sortDir === 'asc' ? 'desc' : 'asc'
    } else {
      // New column → reset to ascending
      sortCol = col
      sortDir = 'asc'
    }

    // Clear ALL header indicators first — only one can be active
    document.querySelectorAll('.sortable').forEach(h => {
      h.classList.remove('sort-asc', 'sort-desc')
    })

    // Set indicator on the clicked one only
    th.classList.add(sortDir === 'asc' ? 'sort-asc' : 'sort-desc')

    renderTable()
  })
})

// This function does the actual theme swap
function setTheme(themeName) {
  // Remove all theme classes from body first
  document.body.classList.remove('theme-dark', 'theme-blue', 'theme-light')

  // Add the new one
  document.body.classList.add('theme-' + themeName)

  // Update which button looks "active"
  btnDark.classList.remove('active')
  btnBlue.classList.remove('active')
  btnLight.classList.remove('active')

  // Mark the clicked button as active
  document.getElementById('theme-' + themeName).classList.add('active')

  // Remember the choice so it survives a refresh
  localStorage.setItem('theme', themeName)
}

// Wire up the buttons to the function
btnDark.onclick  = () => setTheme('dark')
btnBlue.onclick  = () => setTheme('blue')
btnLight.onclick = () => setTheme('light')

// When app loads, restore the last theme the user picked
const savedTheme = localStorage.getItem('theme') || 'dark'
setTheme(savedTheme)

// ── Directory Navigation ───────────────────────
// We track where we are so the "go into folder"
// click knows where to navigate next
let currentPath  = null
let history      = []   // stores previous paths like a browser
let allEntries = []   // raw entries from disk, never modified
let sortCol    = 'name'
let sortDir    = 'asc'
const btnBack    = document.getElementById('btn-back')

// Back button: pop the last path and go there
btnBack.onclick = () => {
  if (history.length === 0) return
  const previous = history.pop()
  loadDirectory(previous, false) // false = don't push to history
}

// Grab the elements we need
const pathInput  = document.getElementById('path-input')
const btnOpen    = document.getElementById('btn-open')
const fileTbody  = document.getElementById('file-tbody')
const statusbar  = document.getElementById('statusbar')

// ── Open button: show folder picker dialog ─────
btnOpen.onclick = async () => {
  const chosenPath = await window.api.browseFolder()

  // User hit Cancel — do nothing
  if (!chosenPath) return

  // Navigate into the chosen folder
  loadDirectory(chosenPath)
}

// ── Fetch folder sizes with concurrency limit ──
// Instead of firing 20 requests at once for C:\,
// we process max 3 at a time — manageable for any folder
async function fetchSizesWithLimit(folders, limit = 5) {
  let i         = 0
  let completed = 0
  const total   = folders.length

  async function processNext() {
    while (i < folders.length) {
      const entry  = folders[i++]
      const result = await window.api.getFolderSize(entry.fullPath)

      if (result.success) {
        // Store on the entry object for sorting later
        entry._cachedSize = result.size

        // Find and update just this one cell — no full re-render needed
        const cell = document.querySelector(
          `[data-size-for="${entry.fullPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`
        )
        if (cell) {
          cell.textContent    = formatSize(result.size)
          cell.style.opacity  = '1'
        }
      }

      completed++

      // Only re-render the full table once at the very end,
      // and only if the user is sorting by size — so order updates
      if (completed === total && sortCol === 'size') {
        renderTable()
      }
    }
  }

  const workers = Array(Math.min(limit, folders.length))
    .fill(null)
    .map(() => processNext())

  await Promise.all(workers)
}

// ── Core function: load and display a folder ───
async function loadDirectory(dirPath, pushHistory = true) {
  // If we're navigating forward, remember where we came from
  if (pushHistory && currentPath) {
    history.push(currentPath)
  }
  // Enable/disable back button depending on history
  btnBack.disabled = history.length === 0
  // Show the path in the input bar
  pathInput.value = dirPath
  currentPath = dirPath

  // Ask the backend to read the folder
  const result = await window.api.readDirectory(dirPath)

  if (!result.success) {
    statusbar.textContent = 'Error: ' + result.error
    return
  }

  // Store entries — renderTable() handles sorting and display
  allEntries = result.entries
  selectedEntries.clear()
  updateToolbar()
  renderTable()

  // Fetch all folder sizes in background
  // When ALL are done, re-render once so size sorting is correct
  // NEW — max 3 concurrent, won't crash on large drives
  const folders = allEntries.filter(e => e.isDirectory)
  if (folders.length > 0) {
    fetchSizesWithLimit(folders, 5)
  }
}

// ── Render table from current state ───────────
// Called on load, sort change. Never re-reads disk.
function renderTable() {
  let entries = [...allEntries]

  // Sort — folders always stay above files
  entries.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory)
      return a.isDirectory ? -1 : 1

    let valA, valB
    switch (sortCol) {
      case 'name':
        valA = a.name.toLowerCase()
        valB = b.name.toLowerCase()
        break
      case 'size':
        valA = a._cachedSize ?? a.size
        valB = b._cachedSize ?? b.size
        break
      case 'date':
        valA = a.modified || ''
        valB = b.modified || ''
        break
      default:
        valA = a.name.toLowerCase()
        valB = b.name.toLowerCase()
    }

    if (valA < valB) return sortDir === 'asc' ? -1 : 1
    if (valA > valB) return sortDir === 'asc' ?  1 : -1
    return 0
  })

  // Rebuild rows
  fileTbody.innerHTML = ''
  entries.forEach(entry => fileTbody.appendChild(buildRow(entry)))

  // Update status bar
  const dirs  = entries.filter(e => e.isDirectory).length
  const files = entries.filter(e => !e.isDirectory).length
  statusbar.textContent =
    `${dirs} folder${dirs !== 1 ? 's' : ''}, ` +
    `${files} file${files !== 1 ? 's' : ''}  —  ${currentPath}`
}

// ── Build a single table row ───────────────────
function buildRow(entry) {
  const tr = document.createElement('tr')

  // COLUMN 1: Permissions
  const tdPerm = document.createElement('td')
  tdPerm.className = 'perm-cell'
  tdPerm.textContent = formatPermissions(entry.mode, entry.isDirectory)

  // COLUMN 2: Size
  const tdSize = document.createElement('td')
  tdSize.className = 'size-cell'
  tdSize.dataset.sizeFor = entry.fullPath

  if (entry.isDirectory) {
    tdSize.textContent = entry._cachedSize !== undefined
      ? formatSize(entry._cachedSize)
      : '...'
    tdSize.style.opacity = entry._cachedSize !== undefined ? '1' : '0.4'
  } else {
    tdSize.textContent = formatSize(entry.size)
  }

  // COLUMN 3: Modified date
  const tdDate = document.createElement('td')
  tdDate.className = 'date-cell'
  tdDate.textContent = entry.modified ? formatDate(entry.modified) : '—'

  // COLUMN 4: Type
  const tdType = document.createElement('td')
  tdType.className = 'type-cell'
  tdType.textContent = entry.isDirectory ? 'Folder' : (getExtension(entry) || 'File')

  // COLUMN 5: Name with icon
  const tdName = document.createElement('td')
  tdName.className = 'name-cell' + (entry.isDirectory ? ' is-dir' : '')
  tdName.textContent = getIcon(entry) + ' ' + entry.name

  if (entry.isDirectory) {
    tr.style.cursor = 'pointer'
    tr.ondblclick = () => loadDirectory(entry.fullPath)
  } else {
    tr.style.cursor = 'pointer'
    tr.ondblclick = () => window.api.openFile(entry.fullPath)
  }

  tr.addEventListener('contextmenu', e => {
    e.preventDefault()
    showContextMenu(e.clientX, e.clientY, entry)
  })

  // ── Selection: click to select, Ctrl+click for multi ──
  tr.addEventListener('click', e => {
    if (e.ctrlKey) {
      // Ctrl+click: toggle this item in selection
      if (selectedEntries.has(entry.fullPath)) {
        selectedEntries.delete(entry.fullPath)
        tr.classList.remove('selected')
      } else {
        selectedEntries.add(entry.fullPath)
        tr.classList.add('selected')
      }
    } else {
      // Regular click: clear all, select only this one
      document.querySelectorAll('.file-table tr.selected')
        .forEach(r => r.classList.remove('selected'))
      selectedEntries.clear()
      selectedEntries.add(entry.fullPath)
      tr.classList.add('selected')
    }
    updateToolbar()
  })

  tr.append(tdPerm, tdSize, tdDate, tdType, tdName)
  return tr
}


// ── Helper: convert mode number to rwx string ──
// The mode is a number like 33206. We convert it
// to the familiar "drwxr-xr-x" style.
function formatPermissions(mode, isDir) {
  const d = isDir ? 'd' : '-'
  const r = (mode & 0o400) ? 'r' : '-'
  const w = (mode & 0o200) ? 'w' : '-'
  const x = (mode & 0o100) ? 'x' : '-'
  const r2 = (mode & 0o040) ? 'r' : '-'
  const w2 = (mode & 0o020) ? 'w' : '-'
  const x2 = (mode & 0o010) ? 'x' : '-'
  const r3 = (mode & 0o004) ? 'r' : '-'
  const w3 = (mode & 0o002) ? 'w' : '-'
  const x3 = (mode & 0o001) ? 'x' : '-'
  return `${d}${r}${w}${x}${r2}${w2}${x2}${r3}${w3}${x3}`
}


// ── Helper: convert bytes to readable size ──────
function formatSize(bytes) {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i]
}


// ── Helper: format ISO date to readable string ──
function formatDate(iso) {
  const d = new Date(iso)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}` +
         `  ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ── Helper: get file extension ─────────────────
function getExtension(entry) {
  if (entry.isDirectory) return 'Folder'
  const parts = entry.name.split('.')
  return parts.length > 1 ? '.' + parts.pop().toUpperCase() : 'File'
}

// ── Helper: pick an emoji icon by file type ────
function getIcon(entry) {
  if (entry.isDirectory) return '📁'
  const ext = getExtension(entry).toLowerCase()
  const icons = {
    '.jpg': '🖼', '.jpeg': '🖼', '.png': '🖼', '.gif': '🖼',
    '.svg': '🖼', '.webp': '🖼',
    '.mp4': '🎬', '.mkv': '🎬', '.avi': '🎬', '.mov': '🎬',
    '.mp3': '🎵', '.wav': '🎵', '.flac': '🎵', '.ogg': '🎵',
    '.zip': '📦', '.rar': '📦', '.7z': '📦', '.tar': '📦',
    '.pdf': '📕', '.doc': '📘', '.docx': '📘',
    '.xls': '📗', '.xlsx': '📗', '.csv': '📗',
    '.exe': '⚙️', '.msi': '⚙️', '.bat': '⚙️',
    '.js':  '📜', '.ts':  '📜', '.py': '📜', '.cpp': '📜',
    '.html':'📜', '.css': '📜', '.json':'📜',
    '.txt': '📝', '.log': '📝', '.md':  '📝',
  }
  return icons[ext] || '📄'
}