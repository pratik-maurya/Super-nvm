@echo off
title Super NVM Launcher
echo ======================================================
echo    Starting Super NVM - Node Version Manager GUI
echo ======================================================
node "%~dp0bin\super-nvm.js"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Failed to start Super NVM. Please check if Node.js is installed.
    pause
)
