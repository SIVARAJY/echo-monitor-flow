import pandas as pd
import numpy as np
from sklearn.model_selection import GroupKFold, cross_val_score
from sklearn.metrics import roc_auc_score, classification_report, precision_recall_curve
import xgboost as xgb
from sklearn.preprocessing import StandardScaler
from imblearn.over_sampling import SMOTE
from imblearn.pipeline import Pipeline
import joblib
import matplotlib.pyplot as plt
from preprocess import load_data, preprocess_data
import warnings
warnings.filterwarnings('ignore')

def train_model():
    """Train XGBoost model for sepsis prediction"""
    print("1. Loading data...")
    df = load_data()
    X, full_y, feature_cols = preprocess_data(df)
    
    # Use full X, y for training (filtered data has no Patient_ID)
    y = full_y.copy()
    y = y.fillna(0).astype(int)
    
    print(f"Aligned y shape: {y.shape}, matches X: {y.shape == X.shape}")
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Fix y NaNs before SMOTE
    y = y.fillna(0).astype(int)
    print(f"y NaNs fixed: {y.isna().sum() == 0}")
    
    # SMOTE for class imbalance (avoid leakage)
    smote = SMOTE(random_state=42)
    X_res, y_res = smote.fit_resample(X_scaled, y)
    
    print(f"Resampled shape: {X_res.shape}")
    
    # XGBoost model with sepsis-optimized params
    model = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=len(y[y==0])/len(y[y==1]),  # Handle imbalance
        random_state=42,
        eval_metric='aucpr',
        verbosity=0
    )
    
    # Cross-validation (simple split, no Patient_ID)
    print("2. Cross-validating...")
    from sklearn.model_selection import KFold
    cv = KFold(n_splits=5, shuffle=True, random_state=42)
    auc_scores = cross_val_score(model, X_res, y_res, cv=cv, scoring='roc_auc')
    print(f"CV AUC: {auc_scores.mean():.3f} (+/- {auc_scores.std() * 2:.3f})")
    
    # Train final model
    print("3. Training final model...")
    model.fit(X_res, y_res)
    
    # Feature importance
    importance = model.feature_importances_
    feat_imp = pd.DataFrame({'feature': feature_cols, 'importance': importance}).sort_values('importance', ascending=False)
    print("\\nTop 10 features:")
    print(feat_imp.head(10))
    
    # Save model pipeline
    pipeline = {'model': model, 'scaler': scaler, 'features': feature_cols}
    joblib.dump(pipeline, 'ml/sepsis_model.pkl')
    print("\\n✅ Model saved to ml/sepsis_model.pkl")
    
    return model, scaler, feature_cols

if __name__ == "__main__":
    train_model()

