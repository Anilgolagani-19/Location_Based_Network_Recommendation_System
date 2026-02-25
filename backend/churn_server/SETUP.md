# Churn Prediction System - Setup & Usage Guide

## Overview
This is a complete churn prediction system with a Flask backend server and interactive HTML/JavaScript UI for making customer churn predictions.

---

## Quick Start (Windows)

### Option 1: Batch Script (Easiest)
```cmd
cd backend/churn_server
START_SERVER.bat
```

### Option 2: PowerShell
```powershell
cd backend/churn_server
powershell -ExecutionPolicy Bypass -File START_SERVER.ps1
```

### Option 3: Manual Setup
```cmd
cd backend/churn_server
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

---

## What You Need

### Models (Required)
The following model files must be in `backend/churn_server/models/`:
- **dataset_1_XGBoost.pkl** - XGBoost classification model
- **random_forest_model.pkl** - Random Forest classification model

If you have a new model file with a different name (e.g., `my_churn_model.pkl`), you have two options:

**Option A: Rename the file to match expected name**
```
my_churn_model.pkl → random_forest_model.pkl  (or dataset_1_XGBoost.pkl)
```

**Option B: Update app.py MODEL_MAP**
Edit `backend/churn_server/app.py` and add your model:
```python
MODEL_MAP = {
    'xgb': 'dataset_1_XGBoost.pkl',
    'rf': 'random_forest_model.pkl',
    'custom': 'my_churn_model.pkl'  # Add this line
}
```

---

## Features

### Input Features (25 features total)

**Numeric Features (continuous):**
1. Mobile Age (years)
2. Network Type (2G/3G/4G/5G converted to numeric)
3. Average Upload Speed (Mbps)
4. Average Download Speed (Mbps)
5. Average Jitter (ms)
6. Average Packet Loss (%)
7. Tower Density (per km²)
8. Signal Strength (dBm)
9. Congestion Level (0-1)
10. Total Calls
11. Issues Resolved
12. Satisfactory Level (0-10)
13. Months Active
14. Latency Score

**Categorical Features (one-hot encoded):**
- Device OS: Android, iOS, Other
- Operator: Airtel, BSNL, Jio, Vi, Other
- Plan Type: 3 Months, Monthly, Yearly, Other
- Payment Type: Postpaid, Prepaid

### Output
The prediction returns:
- **Prediction**: 1 (Customer will CHURN) or 0 (Customer will STAY)
- **Confidence Scores**: Probability distribution
  - Example: Stay: 85.2% | Churn: 14.8%

---

## Running the Prediction System

### Step 1: Start the Backend Server
```cmd
cd backend/churn_server
START_SERVER.bat
```
You should see:
```
[✓] Python is installed
[✓] Virtual environment already exists
[✓] Virtual environment activated
[✓] Dependencies already installed
========================================
  CHECKING MODELS...
========================================
[✓] XGBoost model found
[✓] Random Forest model found
========================================
  STARTING SERVER...
========================================
Server will start on: http://localhost:5000
...
 * Running on http://127.0.0.1:5000
Press Ctrl+C to stop the server
```

### Step 2: Open the Prediction UI
Open this file in your web browser:
```
dashboards/churn-result.html
```

Or navigate to it from your local HTTP server.

### Step 3: Make a Prediction
1. **Select a Model**: Choose "Random Forest" or "XGBoost"
2. **Fill Input Fields**:
   - Enter numeric values for customer metrics
   - Select categorical values from dropdowns
   - Use the placeholder values as examples
3. **Click "Predict Churn"**
4. **View Results**:
   - Green box = Customer will STAY (No churn)
   - Red box = Customer will CHURN (High risk)
   - See confidence scores for the prediction

---

## Example Input & Output

### Input Example:
```
Model: Random Forest
Mobile Age: 2.5 years
Network Type: 4G
Avg Upload Speed: 15.5 Mbps
Avg Download Speed: 45.8 Mbps
Avg Jitter: 12.5 ms
Avg Packet Loss: 0.5%
Tower Density: 25.3 per km²
Signal Strength: -90 dBm
Congestion Level: 0.6
Total Calls: 150
Issues Resolved: 140
Satisfactory Level: 8.5
Months Active: 24
Latency Score: 75.5
Device OS: Android
Operator: Jio
Plan Type: Yearly Plan
Payment Type: Postaid
```

### Output Example:
```
✓ Customer will STAY
STAY
Confidence Scores (Random Forest):
Stay: 88.4% | Churn: 11.6%
```

---

## Troubleshooting

### Problem: "Backend Offline" Message

**Solution 1: Check if server is running**
- Keep the terminal with `START_SERVER.bat` open
- Don't close the Python server window

**Solution 2: Check if port 5000 is in use**
```cmd
netstat -ano | findstr :5000
```
If port 5000 is blocked, change the port in `app.py`:
```python
app.run(host='0.0.0.0', port=5001, debug=True)  # Change 5000 to 5001
```

Then update the BACKEND_URL in `js/churn-result.js`:
```javascript
const BACKEND_URL = 'http://localhost:5001';
```

### Problem: "Model not found" Error

**Solution: Check models folder**
1. Go to `backend/churn_server/models/`
2. Verify these files exist:
   - `dataset_1_XGBoost.pkl`
   - `random_forest_model.pkl`

If files are missing with different names, rename them:
```cmd
cd backend/churn_server/models
ren my_model.pkl random_forest_model.pkl
```

### Problem: "ModuleNotFoundError" (Missing dependencies)

**Solution: Reinstall requirements**
```cmd
cd backend/churn_server
.venv\Scripts\activate
pip install --upgrade -r requirements.txt
```

### Problem: CORS Error in Browser Console

**Solution: Server CORS is enabled**
The Flask app uses `flask_cors.CORS(app)` which is already configured. If you still get CORS errors:

1. Make sure server restarted properly
2. Clear browser cache (Ctrl+Shift+Del)
3. Try in incognito/private window

---

## API Reference (Direct Usage)

### Check Available Models
```bash
curl http://localhost:5000/models
```

Response:
```json
{
  "xgb": true,
  "rf": true
}
```

### Make a Prediction
```bash
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{"model":"rf","features":[2.5,4,15.5,45.8,12.5,0.5,25.3,-90,0.6,150,140,8.5,24,75.5,1,0,0,0,1,0,0,1,0,1,0]}'
```

Response:
```json
{
  "results": [
    {
      "prediction": 0,
      "proba": [0.884, 0.116],
      "label_telugu": "kadha"
    }
  ]
}
```

---

## Feature Vector Mapping

The JavaScript builds a 25-element vector with this structure:

```
[0]   = Mobile Age
[1]   = Network Type (numeric)
[2]   = Avg Upload Speed
[3]   = Avg Download Speed
[4]   = Avg Jitter
[5]   = Avg Packet Loss
[6]   = Tower Density
[7]   = Signal Strength
[8]   = Congestion Level
[9]   = Total Calls
[10]  = Issues Resolved
[11]  = Satisfactory Level
[12]  = Months Active
[13]  = Latency Score
[14]  = Device OS: Android (1 if yes, 0 otherwise)
[15]  = Device OS: iOS (1 if yes, 0 otherwise)
[16]  = Operator: Airtel
[17]  = Operator: BSNL
[18]  = Operator: Jio
[19]  = Operator: Vi
[20]  = Plan Type: 3 Months
[21]  = Plan Type: Monthly
[22]  = Plan Type: Yearly
[23]  = Payment Type: Postpaid
[24]  = Payment Type: Prepaid
```

---

## Performance Notes

- **Model Loading**: Models are cached in memory after first use
- **Prediction Time**: <100ms per prediction (depends on model size)
- **Concurrency**: Flask can handle multiple requests (thread pool)
- **Accuracy**: Depends on training data and model quality

---

## Files Modified/Created

### New/Updated Files:
1. `dashboards/churn-result.html` - Enhanced UI with better result display
2. `js/churn-result.js` - Improved prediction logic and error handling
3. `backend/churn_server/START_SERVER.bat` - Windows batch startup script
4. `backend/churn_server/START_SERVER.ps1` - PowerShell startup script
5. `backend/churn_server/SETUP.md` - This documentation

### Existing Files (Unchanged):
- `backend/churn_server/app.py` - Flask server
- `backend/churn_server/requirements.txt` - Python dependencies
- `backend/churn_server/models/` - Your model files

---

## Support

If you encounter issues:

1. **Check Server Status**: Verify `http://localhost:5000/models`
2. **Check Browser Console**: Press F12 for developer tools, check Console tab
3. **Check Python Terminal**: Look for error messages from Flask server
4. **Verify Models Exist**: Check `backend/churn_server/models/` folder
5. **Test API Directly**: Use curl or Postman to test `/models` and `/predict` endpoints

---

## Next Steps

### To Use a New Model:
1. Place your `.pkl` file in `backend/churn_server/models/`
2. Rename it to match your choice or update `MODEL_MAP` in `app.py`
3. Restart the server
4. Select the model from the dropdown in the UI

### To Improve Predictions:
1. Collect more training data
2. Retrain models (XGBoost and Random Forest)
3. Save as `.pkl` files
4. Replace existing model files
5. No code changes needed!

---

## Version Info
- Created: Feb 2026
- Backend: Flask + Flask-CORS
- Frontend: HTML5 + Vanilla JavaScript
- Models: Scikit-learn, XGBoost
- Python: 3.7+
