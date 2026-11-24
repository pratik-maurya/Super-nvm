@echo off
title Install Super NVM VS Code Extension
echo ======================================================
echo    Installing Super NVM Extension into VS Code...
echo ======================================================
code --install-extension "%~dp0super-nvm-1.0.0.vsix"
if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Super NVM extension installed! Open or restart VS Code to use it.
) else (
    echo.
    echo [ERROR] Failed to install extension. Please ensure VS Code is installed and in your PATH.
)
echo.
pause
