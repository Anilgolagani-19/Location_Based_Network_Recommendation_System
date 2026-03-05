from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np
import os

app = Flask(__name__)
CORS(app)

# Load model
model_path = os.path.join(os.path.dirname(__file__), "models", "airtel_churn.pkl")
loaded = pickle.load(open(model_path, "rb"))

model = loaded["model"]
columns = loaded["columns"]


@app.route("/")
def home():
    return "Airtel Model API Running"


@app.route("/predict", methods=["POST"])
def predict():

    try:
        data = request.form

        # Read form inputs
        network_type = 1 if data["Network_type"] == "5G" else 0
        signal = float(data["Signal_strength_dBm"])
        issues = int(data["No_of_Issues_Resolved"])
        months = int(data["Months_Active"])
        latency = float(data["Latency_Score"])
        state = data["State"]
        plan = data["Plan_Type"]

        # Create empty feature vector
        input_data = {col: 0 for col in columns}

        # Fill numeric fields
        input_data["Network_type"] = network_type
        input_data["Signal_strength_dBm"] = signal
        input_data["No_of_Issues_Resolved"] = issues
        input_data["Months_Active"] = months
        input_data["Latency_Score"] = latency

        # One-hot encode state
        state_col = f"State_{state}"
        if state_col in input_data:
            input_data[state_col] = 1

        # One-hot encode plan type
        plan_col = f"Plan_Type_{plan}"
        if plan_col in input_data:
            input_data[plan_col] = 1

        # Convert to numpy array
        features = np.array(list(input_data.values())).reshape(1, -1)

        # Prediction
        prediction = model.predict(features)[0]

        result = "Customer Will Churn ❌" if prediction == 1 else "Customer Will Stay ✅"

        return jsonify({
            "operator": "Airtel",
            "prediction": result
        })

    except Exception as e:
        return jsonify({"error": str(e)})


if __name__ == "__main__":
    app.run(port=5001, debug=True)