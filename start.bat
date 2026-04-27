@echo off
echo.
echo  Blue Carbon MRV Console - Starting all services...
echo  ────────────────────────────────────────────────────
echo.

REM Check Docker is running
docker info > nul 2>&1
if errorlevel 1 (
    echo  ERROR: Docker Desktop is not running.
    echo  Please start Docker Desktop and try again.
    echo.
    pause
    exit /b 1
)

echo  [1/3] Starting Docker services ^(backend + worker + postgres + redis^)...
docker compose up -d
if errorlevel 1 (
    echo  ERROR: Docker services failed to start.
    pause
    exit /b 1
)

echo  [2/3] Waiting for backend to be ready ^(10 seconds^)...
timeout /t 10 /nobreak > nul

echo  [3/3] Starting frontend dev server...
start "BlueCarbon-Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo  ────────────────────────────────────────────────────
echo  All services are running!
echo.
echo    Frontend  →  http://localhost:8080
echo    Backend   →  http://localhost:8000
echo    API Docs  →  http://localhost:8000/docs
echo    Map       →  http://localhost:8080/map
echo.
echo    Login: admin@test.com  /  admin123
echo.
echo    To stop all services: run stop.bat
echo  ────────────────────────────────────────────────────
echo.
pause
