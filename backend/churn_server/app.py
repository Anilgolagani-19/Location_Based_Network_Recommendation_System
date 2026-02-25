from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import pickle
import numpy as np
import requests

# ✅ Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, 'models')

def download_model(url, path):
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        r = requests.get(url)
        open(path, "wb").write(r.content)

# ✅ Replace URL later
download_model(
    "HF_URL/dataset_1_XGBoost.pkl",
    os.path.join(MODEL_DIR, "dataset_1_XGBoost.pkl")
)

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

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json(force=True)
    features = data.get("features")
    model_key = data.get("model", "xgb")

    model = try_load_model(model_key)

    try:
        # ⭐ numerical
        mobile_age = float(features["mobile_age"])
        tower_density = float(features["tower_density"])

        # ⭐ derive congestion
        congestion = float(features["avg_packetloss"]) * 10

        # ⭐ network encoding
        network_5g = 1 if features["network_type"] == "5G" else 0

        # ⭐ operator encoding
        op = features["operator"]
        op_bsnl = 1 if op == "BSNL" else 0
        op_jio = 1 if op == "Jio" else 0
        op_vi = 1 if op in ["Vi", "VI"] else 0

        # ⭐ model vector (7 features)
        X = np.array([[mobile_age, tower_density, congestion, network_5g, op_bsnl, op_jio, op_vi]])

        print("MODEL VECTOR:", X)

        pred_raw = model.predict(X)[0]

        # Threshold prediction: assume >20 means churn (1), else stay (0)
        pred = 1 if pred_raw > 20 else 0

        # Get probabilities if available
        proba = None
        if hasattr(model, 'predict_proba'):
            try:
                proba = model.predict_proba(X)[0].tolist()
            except:
                proba = [0.5, 0.5]  # default

        result = {
            "prediction": float(pred),
            "raw_prediction": float(pred_raw),
            "proba": proba
        }

        return jsonify({"results": [result]})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    try_load_model("xgb")
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)