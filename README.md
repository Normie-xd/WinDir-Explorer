# 📂 WinDir Explorer

WinDir Explorer is a fast, lightweight desktop application built with Electron designed to help you scan, visualize, and manage your local directories and storage space on Windows.

Inspired by the Unix `ls -la` command — detailed file information at a glance, with a clean modern UI.

![Platform](https://img.shields.io/badge/platform-Windows-blue)
![Electron](https://img.shields.io/badge/Electron-v28.3.3-47848F)
![License](https://img.shields.io/badge/license-ISC-green)

---

## 🚀 Download & Installation

You don't need to build this from the source code to run it! You can download the standalone Windows installer directly:

1. Head over to the [Releases](https://github.com/Normie-xd/WinDir-Explorer/releases) section on the right side of this page.
2. Download the latest `WinDir Explorer Setup 1.0.0.exe`.
3. Run the installer on your PC, and the application will launch immediately.

> **Note:** Windows may show a SmartScreen warning on first launch.
> Click **"More info" → "Run anyway"** to proceed.
> This is normal for apps without a paid code-signing certificate.

---

## ✨ Features

- **Deep Directory Scanning** — Recursively calculates the total size of every folder in the background without freezing the UI
- **`ls -la` Style View** — Permissions, size, modified date, type and name in one clean detailed table
- **Session Cache** — Folder sizes are remembered while the app is open; revisiting folders is instant
- **Sort Columns** — Sort by name, size or date modified (click again to reverse)
- **Back Button** — Full navigation history, just like a browser
- **Path Bar Navigation** — Type any path directly and press Enter to jump anywhere on your system
- **Live Filter** — Instantly narrow down files as you type
- **Hidden Files Toggle** — Show or hide dotfiles and hidden items on demand
- **Right-Click Menu** — Open, Copy Full Path, Copy Name
- **Multi-Select** — Click to select, Ctrl+Click for multiple items
- **Open & Delete** — Open selected files with their default app, or delete with confirmation dialog
- **3 Themes** — Dark, Terminal (green-on-black), Light — your choice is remembered between sessions

---

## 🛠️ Development Setup

If you want to run the code locally or make modifications to the project, follow these setup steps:

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) v18 or higher installed on your machine.

### Installation

Clone or download this repository to your local machine, then install dependencies:

```bash
npm install
```

### Running Locally

To launch the application in development mode:

```bash
npm start
```

### Building the Installer

To compile the application into a standalone `.exe` installer:

```bash
npm run build
```

Output will be in the `dist/` folder.

---

## 🗂️ Project Structure

```
WinDir-Explorer/
├── main.js        — Electron main process (file system, IPC, window)
├── preload.js     — Secure bridge between backend and frontend
├── index.html     — App UI shell and layout
├── renderer.js    — All UI logic (table, sort, filter, selection)
├── style.css      — Styling and 3 themes
├── assets/
│   └── icon.ico   — App icon
└── package.json   — Build config and dependencies
```

---

## ⚙️ How It Works

WinDir Explorer is built with **Electron** — the same framework that powers VS Code and many other desktop apps.

- `main.js` runs as the backend. It talks to Windows directly — reads directories, calculates folder sizes recursively, handles file deletion.
- `renderer.js` runs in the window. It handles everything you see and interact with.
- They communicate via **IPC (Inter-Process Communication)** through `preload.js`, which acts as a secure gatekeeper between the two.

Folder sizes are calculated **asynchronously with a concurrency limit** — the UI never freezes, and sizes fill in progressively as they are computed.

---

## 📦 Tech Stack

| Tool | Version | Purpose |
|------|---------|---------|
| [Electron](https://electronjs.org) | v28.3.3 | Desktop app framework |
| [electron-builder](https://electron.build) | v26.8.1 | Packaging and NSIS installer |
| Node.js `fs` module | — | File system access |
| Vanilla JS + CSS | — | UI — no frameworks needed |

**Package Target:** NSIS Installer (x64 Windows)

---

## 📄 License

ISC — free to use, modify and distribute.
