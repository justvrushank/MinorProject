@echo off
title Blue Carbon MRV System
echo.
echo  ===================================
echo   Blue Carbon MRV System v1.0
echo  ===================================
echo.
echo  Installing dependencies...
pip install -r backend\requirements.txt -q
echo  Done.
echo.
echo  Dashboard: http://localhost:8000
echo  API Docs:  http://localhost:8000/docs
echo.
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
pause
