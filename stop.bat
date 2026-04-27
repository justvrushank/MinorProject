@echo off
echo.
echo  Blue Carbon MRV Console - Shutting down...
echo  ────────────────────────────────────────────────────
echo.

echo  [1/2] Stopping frontend dev server...
taskkill /FI "WINDOWTITLE eq BlueCarbon-Frontend" /F > nul 2>&1
echo  Done.

echo  [2/2] Stopping Docker services...
docker compose down
echo  Done.

echo.
echo  ────────────────────────────────────────────────────
echo  All services stopped safely.
echo  Your database and data are preserved.
echo.
echo  Run start.bat to start again.
echo  ────────────────────────────────────────────────────
echo.
pause
