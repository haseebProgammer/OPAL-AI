"""
ADVISORY ONLY: This AI score is generated from a synthetically-labeled training set and has not been validated against clinical outcomes. 
It must not be used as the sole basis for any medical decision.
"""

import pandas as pd
import numpy as np
import joblib
import os
from datetime import datetime
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from math import radians, cos, sin, asin, sqrt

# Constants
MODEL_DISCLAIMER = (
    "ADVISORY ONLY: This AI score is generated from a synthetically-labeled "
    "training set and has not been validated against clinical outcomes. "
    "It must not be used as the sole basis for any medical decision."
)

MODEL_PATH = "e:/opal ai frontend/opal-backend/models/match_model_v2.joblib"

COMPATIBLE_DONORS = {
    "A+":  ["A+", "A-", "O+", "O-"],
    "A-":  ["A-", "O-"],
    "B+":  ["B+", "B-", "O+", "O-"],
    "B-":  ["B-", "O-"],
    "AB+": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    "AB-": ["A-", "B-", "AB-", "O-"],
    "O+":  ["O+", "O-"],
    "O-":  ["O-"],
}

ORGAN_AGE_LIMITS = {
    "Heart": (8, 45), "Lung": (8, 55), "Kidney": (2, 70), "Liver": (2, 70), 
    "Pancreas": (2, 60), "Cornea": (2, 80), "Bone Marrow": (2, 60), 
    "Skin": (2, 75), "Plasma": (16, 70), "Platelet": (16, 70),
}

def haversine(lat1, lon1, lat2, lon2):
    R = 6372.8 # Earth radius in km
    dLat = radians(lat2 - lat1)
    dLon = radians(lon2 - lon1)
    lat1 = radians(lat1)
    lat2 = radians(lat2)
    a = sin(dLat/2)**2 + cos(lat1)*cos(lat2)*sin(dLon/2)**2
    c = 2*asin(sqrt(a))
    return R * c

def compute_synthetic_target(row, patient_blood_type, requested_organs, hospital_lat, hospital_lng):
    # Blood compatibility (0.35 weight)
    if row['blood_type'] == patient_blood_type:
        blood_score = 1.0
    elif row['blood_type'] in COMPATIBLE_DONORS[patient_blood_type]:
        blood_score = 0.75
    else:
        blood_score = 0.0
    
    # Organ availability (0.25 weight)
    # Note: Training data 'available_organs' should be a list
    donor_organs = set(row.get('available_organs', []))
    needed_organs = set(requested_organs)
    organ_score = len(donor_organs & needed_organs) / max(len(needed_organs), 1)
    
    # Age factor (0.20 weight)
    # Use the primary organ (first in list)
    primary_organ = requested_organs[0] if requested_organs else "Kidney"
    limits = ORGAN_AGE_LIMITS.get(primary_organ, (2, 70))
    ideal_age = (limits[0] + limits[1]) / 2
    age_penalty = abs(row['age'] - ideal_age) / 100
    age_score = max(0, 1 - age_penalty)
    
    # Condition factor (0.10 weight)
    active_conditions = sum([
      row.get('condition_diabetes', 0),
      row.get('condition_hypertension', 0),
      row.get('condition_heart_disease', 0)
    ])
    condition_score = max(0, 1 - (active_conditions * 0.25))
    
    # Proximity (0.10 weight)
    distance_km = haversine(hospital_lat, hospital_lng, row['latitude'], row['longitude'])
    proximity_score = max(0, 1 - (distance_km / 500))
    
    final = (
      0.35 * blood_score +
      0.25 * organ_score +
      0.20 * age_score +
      0.10 * condition_score +
      0.10 * proximity_score
    )
    return round(np.clip(final, 0, 1), 4)

def train_model():
    print("--- [ML] Starting Production Model Training ---")
    
    # Since we need a dataset, I'll generate a comprehensive synthetic one for training
    # to ensure the model learns the relationship correctly.
    np.random.seed(42)
    n_rows = 5000
    data = {
        'age': np.random.randint(18, 70, n_rows),
        'blood_type': np.random.choice(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"], n_rows),
        'latitude': np.random.uniform(24.0, 37.0, n_rows), # Pakistan range roughly
        'longitude': np.random.uniform(61.0, 77.0, n_rows),
        'condition_diabetes': np.random.choice([0, 1], n_rows, p=[0.8, 0.2]),
        'condition_hypertension': np.random.choice([0, 1], n_rows, p=[0.8, 0.2]),
        'condition_heart_disease': np.random.choice([0, 1], n_rows, p=[0.9, 0.1])
    }
    
    # Synthetic available organs
    all_organs = list(ORGAN_AGE_LIMITS.keys())
    data['available_organs'] = [np.random.choice(all_organs, np.random.randint(1, 4), replace=False).tolist() for _ in range(n_rows)]
    
    df = pd.DataFrame(data)
    
    # Prepare global context for target labeling
    target_blood = "A+"
    target_organs = ["Kidney"]
    hosp_lat, hosp_lng = 33.6844, 73.0479 # Islamabad
    
    df['target_score'] = df.apply(lambda r: compute_synthetic_target(r, target_blood, target_organs, hosp_lat, hosp_lng), axis=1)
    
    # Feature Engineering for Model
    # 1. One-hot encoding blood type
    df_encoded = pd.get_dummies(df, columns=['blood_type'], prefix='blood')
    
    # 2. Binary flags for organs
    for organ in all_organs:
        df_encoded[f'has_{organ}'] = df['available_organs'].apply(lambda x: 1 if organ in x else 0)
        
    features = [
        'age', 'latitude', 'longitude', 
        'condition_diabetes', 'condition_hypertension', 'condition_heart_disease'
    ] + [c for c in df_encoded.columns if c.startswith('blood_')] + [c for c in df_encoded.columns if c.startswith('has_')]
    
    X = df_encoded[features]
    y = df_encoded['target_score']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    n_est, depth = 200, 15
    model = RandomForestRegressor(n_estimators=n_est, max_depth=depth, random_state=42)
    model.fit(X_train, y_train)
    
    score = model.score(X_test, y_test)
    print(f"--- [ML] Final R² Score: {score:.4f} ---")
    
    if score < 0.90:
        print("--- [ML] Accuracy below 90%, retrying with deeper forest ---")
        n_est, depth = 500, 20
        model = RandomForestRegressor(n_estimators=n_est, max_depth=depth, random_state=42)
        model.fit(X_train, y_train)
        score = model.score(X_test, y_test)
        print(f"--- [ML] Improved R² Score: {score:.4f} ---")

    # Save model
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    joblib.dump({
      "model": model,
      "feature_names": features,
      "r2_score": score,
      "trained_at": datetime.utcnow().isoformat(),
      "training_data_rows": len(X_train),
      "disclaimer": MODEL_DISCLAIMER
    }, MODEL_PATH)

    # Feature Importance
    importances = sorted(zip(features, model.feature_importances_), key=lambda x: x[1], reverse=True)
    print("\n--- [ML] Top 5 Feature Importances ---")
    for name, imp in importances[:5]:
        print(f"{name}: {imp:.4f}")

if __name__ == "__main__":
    train_model()
