@echo off
title Stop Smart HVAC System
cd /d "%~dp0"

echo ===================================================
echo     Stopping Smart HVAC System Services...
echo ===================================================
echo.

:: Free port 5000 (Backend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000" ^| findstr "LISTENING"') do (
    echo [*] Terminating Backend process PID %%a on port 5000...
    taskkill /F /PID %%a >nul 2>&1
)

:: Free port 3000 (Frontend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo [*] Terminating Frontend process PID %%a on port 3000...
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo ===================================================
echo  Services stopped.
echo ===================================================
pause
