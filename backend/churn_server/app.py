from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import pickle
import numpy as np
import requests

# =========================
# Paths
# =========================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, 'models')

def download_model(url, path):
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        r = requests.get(url)
        open(path, "wb").write(r.content)

# Optional model download (can ignore if file already exists)
download_model(
    "HF_URL/dataset_1_XGBoost.pkl",
    os.path.join(MODEL_DIR, "dataset_1_XGBoost.pkl")
)

# =========================
# Flask app
# =========================
app = Flask(__name__)
CORS(app)

MODEL_MAP = {
    'xgb': 'dataset_1_XGBoost.pkl',
    'rf': 'random_forest_model.pkl'
}

loaded_models = {}

def try_load_model(key):
    if key in loaded_models:
        return loaded_models[key]

    filename = MODEL_MAP.get(key)
    path = os.path.join(MODEL_DIR, filename)

    with open(path, 'rb') as f:
        model = pickle.load(f)

    loaded_models[key] = model
    return model

# =========================
# Prediction API
# =========================
@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json(force=True)
    features = data.get("features", {})
    model_key = data.get("model", "xgb")

    model = try_load_model(model_key)

    try:
       # ⭐ convert incoming 25-feature dict → list
        feature_values = list(features.values())

# ⭐ reshape for sklearn
        X = np.array(feature_values).reshape(1, -1)

        print("MODEL VECTOR (25):", X)
        print("MODEL VECTOR:", X)

        # ⭐ prediction
        pred_raw = model.predict(X)[0]

        # ⭐ threshold logic
        pred = 1 if pred_raw > 20 else 0

        # ⭐ probability
        proba = None
        if hasattr(model, 'predict_proba'):
            try:
                proba = model.predict_proba(X)[0].tolist()
            except:
                proba = [0.5, 0.5]

        result = {
            "prediction": float(pred),
            "raw_prediction": float(pred_raw),
            "proba": proba
        }

        return jsonify({"results": [result]})

    except Exception as e:
        print("🔥 ERROR:", e)
        raise

# =========================
# Health check
# =========================
@app.route('/models', methods=['GET'])
def get_models():
    available_models = list(MODEL_MAP.keys())
    return jsonify({"models": available_models})

# =========================
# Run
# =========================
if __name__ == "__main__":
    try_load_model("xgb")
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)