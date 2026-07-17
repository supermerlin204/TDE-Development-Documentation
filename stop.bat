@echo off

set PORT=3000

echo ============================================
echo   TDE Development Docs - Stopping server...
echo ============================================

set FOUND=0
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTENING" 2^>nul') do (
    echo Closing PID: %%a
    taskkill /PID %%a /F >nul 2>&1
    set FOUND=1
)

if %FOUND% EQU 1 (
    echo Server stopped.
) else (
    echo No server found on port %PORT%.
)

echo.
pause
