@echo off
cd /d "%~dp0"
echo Push Daemon Watchdog - Auto-restart on crash
echo.
:loop
:: Kill any leftover daemon before starting (prevent port-lock deadloop)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":19999" ^| findstr "LISTENING"') do (
  echo Killing leftover daemon PID %%a
  taskkill /F /PID %%a >nul 2>&1
)
"C:/Program Files/nodejs/node.exe" _daemon.js
echo [%date% %time%] Daemon stopped, restarting in 3 seconds...
timeout /t 3 /nobreak >nul
goto loop
