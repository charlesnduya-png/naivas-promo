@echo off
cd /d "%~dp0"
echo Starting Naivas promo site...
echo.
echo Open: http://localhost:5173
echo Press Ctrl+C to stop.
echo.
start "" http://localhost:5173
npx --yes serve -l 5173 .
pause
