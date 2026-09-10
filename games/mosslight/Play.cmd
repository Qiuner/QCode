@echo off
setlocal
cd /d "%~dp0"
set "MOSSLIGHT_GODOT=D:\Godot_v4.7.2-stable_win64.exe\Godot_v4.7.2-stable_win64.exe"
if exist "%MOSSLIGHT_GODOT%" goto run
for %%G in (godot.exe godot4.exe) do for %%P in (%%~$PATH:G) do set "MOSSLIGHT_GODOT=%%P"
if exist "%MOSSLIGHT_GODOT%" goto run
echo Godot 4.7 was not found. Open project.godot in Godot and press F6 or F5.
pause
exit /b 1
:run
"%MOSSLIGHT_GODOT%" --path . --editor --headless --import
if errorlevel 1 goto failed
start "Mosslight Isle" "%MOSSLIGHT_GODOT%" --path .
exit /b 0
:failed
echo Import failed. See the messages above.
pause
exit /b 1
