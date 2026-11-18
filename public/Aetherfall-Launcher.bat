@echo off
title Aetherfall 0.9 Launcher - L3X STUD105
echo ====================================================
echo        AETHERFALL 0.9 - A Tale of Broken Skies
echo                 L3X STUD105
echo ====================================================
echo Starting Aetherfall 0.9...

:: Check if index.html exists
if not exist "%~dp0index.html" (
    echo Error: index.html not found!
    pause
    exit /b 1
)

:: Try Microsoft Edge app mode (clean borderless window)
start "" msedge --app="%~dp0index.html" 2>nul
if %errorlevel% equ 0 exit /b 0

:: Try Google Chrome app mode
start "" chrome --app="%~dp0index.html" 2>nul
if %errorlevel% equ 0 exit /b 0

:: Fallback to default browser
start "" "%~dp0index.html"
exit /b 0
