@echo off
title Smart AI Door - Backend Server
color 0B
echo ====================================================================
echo   STARTING SMART AI DOOR BACKEND SERVER (Port 5000)
echo ====================================================================
echo.
cd /d "%~dp0backend"
node server.js
pause
