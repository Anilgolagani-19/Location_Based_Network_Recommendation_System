@echo off
REM Start Churn Prediction Server
REM This script sets up and runs the Flask server on Windows

echo ========================================
echo  CHURN PREDICTION SERVER STARTUP
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Please install Python 3.7+ from python.org
    echo Then add Python to your system PATH
    pause
    exit /b 1
)

echo [✓] Python is installed
echo.

REM Check if venv exists, if not create it
if not exist ".venv\" (
    echo [*] Creating virtual environment...
    python -m venv .venv
    echo [✓] Virtual environment created
) else (
    echo [✓] Virtual environment already exists
)

echo.
echo [*] Activating virtual environment...
call .venv\Scripts\activate.bat
echo [✓] Virtual environment activated
echo.

REM Check if requirements are installed
pip show flask >nul 2>&1
if errorlevel 1 (
    echo [*] Installing dependencies...
    pip install -r requirements.txt
    echo [✓] Dependencies installed
) else (
    echo [✓] Dependencies already installed
)

echo.
echo ========================================
echo  CHECKING MODELS...
echo ========================================
echo.

if exist "models\dataset_1_XGBoost.pkl" (
    echo [✓] XGBoost model found
) else (
    echo [!] XGBoost model NOT found: models\dataset_1_XGBoost.pkl
)

if exist "models\random_forest_model.pkl" (
    echo [✓] Random Forest model found
) else (
    echo [!] Random Forest model NOT found: models\random_forest_model.pkl
)

echo.
echo ========================================
echo  STARTING SERVER
echo ========================================
echo.
echo Server will start on: http://localhost:5000
echo Press Ctrl+C to stop the server
echo.

python app.py

pause
