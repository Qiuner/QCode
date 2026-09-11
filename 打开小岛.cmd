@echo off
cd /d "%~dp0"
node apps/web/src/open.mjs
if errorlevel 1 pause
