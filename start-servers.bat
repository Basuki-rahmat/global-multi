@echo off
setlocal
cd /d "%~dp0"

where npm >nul 2>&1
if errorlevel 1 (
  echo npm was not found. Install Node.js and make sure npm is on PATH.
  pause
  exit /b 1
)

echo Starting Multi Global frontend and backend...
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:5000
echo Press Ctrl+C to stop both servers.
call npm run dev

if errorlevel 1 (
  echo One or more servers exited with an error.
  pause
)