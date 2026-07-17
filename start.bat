@echo off
cd /d "%~dp0"

set PORT=3000

rem Kill any old process on this port
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTENING" 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo.
echo ============================================
echo   TDE Development Docs
echo   http://localhost:%PORT%
echo   Press Ctrl+C or close this window to stop
echo ============================================
echo.

start http://localhost:%PORT%
npx serve . -p %PORT% --no-clipboard
pause
