#!/usr/bin/env bash
# Shiftly Workforce Platform Launcher for macOS / Linux

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "====================================================================="
echo "                SHIFTLY WORKFORCE PLATFORM"
echo "====================================================================="
echo ""
echo "Starting local web server on your PC..."
echo ""

# 1. Try Node.js server
if command -v node >/dev/null 2>&1; then
    echo "[OK] Launching via Node.js server..."
    node server-local.cjs || node server-local.js
    exit 0
fi

# 2. Try Python 3 server
if command -v python3 >/dev/null 2>&1; then
    echo "[OK] Launching via Python 3 server..."
    python3 server-local.py
    exit 0
fi

# 3. Try Python server
if command -v python >/dev/null 2>&1; then
    echo "[OK] Launching via Python server..."
    python server-local.py
    exit 0
fi

# 4. Try npx
if command -v npx >/dev/null 2>&1; then
    echo "[OK] Launching via npx serve on http://localhost:3000..."
    npx --yes serve dist -l 3000
    exit 0
fi

echo ""
echo "[ERROR] No Node.js or Python runtime detected."
echo "Please install Node.js from https://nodejs.org or Python 3."
echo ""
