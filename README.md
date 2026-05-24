# 📂 WinDir Explorer

WinDir Explorer is a fast, lightweight desktop application built with Electron designed to help you scan, visualize, and manage your local directories and storage space on Windows. 

---

## 🚀 Download & Installation

You don't need to build this from the source code to run it! You can download the standalone Windows installer directly:

1. Head over to the [Releases](https://github.com/Normie-xd/WinDir-Explorer/releases) section on the right side of this page.
2. Download the latest `WinDir Explorer Setup 1.0.0.exe`.
3. Run the installer on your PC, and the application will launch immediately.

---

## ✨ Features

* **Deep Directory Scanning:** Quickly analyze folders and subfolders to see what is taking up space.
* **Clean Desktop UI:** Modern user interface powered by web technologies via Electron.
* **Native Integration:** Specifically packaged as an optimized executable for Windows environments.

---

## 🛠️ Development Setup

If you want to run the code locally or make modifications to the project, follow these setup steps:

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation
1. Clone or download this repository to your local machine.
2. Open your terminal inside the project directory and install the necessary dependencies:
```bash
   npm install
```
### Running Locally

To launch the application in development mode:
```Bash
  npm start
```
### Building the Installer

To compile the application code into a standalone production .exe installer:
```Bash
  npm run build
```

### 📦 Tech Stack
```
Runtime: Electron (v28.3.3)
Build Tooling: electron-builder (v26.8.1)
Package Target: NSIS Installer (x64 Windows)
```
