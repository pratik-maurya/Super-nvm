@echo off
title Super NVM Tray Launcher
echo Starting Super NVM Taskbar Tray Companion...
start /b powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File "%~dp0tray\super-nvm-tray.ps1"
echo [OK] Super NVM is now running in your Windows taskbar tray (near the clock).
echo Right-click the Super NVM icon in the taskbar to switch Node versions instantly!
timeout /t 3 >nul
exit
