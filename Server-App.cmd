@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -STA -WindowStyle Hidden -ExecutionPolicy Bypass -File "%~dp0scripts\control.ps1"
