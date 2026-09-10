@echo off
title Smart AI Door Security System - Stop All Servers
color 0C

echo ====================================================================
echo   STOPPING SMART AI DOOR SECURITY SYSTEM
echo ====================================================================
echo.

echo [1/2] Terminating processes on Port 5000 (Backend)...
powershell -Command "Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }; Write-Host '  -> Port 5000 cleared.'"

echo.
echo [2/2] Terminating processes on Port 5173 (Frontend Vite)...
powershell -Command "Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }; Write-Host '  -> Port 5173 cleared.'"

echo.
echo ====================================================================
echo   ALL PORTS CLEARED & SERVERS STOPPED SUCCESSFULLY!
echo ====================================================================
echo.
pause
