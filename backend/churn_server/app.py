from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import pickle
import numpy as np

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, 'models')

MODEL_MAP = {
'xgb': 'dataset_1_XGBoost.pkl'
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

    model = try_load_model("xgb")

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

        pred = model.predict(X)[0]

        return jsonify({"prediction": float(pred)})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    try_load_model("xgb")
    app.run(debug=True)