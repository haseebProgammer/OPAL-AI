import joblib
import numpy as np
import pandas as pd
import os
from typing import List, Dict, Any

class AIMatchingService:
    _instance = None
    _model = None
    
    # Feature schema exactly as defined in train_model.py
    FEATURES = [
        'age', 'gender_Male', 'Blood', 'Bone Marrow', 'Cornea', 'Heart', 
        'Kidney', 'Liver', 'Lung', 'Pancreas', 'Plasma', 'Platelet', 'Skin',
        'Condition_Diabetes', 'Condition_Hypertension', 'Condition_Heart_Disease',
        'blood_A+', 'blood_A-', 'blood_AB+', 'blood_AB-', 'blood_B+', 'blood_B-', 'blood_O+', 'blood_O-'
    ]
    
    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(AIMatchingService, cls).__new__(cls)
        return cls._instance

    def load_model(self, model_path: str = 'e:/opal ai frontend/opal-backend/models/match_model.joblib'):
        if self._model is None:
            if not os.path.exists(model_path):
                raise FileNotFoundError(f"Model file not found at {model_path}. Please run train_model.py first.")
            self._model = joblib.load(model_path)
            print(f"--- [AI SERVICE] Model loaded successfully from {model_path} ---")

    def score_donor(self, donor_record: Dict[str, Any]) -> float:
        """
        Maps a donor dictionary to the ML feature vector and returns a score.
        """
        if self._model is None:
            self.load_model()
            
        # Initialize feature vector with zeros
        features_dict = {feat: 0 for feat in self.FEATURES}
        
        # 1. Numerical Fields
        features_dict['age'] = donor_record.get('age', 0)
        
        # 2. Gender Mapping
        gender = str(donor_record.get('gender', '')).lower()
        if gender == 'male':
            features_dict['gender_Male'] = 1
            
        # 3. Organs/Items Mapping
        organs_available = donor_record.get('organs_available', [])
        # Ensure it's a list for processing
        if isinstance(organs_available, str):
            organs_available = [organs_available]
            
        organ_map = {
            'blood': 'Blood',
            'bone marrow': 'Bone Marrow',
            'bone_marrow': 'Bone Marrow',
            'cornea': 'Cornea',
            'corneas': 'Cornea',
            'heart': 'Heart',
            'kidney': 'Kidney',
            'liver': 'Liver',
            'lung': 'Lung',
            'lungs': 'Lung',
            'pancreas': 'Pancreas',
            'plasma': 'Plasma',
            'platelet': 'Platelet',
            'skin': 'Skin'
        }
        
        for organ in organs_available:
            normalized_organ = organ.lower().strip()
            if normalized_organ in organ_map:
                features_dict[organ_map[normalized_organ]] = 1
                
        # 4. Conditions Mapping
        if donor_record.get('diabetes') or donor_record.get('Condition_Diabetes'):
            features_dict['Condition_Diabetes'] = 1
        if donor_record.get('hypertension') or donor_record.get('Condition_Hypertension'):
            features_dict['Condition_Hypertension'] = 1
        if donor_record.get('heart_disease') or donor_record.get('Condition_Heart_Disease'):
            features_dict['Condition_Heart_Disease'] = 1
            
        # 5. Blood Type One-Hot Encoding
        blood_type = str(donor_record.get('blood_type', '')).upper().strip()
        blood_feat = f"blood_{blood_type}"
        if blood_feat in features_dict:
            features_dict[blood_feat] = 1
            
        # Convert to DataFrame to ensure column order matches training
        X = pd.DataFrame([features_dict])[self.FEATURES]
        
        # Predict
        try:
            score = self._model.predict(X)[0]
            return float(np.clip(score, 0, 1))
        except Exception as e:
            print(f"--- [AI SERVICE] Prediction Error: {e} ---")
            return 0.0

# Singleton helper
def get_ai_service():
    service = AIMatchingService()
    return service
