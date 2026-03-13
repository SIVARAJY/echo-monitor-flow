import pandas as pd
import numpy as np
import joblib
from preprocess import preprocess_data

def load_model():
    """Load trained sepsis model"""
    pipeline = joblib.load('ml/sepsis_model.pkl')
    return pipeline['model'], pipeline['scaler'], pipeline['features']

def predict_sepsis(vitals_data):
    """
    Predict sepsis probability from patient vitals
    vitals_data: dict with keys matching feature_cols
    """
    model, scaler, features = load_model()
    
    # Create DataFrame with correct feature order
    df = pd.DataFrame([vitals_data])
    X = df[features].fillna(0)
    X_scaled = scaler.transform(X)
    
    prob = model.predict_proba(X_scaled)[0, 1]
    prediction = model.predict(X_scaled)[0]
    
    risk_level = 'critical' if prob > 0.8 else 'high' if prob > 0.6 else 'medium' if prob > 0.3 else 'low'
    
    return {
        'probability': float(prob),
        'prediction': int(prediction),
        'risk_level': risk_level,
        'confidence': float(prob) if prediction == 1 else float(1-prob)
    }

if __name__ == "__main__":
    # Example usage
    sample_vitals = {
        'HR': 120, 'O2Sat': 92, 'Temp': 38.5, 'SBP': 90, 'MAP': 65, 'DBP': 50,
        'Resp': 25, 'EtCO2': 35, 'BaseExcess': -2, 'HCO3': 22, 'FiO2': 0.5, 'pH': 7.3,
        'PaCO2': 45, 'SaO2': 93, 'AST': 50, 'BUN': 25, 'Calcium': 9.0, 'Chloride': 100,
        'Creatinine': 1.5, 'Glucose': 140, 'Lactate': 3.5, 'Magnesium': 2.0, 'Phosphate': 3.5,
        'Potassium': 4.0, 'Hct': 35, 'Hgb': 11.5, 'WBC': 15, 'Platelets': 150, 'Age': 65, 'Gender': 0
    }
    
    result = predict_sepsis(sample_vitals)
    print("Sepsis Prediction:", result)

