@echo off
title Smart AI Door - React Security Dashboard
color 0E
echo ====================================================================
echo   STARTING SMART AI DOOR FRONTEND DASHBOARD (Port 5173)
echo ====================================================================
echo.
cd /d "%~dp0frontend"
npm run dev
pause
