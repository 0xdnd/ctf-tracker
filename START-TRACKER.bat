@echo off
title ZEROBOX // Tactical CTF Tracker Launcher
color 0A
cd /d "%~dp0"

echo ================================================================
echo    ZEROBOX // TACTICAL CYBERSECURITY LAB DASHBOARD
echo ================================================================
echo.
echo [*] Checking environment...
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] ERROR: Node.js and NPM were not found in your PATH.
    echo [*] Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [+] Node.js detected.
echo [*] Launching ZeroBox on http://localhost:3000 ...
echo.

:: Automatically open browser after 2 seconds
start "" powershell -NoProfile -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:3000/'"

:: Start Vite dev server
call npm run dev

pause
