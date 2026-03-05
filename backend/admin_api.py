from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import joblib
import os

app = Flask(__name__)
CORS(app)

# ------------------------------
# Paths
# ------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "..", "datasets")
MODEL_DIR = os.path.join(BASE_DIR, "models")

# ------------------------------
# Load datasets
# ------------------------------

DATASETS = {
    "airtel": pd.read_csv(os.path.join(DATASET_DIR, "airtel_dataset.csv")),
    "jio": pd.read_csv(os.path.join(DATASET_DIR, "jio_dataset.csv")),
    "vi": pd.read_csv(os.path.join(DATASET_DIR, "vi_dataset.csv")),
    "bsnl": pd.read_csv(os.path.join(DATASET_DIR, "bsnl_dataset.csv"))
}

# ------------------------------
# Load AI models
# ------------------------------

MODELS = {
    "airtel": joblib.load(os.path.join(MODEL_DIR, "airtel_churn.pkl")),
    "jio": joblib.load(os.path.join(MODEL_DIR, "jio_churn.pkl")),
    "vi": joblib.load(os.path.join(MODEL_DIR, "vi_churn.pkl")),
    "bsnl": joblib.load(os.path.join(MODEL_DIR, "bsnl_churn.pkl"))
}

# ------------------------------
# Home
# ------------------------------

@app.route("/")
def home():
    return "TeleSignal API Running"

# ------------------------------
# Admin Dashboard Data
# ------------------------------

@app.route("/customers/<operator>")
def get_customers(operator):

    operator = operator.lower()

    if operator not in DATASETS:
        return jsonify({"error": "Invalid operator"}), 400

    df = DATASETS[operator]

    return jsonify({
        "operator": operator,
        "total_records": len(df),
        "data": df.to_dict(orient="records")
    })

# ------------------------------
# AI Prediction
# ------------------------------

@app.route("/predict/<operator>", methods=["POST"])
def predict(operator):

    operator = operator.lower()

    if operator not in MODELS:
        return jsonify({"error": "Invalid operator"}), 400

    try:
        import numpy as np

        loaded = MODELS[operator]

        model = loaded["model"]
        columns = loaded["columns"]

        data = request.form

        network_type = 1 if data["Network_type"] == "5G" else 0
        signal = float(data["Signal_strength_dBm"])
        issues = int(data["No_of_Issues_Resolved"])
        months = int(data["Months_Active"])
        latency = float(data["Latency_Score"])
        state = data["State"]
        plan = data["Plan_Type"]

        # create empty feature vector
        input_data = {col: 0 for col in columns}

        # numeric values
        input_data["Network_type"] = network_type
        input_data["Signal_strength_dBm"] = signal
        input_data["No_of_Issues_Resolved"] = issues
        input_data["Months_Active"] = months
        input_data["Latency_Score"] = latency

        # encode state
        state_col = f"State_{state}"
        if state_col in input_data:
            input_data[state_col] = 1

        # encode plan
        plan_col = f"Plan_Type_{plan}"
        if plan_col in input_data:
            input_data[plan_col] = 1

        features = np.array(list(input_data.values())).reshape(1, -1)

        prediction = model.predict(features)[0]

        result = "Customer Will Stay" if prediction == 0 else "Customer May Churn"

        return jsonify({
            "operator": operator,
            "prediction": result
        })

    except Exception as e:
        print("Prediction Error:", e)
        return jsonify({"error": str(e)}), 500                        # ------------------------------
                    # Run server
                    # ------------------------------

if __name__ == "__main__":
                       import os

port = int(os.environ.get("PORT", 10000))
app.run(host="0.0.0.0", port=port)