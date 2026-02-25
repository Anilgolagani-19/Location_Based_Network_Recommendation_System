import os
import json
import pickle
import csv
import sys
from collections import Counter

BASE_DIR = os.path.dirname(__file__)
MODEL_DIR = os.path.join(BASE_DIR, 'models')
DATASET_PATH = os.path.join(BASE_DIR, '..', '..', 'data', 'dataset.json')
OUT_CSV = os.path.join(BASE_DIR, 'predictions.csv')

MODEL_MAP = {
    'xgb': 'dataset_1_XGBoost.pkl',
    'rf': 'random_forest_model.pkl'
}

def load_model(path):
    with open(path, 'rb') as f:
        return pickle.load(f)

def main():
    # check models
    models = {}
    for k, fn in MODEL_MAP.items():
        p = os.path.join(MODEL_DIR, fn)
        if os.path.exists(p):
            try:
                models[k] = load_model(p)
                print(f'Loaded model {k} from {p}')
            except Exception as e:
                print(f'Failed loading model {k}: {e}')
        else:
            print(f'Model file not found for {k}: expected {p}')

    if not models:
        print('No models available. Place your .pkl files in the models/ folder.')
        sys.exit(1)

    # load dataset
    ds_path = os.path.abspath(DATASET_PATH)
    if not os.path.exists(ds_path):
        print('Dataset not found at', ds_path)
        sys.exit(1)

    print('Loading dataset (this may take a while)...')
    with open(ds_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    if not isinstance(data, list):
        print('Dataset JSON is not a list of records; aborting')
        sys.exit(1)

    if len(data) == 0:
        print('Dataset is empty')
        sys.exit(1)

    # infer feature keys from first record (drop obvious label keys)
    first = data[0]
    label_keys = {'churn', 'Churn', 'label', 'target'}
    feature_keys = [k for k in first.keys() if k not in label_keys]
    feature_keys_sorted = sorted(feature_keys)
    print('Using feature keys:', feature_keys_sorted)

    # Prepare CSV header
    header = ['index', 'model', 'prediction', 'label_telugu']
    # if model has predict_proba we'll add a proba column
    # we'll store proba as JSON string
    header.append('proba')

    rows = []
    summaries = {k: Counter() for k in models.keys()}

    for idx, rec in enumerate(data):
        try:
            vals = [rec.get(k, 0) for k in feature_keys_sorted]
            X = [vals]
            for mk, m in models.items():
                try:
                    pred = m.predict(X)[0]
                except Exception as e:
                    pred = None
                proba = None
                if hasattr(m, 'predict_proba') and pred is not None:
                    try:
                        proba = m.predict_proba(X)[0].tolist()
                    except Exception:
                        proba = None
                label_telugu = 'ha' if pred == 1 else 'kadha'
                rows.append([idx, mk, int(pred) if pred is not None else '', label_telugu, json.dumps(proba)])
                summaries[mk][str(pred)] += 1
        except Exception as e:
            print('Failed on record', idx, 'error', e)

    # write CSV
    with open(OUT_CSV, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)

    print('Wrote predictions to', OUT_CSV)
    for mk, cnt in summaries.items():
        print('Summary for', mk, ':', dict(cnt))

if __name__ == '__main__':
    main()
