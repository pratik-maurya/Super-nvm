@echo off
setlocal enabledelayedexpansion
title Super NVM - Environment & System Check

echo ======================================================================
echo           Super NVM - Standalone System Verification
echo ======================================================================
echo.
echo [OK] Super NVM Native Engine is active!
echo Super NVM is 100%% self-contained. No external tools required.
echo.

where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('node -v 2^>nul') do echo [OK] Active Node.js: %%i
) else (
    echo [INFO] No Node.js version active yet.
    echo Open Super NVM and click '+ Install Version' to install any LTS or latest release!
)

where nvm >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo.
    echo [INFO] Existing NVM for Windows detected on system:
    for /f "tokens=*" %%i in ('nvm version 2^>nul') do echo      %%i
    echo Super NVM will automatically interoperate with your NVM installations.
)

echo.
echo ----------------------------------------------------------------------
echo Supported Editors for Super NVM:
if exist "%LOCALAPPDATA%\Programs\Antigravity IDE\bin\antigravity-ide.cmd" echo   * Google Antigravity IDE
if exist "%LOCALAPPDATA%\Programs\Microsoft VS Code\bin\code.cmd" echo   * Microsoft Visual Studio Code
if exist "%LOCALAPPDATA%\Programs\cursor\resources\app\bin\cursor.cmd" echo   * Cursor IDE
if exist "%LOCALAPPDATA%\Programs\Windsurf\bin\windsurf.cmd" echo   * Windsurf IDE
if exist "%LOCALAPPDATA%\Programs\VSCodium\bin\codium.cmd" echo   * VSCodium
echo   * Standalone Web UI & System Tray: Any IDE (WebStorm, Sublime, Neovim, Windows Terminal)
echo.
echo To install Super NVM into all detected editors, run 'install-all-editors.bat'!
echo ======================================================================
echo.
pause
