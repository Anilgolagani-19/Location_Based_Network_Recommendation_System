from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import os

app = Flask(__name__)
CORS(app)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "..", "datasets")
# Load datasets once when server starts
DATASETS = {
    "airtel": pd.read_csv(os.path.join(DATASET_DIR, "airtel_dataset.csv")),
    "jio": pd.read_csv(os.path.join(DATASET_DIR, "jio_dataset.csv")),
    "vi": pd.read_csv(os.path.join(DATASET_DIR, "vi_dataset.csv")),
    "bsnl": pd.read_csv(os.path.join(DATASET_DIR, "bsnl_dataset.csv"))
}

@app.route("/")
def home():
    return "Admin Data API Running"


@app.route("/customers/<operator>")
def get_customers(operator):

    if operator not in DATASETS:
        return jsonify({"error": "Invalid operator"}), 400

    df = DATASETS[operator]

    return jsonify({
        "operator": operator,
        "total_records": len(df),
        "data": df.to_dict(orient="records")
    })


@app.route("/predict", methods=["POST"])
def predict():

    operator = request.form.get("operator")

    if operator not in DATASETS:
        return jsonify({"error": "Invalid operator"}), 400

    latency = request.form.get("Latency_Score")
    latency = int(latency) if latency else 0

    if latency < 30:
        prediction = "Customer Will Stay"
    elif latency < 60:
        prediction = "Customer At Risk"
    else:
        prediction = "Customer Likely To Leave"

    return jsonify({
        "operator": operator,
        "prediction": prediction
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=False)