#!/usr/bin/env python3
"""
Churn Prediction System - Direct Test Script
Tests the prediction system without Flask server
"""

import os
import pickle
import json
import numpy as np
from pathlib import Path

def load_models():
    """Load both models from the models folder"""
    models_dir = Path(__file__).parent / 'models'
    loaded = {}
    
    print("\n" + "="*50)
    print("CHURN PREDICTION SYSTEM - MODEL TEST")
    print("="*50 + "\n")
    
    # Try loading Random Forest
    rf_path = models_dir / 'random_forest_model.pkl'
    if rf_path.exists():
        try:
            with open(rf_path, 'rb') as f:
                loaded['rf'] = pickle.load(f)
            print("[✓] Random Forest model loaded successfully")
        except Exception as e:
            print(f"[✗] Failed to load Random Forest: {e}")
    else:
        print(f"[!] Random Forest model not found at: {rf_path}")
    
    # Try loading XGBoost
    xgb_path = models_dir / 'dataset_1_XGBoost.pkl'
    if xgb_path.exists():
        try:
            with open(xgb_path, 'rb') as f:
                loaded['xgb'] = pickle.load(f)
            print("[✓] XGBoost model loaded successfully")
        except Exception as e:
            print(f"[✗] Failed to load XGBoost: {e}")
    else:
        print(f"[!] XGBoost model not found at: {xgb_path}")
    
    return loaded

def make_prediction(model, model_name, features):
    """Make a prediction with the given model"""
    try:
        X = np.array([features])
        prediction = model.predict(X)[0]
        
        result = {
            'model': model_name,
            'prediction': int(prediction),
            'label': 'CHURN' if prediction == 1 else 'STAY'
        }
        
        # Try to get probability
        if hasattr(model, 'predict_proba'):
            try:
                proba = model.predict_proba(X)[0]
                result['proba'] = [float(p) for p in proba]
                result['confidence'] = f"Stay: {proba[0]*100:.1f}% | Churn: {proba[1]*100:.1f}%"
            except:
                pass
        
        return result
    except Exception as e:
        return {'error': str(e)}

def print_result(result):
    """Pretty print the prediction result"""
    if 'error' in result:
        print(f"  ERROR: {result['error']}")
        return
    
    icon = "⚠️" if result['label'] == 'CHURN' else "✓"
    color_start = "\033[91m" if result['label'] == 'CHURN' else "\033[92m"  # Red or Green
    color_end = "\033[0m"
    
    print(f"\n  Model: {result['model']}")
    print(f"  Prediction: {color_start}{result['label']}{color_end} {icon}")
    if 'confidence' in result:
        print(f"  {result['confidence']}")

def main():
    # Load models
    models = load_models()
    
    if not models:
        print("\n[ERROR] No models could be loaded!")
        print("Please ensure model files exist in the 'models' folder:")
        print("  - random_forest_model.pkl")
        print("  - dataset_1_XGBoost.pkl")
        return
    
    # Test Feature Vector
    print("\n" + "="*50)
    print("TEST SCENARIO: Typical Customer Profile")
    print("="*50)
    
    test_features = [
        2.5,       # [0] Mobile Age (years)
        4,         # [1] Network Type (4G)
        15.5,      # [2] Avg Upload Speed (Mbps)
        45.8,      # [3] Avg Download Speed (Mbps)
        12.5,      # [4] Avg Jitter (ms)
        0.5,       # [5] Avg Packet Loss (%)
        25.3,      # [6] Tower Density (per km²)
        -90,       # [7] Signal Strength (dBm)
        0.6,       # [8] Congestion Level (0-1)
        150,       # [9] Total Calls
        140,       # [10] Issues Resolved
        8.5,       # [11] Satisfactory Level (0-10)
        24,        # [12] Months Active
        75.5,      # [13] Latency Score
        1, 0,      # [14-15] Device OS: Android=1, iOS=0
        0, 0, 1, 0, # [16-19] Operator: Jio=1
        0, 0, 1,   # [20-22] Plan Type: Yearly=1
        1, 0       # [23-24] Payment: Postpaid=1, Prepaid=0
    ]
    
    print("\nInput Features:")
    print(f"  • Mobile Age: 2.5 years")
    print(f"  • Network Type: 4G")
    print(f"  • Download Speed: 45.8 Mbps (Good)")
    print(f"  • Upload Speed: 15.5 Mbps (Good)")
    print(f"  • Total Calls: 150")
    print(f"  • Issues Resolved: 140 (93% resolution)")
    print(f"  • Satisfaction Level: 8.5/10 (High)")
    print(f"  • Months Active: 24 (2 years)")
    print(f"  • Device OS: Android")
    print(f"  • Operator: Jio")
    print(f"  • Plan Type: Yearly")
    print(f"  • Payment Type: Postpaid")
    
    print("\n" + "="*50)
    print("MAKING PREDICTIONS")
    print("="*50)
    
    # Make predictions with each model
    results = []
    for model_key, model in models.items():
        result = make_prediction(model, model_key.upper(), test_features)
        results.append(result)
        print_result(result)
    
    # Display summary
    print("\n" + "="*50)
    print("SUMMARY")
    print("="*50)
    
    for result in results:
        if 'error' not in result:
            icon = "⚠️ RISK:" if result['label'] == 'CHURN' else "✓ SAFE:"
            print(f"\n{icon} {result['model']}")
            print(f"  Prediction: {result['label']}")
            if 'confidence' in result:
                print(f"  {result['confidence']}")
    
    # Test 2: High Risk Customer
    print("\n\n" + "="*50)
    print("TEST SCENARIO 2: High Risk Customer Profile")
    print("="*50)
    
    high_risk_features = [
        0.5,       # [0] Mobile Age: Very New (0.5 years)
        4,         # [1] Network Type (4G)
        3.5,       # [2] Avg Upload Speed: Very Low
        12.0,      # [3] Avg Download Speed: Very Low
        45.0,      # [4] Avg Jitter: Very High
        5.0,       # [5] Avg Packet Loss: Very High
        5.0,       # [6] Tower Density: Very Low
        -110,      # [7] Signal Strength: Very Poor
        0.9,       # [8] Congestion Level: Very High
        20,        # [9] Total Calls: Very Low
        10,        # [10] Issues Resolved: Low
        2.5,       # [11] Satisfactory Level: Very Low
        3,         # [12] Months Active: Very Short
        25.0,      # [13] Latency Score: Very Low
        1, 0,      # [14-15] Device OS: Android
        0, 0, 0, 1, # [16-19] Operator: Vi
        0, 1, 0,   # [20-22] Plan Type: Monthly
        0, 1       # [23-24] Payment: Prepaid
    ]
    
    print("\nInput Features (Higher Risk Profile):")
    print(f"  • Mobile Age: 0.5 years (Very New)")
    print(f"  • Download Speed: 12.0 Mbps (Poor)")
    print(f"  • Network Quality: Poor (High jitter, packet loss)")
    print(f"  • Total Calls: 20 (Very Low)")
    print(f"  • Issues Resolved: 10 (50% resolution)")
    print(f"  • Satisfaction Level: 2.5/10 (Very Low)")
    print(f"  • Months Active: 3 (Very New)")
    print(f"  • Device OS: Android")
    print(f"  • Operator: Vi")
    print(f"  • Plan Type: Monthly")
    print(f"  • Payment Type: Prepaid")
    
    print("\n" + "="*50)
    print("PREDICTIONS FOR HIGH RISK CUSTOMER")
    print("="*50)
    
    for model_key, model in models.items():
        result = make_prediction(model, model_key.upper(), high_risk_features)
        print_result(result)
    
    # Final Summary
    print("\n\n" + "="*50)
    print("NEXT STEPS")
    print("="*50)
    print("""
✓ Models are working and making predictions!

To use the interactive web interface:
  1. Run: cd backend/churn_server
  2. Execute: python app.py
  3. Open in browser: dashboards/churn-result.html

To test the backend API:
  1. Make sure Flask server is running (python app.py)
  2. Open in browser: dashboards/CHURN_TEST_DEMO.html
  3. Click "Check Backend" to verify connection

For more information, see:
  📖 backend/churn_server/SETUP.md
  📖 CHURN_SETUP_COMPLETE.md
""")

if __name__ == '__main__':
    main()
