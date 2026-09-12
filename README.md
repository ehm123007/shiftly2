# Shiftly - Intelligent Workforce Roster & Shift Management System

A production-ready workforce scheduling, shift coordination, and roster management application built with React, TypeScript, and Tailwind CSS.

## Features

- **Personal Shift Dashboard**: View upcoming shifts, timing cards, day-off status, and paid Extra Hours (EH).
- **Shift Swap & Market Exchange**: Propose shift swaps, offer coverage, browse peer market listings with automated validation rules.
- **Fairness & Compliance Engine**: Regulatory checks (e.g. night-shift policies, maximum work limits, and minimum rest intervals).
- **Multi-Format Roster Ingestion**: Upload roster files directly in Excel (`.xlsx`, `.xls`), PDF (`.pdf`), and Spreadsheets (`.csv`, `.tsv`, `.ods`).
- **Comprehensive Audit Trail**: Timestamped logs tracking every shift swap, overtime adjustment, and schedule modification.
- **Live Team Lounge & Direct Messaging**: Coordinate shift coverage with colleagues with attached shift cards and real-time status.
- **Master Admin Portal**: Full scheduling matrix, staff directory, manual shift editor, and CSV/Excel exports.

## 🚀 Quick Start (Running on your PC)

The easiest ways to run Shiftly on your PC:

### ⚡ Option 1: 1-Click Launcher (No Configuration Needed)
- **Windows PC**: Double-click **`start.bat`** (or **`run-windows.bat`**)
  - *Works on any Windows 10 or 11 PC! If you don't have Node or Python installed, it automatically uses Windows built-in PowerShell to run the server on `http://localhost:3000` with ZERO installations required.*
- **Mac / Linux**: Run `./start.sh` (or `./run-mac.sh`)

### ⚡ Option 2: Run via Node.js or Python directly
- **Node.js**:
  ```bash
  node server-local.js
  ```
  *(Or `node server-local.cjs`)*
- **Python**:
  ```bash
  python server-local.py
  ```
  *(Or `python3 server-local.py`)*

### 🛠️ Option 3: Standard NPM Development Server
```bash
npm install
npm run dev
```
Then open `http://localhost:3000` in your browser.

---

### 🌐 Method 3: Serve the Pre-built Production Files (`dist/`)
The pre-compiled production build is already included in the `dist/` folder! You can serve it using any of the following:

- **npx serve**:
  ```bash
  npx serve dist
  ```
- **Python**:
  ```bash
  python3 -m http.server 3000 --directory dist
  ```
- **VS Code Live Server**:
  Right-click `dist/index.html` and choose **"Open with Live Server"**.

## Tech Stack
- **Framework**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Animations**: Motion (Framer Motion)
- **Data & Parsing**: SheetJS (`xlsx`)
