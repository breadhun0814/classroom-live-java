@echo off
cd /d "%~dp0"
if not exist "%~dp0Server-App.vbs" (
 echo ERROR: Server-App.vbs is missing. Copy all update files into the existing server folder.
 pause
 exit /b 1
)
start "" "%SystemRoot%\System32\wscript.exe" "%~dp0Server-App.vbs"
exit /b 0
