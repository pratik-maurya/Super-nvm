# ⚡ Super NVM — The Modern Visual Node.js Manager for Windows

<div align="center">

<img src="resources/nvm-icon.png" width="110" height="110" alt="Super NVM Logo" />
<br><br>

![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-0078D6?style=for-the-badge&logo=windows&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-All%20Versions-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![VS Code](https://img.shields.io/badge/VS%20Code-Compatible-007ACC?style=for-the-badge&logo=visualstudiocode&logoColor=white)
![Cursor](https://img.shields.io/badge/Cursor-Compatible-000000?style=for-the-badge&logoColor=white)
![Antigravity](https://img.shields.io/badge/Google%20Antigravity-Compatible-4285F4?style=for-the-badge&logo=google&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-success?style=for-the-badge)

<p align="center">
  <strong>Switch, install, migrate, and inspect Node.js versions with 1 click across VS Code, Cursor, Google Antigravity IDE, WebStorm, and your Windows Taskbar.</strong>
</p>

[📥 Download Latest Release](../../releases) • [📦 Zero-Prerequisites Architecture](#-zero-prerequisites-architecture) • [🔧 How It Works Without NVM](#-how-it-works-without-nvm-installed) • [🎯 Multi-Editor Setup](#-supported-editors--environments) • [💡 Pain Points Solved](#-the-pain-points-super-nvm-solves) • [🏷️ Attribution & Licensing](#-attribution-origin--ownership-transparency)

</div>

---

## 💡 The Pain Points Super NVM Solves

Windows developers managing multiple Node.js environments frequently face frustrating bottlenecks with command-line tools:

| ❌ The Traditional CLI Pain Point | ⚡ The Super NVM Graphical Solution |
| :--- | :--- |
| 🔴 **Manual Command Memorization**<br>Constant terminal switching to run `nvm list`, `nvm use <ver>`, and `nvm install <ver>`. | 🟢 **1-Click Version Switcher**<br>Click any installed version card in the visual dashboard or status bar menu to activate it instantly. |
| 🔴 **Abandoned Global Packages**<br>Installing a new Node version loses all global CLIs (`pnpm`, `yarn`, `turbo`, `nest`, `typescript`). | 🟢 **Global Package Migrator**<br>Inspect packages installed in any previous Node version and migrate them to your active version in 1 click. |
| 🔴 **Zero Editor Visibility**<br>Editors provide no visual indication of which Node version is currently active system-wide. | 🟢 **Live Status Bar & Activity Bar**<br>Displays `⚡ Node v24.22.1` directly in your editor status bar with a 0.1s quick-pick menu. |
| 🔴 **Silent Disk Bloat**<br>Unused Node versions and stale release downloads silently consume gigabytes in `%LOCALAPPDATA%`. | 🟢 **Visual Storage & Cache Cleaner**<br>View real-time disk consumption per Node version and purge download caches with a single click. |
| 🔴 **Workspace Version Mismatches**<br>Running projects with incompatible Node versions causes unexpected build or runtime failures. | 🟢 **Smart Workspace Detection**<br>Detects `.nvmrc`, `.node-version`, or `package.json` engines on project open and prompts or auto-switches. |
| 🔴 **Locked into Single Editor Ecosystems**<br>Most extensions only work in VS Code, abandoning JetBrains, Sublime, or Neovim users. | 🟢 **Universal Multi-Editor & Desktop Tray**<br>Native extension for **VS Code**, **Cursor**, **Antigravity IDE**, plus a **Windows Taskbar Tray** for all other IDEs. |

---

## 📦 Zero-Prerequisites Architecture

Super NVM is a **completely standalone, self-sufficient Node.js Version Manager for Windows**:

* ⚡ **100% Zero-Dependency**: Super NVM operates autonomously out of the box. You **do not need to install NVM for Windows**, Python, Git, or any external CLIs.
* 🚀 **Built-in Native Engine**: Directly downloads official Node.js releases from [nodejs.org](https://nodejs.org), extracts them on the fly, and manages directory junctions without requiring administrator privileges.
* 🔄 **Existing NVM Compatible**: If you already have NVM for Windows installed on your PC, Super NVM automatically detects and manages your existing versions alongside native ones.

---

### 🔧 How It Works Without NVM Installed

A common question is: *"How does Super NVM download, switch, and execute Node.js versions if NVM for Windows is not installed on my PC?"*

Super NVM does not depend on the third-party `nvm.exe` binary. Instead, it embeds its own **Native Management Engine** that interacts directly with the Windows filesystem and official Node.js distribution servers:

```
[ nodejs.org Releases API ]
            │ (1. Direct HTTPS Download)
            ▼
[ %LOCALAPPDATA%\SuperNVM\versions\v22.12.0 ]
            │
            │ (2. Admin-Free Directory Junction)
            ▼
[ %LOCALAPPDATA%\SuperNVM\current ] ◄──── Added to User PATH (3. Instant CLI availability)
            │
            ├─► node.exe (Active Version)
            └─► npm.cmd / npx.cmd
```

#### 1. Direct Official Downloads & Extraction
When you click **Install** in the Super NVM Dashboard:
- Super NVM queries `https://nodejs.org/dist/index.json` directly over HTTPS to retrieve verified releases.
- It streams the official Windows 64-bit binary archive (`node-v<version>-win-x64.zip`) with live progress reporting.
- It unpacks the distribution directly into:
  ```text
  %LOCALAPPDATA%\SuperNVM\versions\v<version>\
  ```
  *(Extracted using built-in Windows `tar` or PowerShell `Expand-Archive`, requiring zero extra tools).*

#### 2. Admin-Free Version Switching (NTFS Directory Junctions)
Traditional NVM for Windows creates symlinks inside `C:\Program Files\nodejs`, which triggers Windows UAC security prompts and requires Administrator privileges. Super NVM solves this cleanly:
- It maintains an NTFS Directory Junction at:
  ```text
  %LOCALAPPDATA%\SuperNVM\current
  ```
- Because this link resides inside your user profile directory (`%LOCALAPPDATA%`), Windows allows creating and redirecting junctions **without administrator rights**.
- Switching Node versions takes only **~0.1 seconds**: Super NVM simply repoints the junction to `%LOCALAPPDATA%\SuperNVM\versions\v<target-version>`.

#### 3. Automatic User PATH Configuration
- On first version activation, Super NVM registers `%LOCALAPPDATA%\SuperNVM\current` into your **User PATH** environment variable via Windows PowerShell (`[Environment]::SetEnvironmentVariable`).
- Any terminal session—whether PowerShell, Windows Command Prompt, Git Bash, or internal IDE terminals—instantly recognizes `node -v`, `npm -v`, and `npx` without rebooting your computer.

#### 4. Editor Extension Self-Hosting
- In **Google Antigravity IDE**, **Microsoft VS Code**, and **Cursor**, extensions execute inside the editor's embedded runtime (Extension Host).
- This means you can install Super NVM on a fresh Windows PC that has **no Node.js and no NVM installed whatsoever**, open your IDE, and use Super NVM to download and set up your initial Node version in one click!

| Capability | Traditional NVM for Windows | ⚡ Super NVM Native Engine |
| :--- | :--- | :--- |
| **Prerequisites** | Requires installing NVM for Windows installer | **None** — 100% self-contained |
| **Administrator Rights** | Required for switching versions in `Program Files` | **Not required** — user-level NTFS junctions |
| **Release Downloads** | Limited CLI terminal feedback | Direct HTTPS streaming with visual progress bar |
| **Editor Status Bar** | None | Live version display + 1-click switch menu |
| **Global Package Migration** | Manual `npm install -g ...` for each package | 1-click visual selection & automated migration |

---

## 🎯 Supported Editors & Environments

Super NVM offers unified Node management across your entire development stack:

### 1. 🚀 Google Antigravity IDE
- Install the `.vsix` extension package via:
  ```powershell
  & "$env:LOCALAPPDATA\Programs\Antigravity IDE\bin\antigravity-ide.cmd" --install-extension super-nvm-1.0.0.vsix
  ```
- Or run the included `install-all-editors.bat` script to automatically detect Antigravity IDE and install with one click!

### 2. 💻 Microsoft Visual Studio Code & Cursor IDE
- Install via command line:
  ```powershell
  code --install-extension super-nvm-1.0.0.vsix
  cursor --install-extension super-nvm-1.0.0.vsix
  ```
- Or install via UI: Extensions (`Ctrl + Shift + X`) ➔ `...` menu ➔ **Install from VSIX...** ➔ Select `super-nvm-1.0.0.vsix`.

### 3. 🌊 Windsurf & VSCodium
- Fully compatible with any VS Code-compatible editor. Run `install-all-editors.bat` to detect and install automatically.

### 4. ☕ JetBrains (WebStorm, IntelliJ IDEA, PyCharm), Sublime Text, & Neovim
- Double-click **`launch-tray.bat`** to enable the **Windows Taskbar Tray Companion**.
- A discrete Node crest icon will appear in your system notification tray near the Windows clock.
- **Right-click** the tray icon to switch active Node versions in 0.5 seconds!
- Because Super NVM updates Windows system symlinks globally, your WebStorm terminal, PowerShell, and Neovim immediately inherit the active Node version.

---

## 📥 How Users Install From GitHub

When you publish this project on GitHub, your users can get started in 3 simple steps:

### Method 1: The All-in-One Multi-Editor Installer (Easiest)
1. Download **`super-nvm-1.0.0.vsix`** and **`install-all-editors.bat`** from the [GitHub Releases](../../releases).
2. Double-click **`install-all-editors.bat`**.
3. The script automatically detects **Antigravity IDE**, **VS Code**, **Cursor**, **Windsurf**, and **VSCodium** on the machine and installs Super NVM into all of them at once!

### Method 2: Standalone Desktop Web Dashboard + System Tray
1. Download **`super-nvm-portable.zip`** from [GitHub Releases](../../releases).
2. Extract to any folder.
3. Double-click **`launch-ui.bat`** to open the web dashboard (`http://localhost:4321`).
4. Double-click **`launch-tray.bat`** for right-click taskbar switching.

### Method 3: Run from Source
```bash
git clone https://github.com/<your-username>/super-nvm.git
cd super-nvm
npm install
npm run compile
npm start
```

---

## 🚀 Key Features Walkthrough

### ⚡ 1-Click Version Switcher
- View all installed Node versions in clean, modern dark cards.
- Instantly switch the active Node version without typing commands.
- Accurate single-active-version tracking backed directly by NVM's system state.

### 📦 Remote Releases Explorer
- Live table of 800+ official Node.js releases fetched securely from nodejs.org.
- Filter by **LTS** (Jod, Iron, Hydrogen), **All**, or **Security** patches.
- Click `Install` on any release row to trigger a clean native background install.

### 🔄 Global Package Migrator
- Clicking **Packages** on any Node version lists its globally installed CLIs.
- Check off the packages you need (`yarn`, `pnpm`, `turbo`, `typescript`) and click **Migrate Selected Packages** to install them into your active Node version automatically.

### 🧹 Storage & Disk Cache Cleaner
- Real-time disk calculation showing the exact space occupied by each installed Node version.
- 1-click **Clean NVM Cache** button to reclaim gigabytes of temp downloads.

### 🔔 Smart Project Auto-Switch
- Automatically inspects workspaces for `.nvmrc`, `.node-version`, or `package.json` engines.
- Provides a subtle notification or silent auto-switch when opening project folders.

---

## ⌨️ Keyboard Shortcuts

Speed up your workflow across VS Code, Cursor, and Google Antigravity IDE:

| Shortcut | Action | Scope |
| :--- | :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd>, <kbd>N</kbd> | **Open Super NVM Dashboard** | Global in Editor |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd>, <kbd>V</kbd> | **Quick Switch Node Version** | Global in Editor |
| <kbd>/</kbd> | **Focus Search Filter** | Inside Dashboard |
| <kbd>Esc</kbd> | **Close Active Dialog / Modal** | Inside Dashboard |

*(On macOS, replace <kbd>Ctrl</kbd> with <kbd>Cmd</kbd>)*

---

## 🏷️ Attribution, Origin & Ownership Transparency

To ensure complete clarity and compliance with all open-source licensing:

* **Node.js Releases & Metadata**:
  Release metadata, download links, and Node.js binaries originate from the official [Node.js project](https://nodejs.org) maintained by the OpenJS Foundation under the MIT/Node License.
* **NVM Compatibility**:
  Super NVM includes its own standalone native engine and also supports optional interoperability with [NVM for Windows](https://github.com/nvm-windows/nvm) by Corey Butler / Author Software (MIT License) if installed on your system.
* **Super NVM Client Architecture**:
  The user interface, status bar integration, webview dashboard, cross-editor installer scripts, taskbar tray companion, native junction switcher, and package migration logic are original open-source components developed for Super NVM and distributed freely under the [MIT License](LICENSE).
* **Independence Statement**:
  Super NVM is an independent open-source project. It does not claim trademark ownership of NVM for Windows or Node.js.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
Feel free to use, modify, distribute, and contribute!
