@echo off
setlocal
cd /d "%~dp0"
if exist build\web\index.html goto serve
powershell -NoProfile -ExecutionPolicy Bypass -File tools\build_web.ps1
if errorlevel 1 goto failed
:serve
set "MOSSLIGHT_PYTHON=D:\DevTools\Python\Python3.10.11\python.exe"
if exist "%MOSSLIGHT_PYTHON%" goto run
set "MOSSLIGHT_PYTHON=python"
:run
"%MOSSLIGHT_PYTHON%" tools\serve_web.py --open
if errorlevel 1 goto failed
exit /b 0
:failed
echo Web preview failed. See the messages above.
pause
exit /b 1
