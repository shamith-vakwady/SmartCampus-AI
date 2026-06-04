@echo off
echo ===================================================
echo AI Smart Campus Platform - Setup Script
echo ===================================================

echo [1/3] Setting up Python Virtual Environment...
cd backend
python -m venv venv
if %errorlevel% neq 0 (
    echo [ERROR] Failed to create virtual environment. Ensure Python is installed and added to PATH.
    pause
    exit /b %errorlevel%
)

call venv\Scripts\activate.bat
echo Installing backend requirements...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install backend dependencies.
    pause
    exit /b %errorlevel%
)

echo Seeding initial database with demo records...
python seed.py
cd ..

echo [2/3] Installing Frontend Node dependencies...
cd frontend
call npm install --legacy-peer-deps
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install frontend dependencies.
    pause
    exit /b %errorlevel%
)
cd ..

echo [3/3] Setup complete!
echo.
echo ===================================================
echo HOW TO RUN THE PLATFORM:
echo.
echo 1. START BACKEND:
echo    Open a new terminal and run:
echo    cd backend
echo    venv\Scripts\activate.bat
echo    python run.py
echo.
echo 2. START FRONTEND:
echo    Open a second terminal and run:
echo    cd frontend
echo    npm run dev
echo.
echo The dashboard will be available at: http://localhost:5173
echo ===================================================
pause
