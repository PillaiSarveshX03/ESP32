@echo off
title Smart HVAC System Launcher
setlocal enabledelayedexpansion

echo ===================================================
echo     Smart Automated HVAC / Damper System
echo ===================================================
echo.

:: Ensure we are in the root directory where this script lives
cd /d "%~dp0"

:: 1. Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not found in PATH.
    echo Please install Node.js from https://nodejs.org/ and try again.
    pause
    exit /b 1
)

:: 2. Check and install Server dependencies if needed
if not exist "server\node_modules" (
    echo [*] Installing server dependencies...
    cd server
    call npm install
    cd ..
)

:: 3. Check and install Client dependencies if needed
if not exist "client\node_modules" (
    echo [*] Installing client dependencies...
    cd client
    call npm install
    cd ..
)

echo [*] Starting Backend Hub on port 5000...
start "Smart HVAC - Backend (Port 5000)" cmd /k "cd /d "%~dp0server" && npm start"

echo [*] Starting Frontend Dashboard on port 3000...
start "Smart HVAC - Frontend (Port 3000)" cmd /k "cd /d "%~dp0client" && npm run dev"

echo.
echo [*] Waiting for services to initialize...
timeout /t 3 /nobreak >nul

echo [*] Opening Web Dashboard in default browser...
start http://localhost:3000

echo.
echo ===================================================
echo  System started successfully!
echo  - Backend:  http://localhost:5000
echo  - Frontend: http://localhost:3000
echo  - WS ESP32: ws://localhost:5000/ws/esp32
echo ===================================================
echo.
echo You can keep this window open or close it. The service windows will continue running.
pause
