@echo off
:: Change to the folder that contains this script
cd /d "%~dp0"

:: Start the backend (npm start runs node dist\index.js) in a new console window
start "" cmd /c "npm start"

:: Give the server a moment to start
timeout /t 2 > nul

:: Open the default browser at the UI URL
start "" http://localhost:5001

