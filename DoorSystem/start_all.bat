@echo off
title Smart AI Door Security System - Launcher
color 0A

echo ====================================================================
echo   STARTING SMART AI DOOR SECURITY SYSTEM
echo ====================================================================
echo.

:: Get script directory
set "ROOT_DIR=%~dp0"

echo [1/3] Launching Node.js Backend Server (Port 5000)...
start "Smart Door Backend (Port 5000)" cmd /k "cd /d "%ROOT_DIR%backend" && echo Starting Backend Server... && node server.js"

:: Give the backend 2 seconds to initialize
timeout /t 2 /nobreak >nul

echo [2/3] Launching React Vite Security Dashboard (Port 5173)...
start "Smart Door Frontend Console (Port 5173)" cmd /k "cd /d "%ROOT_DIR%frontend" && echo Starting React Vite Dev Server... && npm run dev"

:: Give Vite 3 seconds to spin up
timeout /t 3 /nobreak >nul

echo [3/3] Opening Web Dashboard in Default Browser...
start http://localhost:5173

echo.
echo ====================================================================
echo   SYSTEM IS LIVE!
echo   - Backend Server:    http://localhost:5000
echo   - Web Console:       http://localhost:5173
echo ====================================================================
echo.
echo (You can close this launcher window at any time; the servers will keep running in their own windows.)
pause
