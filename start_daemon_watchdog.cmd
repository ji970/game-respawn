@echo off
cd /d "%~dp0"
echo Push Daemon Watchdog - Auto-restart on crash
echo.
:loop
"C:/Program Files/nodejs/node.exe" _daemon.js
echo [%date% %time%] Daemon stopped, restarting in 3 seconds...
timeout /t 3 /nobreak >nul
goto loop
