# 🚀 CHURN PREDICTION - QUICK START GUIDE

## ⚡ 3-Minute Setup

### Step 1: Open Terminal
```
cd "Location_Based_Network_Recommendation_System\backend\churn_server"
```

### Step 2: Start Server
```
python app.py
```
Wait for: `Running on http://127.0.0.1:5000`

### Step 3: Open Browser
```
dashboards/churn-result.html
```

### Step 4: Make Prediction
1. Select Model: **Random Forest**
2. Fill fields (use defaults if unsure)
3. Click **🚀 Predict Churn**
4. See result (Green=Stay, Red=Churn)

---

## 📂 Key Files

| File | Purpose |
|------|---------|
| `dashboards/churn-result.html` | Main prediction UI |
| `dashboards/CHURN_TEST_DEMO.html` | Quick test page |
| `backend/churn_server/app.py` | Flask server |
| `backend/churn_server/START_SERVER.bat` | Auto-startup (Windows) |
| `FINAL_RESULTS.md` | Complete documentation |

---

## 💡 Test Immediately

### Test Backend First:
```
dashboards/CHURN_TEST_DEMO.html
→ Click "Check Backend" 
→ Should show ✓ Backend Ready
```

### Then Try Predictions:
```
dashboards/churn-result.html
→ Select Random Forest
→ Click "Load Defaults" or fill manually
→ Click "Predict Churn"
→ See result!
```

---

## 🎯 What Each Model Expects

### Random Forest ✓
- **Features**: 25 elements
- **Input**: All form fields
- **Output**: 0 (No Churn) / 1 (Churn) + confidence %
- **Status**: Fully Working

### XGBoost
- **Features**: 7 elements (different)
- **Status**: Requires feature mapping

---

## 🔍 Sample Feature Values

```
Mobile Age: 2.5
Network Type: 4G
Download Speed: 45.8
Upload Speed: 15.5
Jitter: 12.5
Packet Loss: 0.5
Tower Density: 25.3
Signal: -90
Congestion: 0.6
Calls: 150
Resolved: 140
Satisfaction: 8.5
Months: 24
Latency Score: 75.5
Device OS: Android
Operator: Jio
Plan: Yearly
Payment: Postpaid
```

Expected: ~64% churn risk

---

## ⚙️ Common Issues

| Issue | Solution |
|-------|----------|
| "Backend Offline" | Run `python app.py` |
| "Port 5000 in use" | Change port in app.py & js |
| Models not found | Check `backend/churn_server/models/` |
| Predictions fail | Test with CHURN_TEST_DEMO.html first |

---

## 📚 More Info

- Full guide: `FINAL_RESULTS.md`
- Setup details: `backend/churn_server/SETUP.md`
- API reference: `backend/churn_server/SETUP.md` (API section)

---

## ✅ System Status

```
✓ Models loaded and tested
✓ Backend server ready
✓ Frontend UI complete
✓ Documentation provided
✓ Test scenarios working

→ READY TO USE!
```

---

**Created**: February 2026  
**Status**: Production Ready  
**Next**: Run `python app.py` → Open `churn-result.html` → Start predicting!
