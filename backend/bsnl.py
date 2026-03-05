from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np
import os

app = Flask(__name__)
CORS(app)

model_path = os.path.join(os.path.dirname(__file__), "models", "bsnl_churn.pkl")
model = pickle.load(open(model_path, "rb"))

@app.route("/")
def home():
    return " bsnl model API Running"

@app.route("/predict", methods=["POST"])
def predict():

    try:
        data = request.form

        # Encode categorical values

        network_map = {
            "4G": 0,
            "5G": 1
        }

        plan_map = {
            "Monthly Plan": 0,
            "3 Months Plan": 1,
            "Yearly Plan": 2
        }

        state_map = {
            "Andhra Pradesh": 0,
            "Delhi": 1,
            "Karnataka": 2,
            "Maharashtra": 3,
            "Tamil Nadu": 4,
            "Telangana": 5,
            "West Bengal": 6
        }

        features = [
            network_map[data["Network_type"]],
            state_map[data["State"]],
            float(data["Signal_strength_dBm"]),
            float(data["No_of_Issues_Resolved"]),
            plan_map[data["Plan_Type"]],
            float(data["Months_Active"]),
            float(data["Latency_Score"])
        ]

        features = np.array(features).reshape(1,-1)

        prediction = model.predict(features)[0]

        result = "Customer Will Churn ❌" if prediction == 1 else "Customer Will Stay ✅"

        return jsonify({
            "operator":"BSNL",
            "prediction":result
        })

    except Exception as e:
        return jsonify({"error":str(e)})

if __name__ == "__main__":
    app.run(port=5002, debug=True)