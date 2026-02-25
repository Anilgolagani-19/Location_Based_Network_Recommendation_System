# Start Churn Prediction Server
# For PowerShell users on Windows

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CHURN PREDICTION SERVER STARTUP" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Python is installed
try {
    python --version | Out-Null
    Write-Host "[✓] Python is installed" -ForegroundColor Green
}
catch {
    Write-Host "[✗] Python not found. Please install Python 3.7+ from python.org" -ForegroundColor Red
    Write-Host "    Then add Python to your system PATH" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Check if venv exists, if not create it
if (-Not (Test-Path ".venv")) {
    Write-Host "[*] Creating virtual environment..." -ForegroundColor Yellow
    python -m venv .venv
    Write-Host "[✓] Virtual environment created" -ForegroundColor Green
} else {
    Write-Host "[✓] Virtual environment already exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "[*] Activating virtual environment..." -ForegroundColor Yellow
& ".\.venv\Scripts\Activate.ps1"
Write-Host "[✓] Virtual environment activated" -ForegroundColor Green
Write-Host ""

# Check if requirements are installed
try {
    pip show flask | Out-Null
    Write-Host "[✓] Dependencies already installed" -ForegroundColor Green
}
catch {
    Write-Host "[*] Installing dependencies..." -ForegroundColor Yellow
    pip install -r requirements.txt
    Write-Host "[✓] Dependencies installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CHECKING MODELS..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (Test-Path "models\dataset_1_XGBoost.pkl") {
    Write-Host "[✓] XGBoost model found" -ForegroundColor Green
} else {
    Write-Host "[!] XGBoost model NOT found: models\dataset_1_XGBoost.pkl" -ForegroundColor Yellow
}

if (Test-Path "models\random_forest_model.pkl") {
    Write-Host "[✓] Random Forest model found" -ForegroundColor Green
} else {
    Write-Host "[!] Random Forest model NOT found: models\random_forest_model.pkl" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  STARTING SERVER..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Server will start on: http://localhost:5000" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Cyan
Write-Host ""

python app.py

Read-Host "Press Enter to exit"
