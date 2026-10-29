@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Classroom Live - Server Control
echo Keep this console open while the server app is running.
echo.
if not exist "%~dp0scripts\control.ps1" -DebugConsole (
 echo ERROR: scripts\control.ps1 is missing.
 echo Extract ALL files and copy them into the existing server folder.
 pause
 exit /b 1
)
powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File "%~dp0scripts\control.ps1" -DebugConsole
set "classroom_exit_code=%ERRORLEVEL%"
echo.
echo Server control window closed. Exit code: %classroom_exit_code%
echo If it failed to open, send a screenshot of the error above.
pause
exit /b %classroom_exit_code%
