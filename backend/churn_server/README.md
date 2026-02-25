# Churn predictor server

Place your model files into the `models/` folder in this directory with the following names:

- `dataset_1_XGBoost.pkl`  (XGBoost model)
- `random_forest_model.pkl` (Random Forest model) — if your file is named `random_forest_model (1).pkl`, rename it to `random_forest_model.pkl`

Quick start (Windows):

```powershell
cd "Location_Based_Network_Recommendation_System\backend\churn_server"
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Open the UI at `dashboards/churn-predictor.html` and set `http://localhost:5000` as backend.
