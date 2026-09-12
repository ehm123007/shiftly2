@echo off
title Shiftly Workforce Platform Launcher
cd /d "%~dp0"
cls
echo =====================================================================
echo                 SHIFTLY WORKFORCE PLATFORM
echo =====================================================================
echo.
echo Stopping any previous stuck server on port 3000...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr /r ":3000.*LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr /r ":3001.*LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)
echo.

:: 1. Try Node.js server (CommonJS .cjs works across ALL Node versions)
node -v >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] Launching via Node.js server...
    node server-local.cjs
    goto done
)

:: 2. Try Python 3 server (Test actual python execution)
python -c "import sys" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] Launching via Python server...
    python server-local.py
    goto done
)

python3 -c "import sys" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] Launching via Python 3 server...
    python3 server-local.py
    goto done
)

:: 3. Try Windows built-in PowerShell server (Zero installations needed!)
powershell -Command "exit 0" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] Launching via Windows built-in PowerShell server...
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server-local.ps1"
    goto done
)

:: 4. Fallback: npx serve
npx -v >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] Launching via npx serve on http://localhost:3000 ...
    start http://localhost:3000
    npx --yes serve dist -l 3000
    goto done
)

echo.
echo [!] Unable to start automatically.
echo Please install Node.js from https://nodejs.org or Python from https://python.org
echo.
pause

:done
