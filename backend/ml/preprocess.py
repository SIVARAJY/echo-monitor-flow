import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split, GroupShuffleSplit
import joblib

def load_data(file_path='d:/TN/off/echo-monitor-flow/data/sepsis_relevant_columns.csv'):
    """Load and sample dataset for training"""
    df = pd.read_csv(file_path)
    print(f"Loaded dataset: {df.shape}")
    print(f"Columns: {df.columns.tolist()}")
    if 'SepsisLabel' not in df.columns:
        raise ValueError("'SepsisLabel' missing from dataset")
    
# Sample 10% of data, keep all columns
    n_sample = min(50000, len(df[df['SepsisLabel'] == 1.0]) * 4)  # Balanced approx
    df_sample = df.groupby('SepsisLabel', group_keys=False).apply(lambda x: x.sample(frac=0.1, random_state=42)).reset_index(drop=True)
    print(f'Sample strategy changed due to pandas groupby.apply column drop issue')
    print(f"Sampled dataset: {df_sample.shape}")
    if 'SepsisLabel' in df_sample.columns:
        print(f"SepsisLabel dist: {df_sample['SepsisLabel'].value_counts()}")
    else:
        print("SepsisLabel column lost - using simple sample")
        df_sample = df.sample(n=60000, random_state=42).reset_index(drop=True)
    return df_sample

def preprocess_data(df):
    """Clean and prepare features for ML"""
    print(f"Input df shape: {df.shape}, columns: {df.columns.tolist()}")
    
    # Key features based on clinical importance for sepsis
    feature_cols = [col for col in [
        'HR', 'O2Sat', 'Temp', 'SBP', 'MAP', 'DBP', 'Resp', 'EtCO2', 'BaseExcess', 'HCO3', 
        'FiO2', 'pH', 'PaCO2', 'SaO2', 'AST', 'BUN', 'Calcium', 'Chloride', 'Creatinine', 
        'Glucose', 'Lactate', 'Magnesium', 'Phosphate', 'Potassium', 'Hct', 'Hgb', 'WBC', 
        'Platelets', 'Age', 'Gender'
    ] if col in df.columns]
    
    print(f"Using {len(feature_cols)} available features: {feature_cols}")
    
    # Ensure required columns exist
    required_cols = ['SepsisLabel'] + feature_cols
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        print(f"Warning: Missing columns: {missing_cols}")
    
    # Fill missing values: median (no Patient_ID/Hour in filtered data)
    df[feature_cols] = df[feature_cols].fillna(df[feature_cols].median())
    print(f"NaNs filled: all features ready")
    
    # Encode Gender (0/1)
    df['Gender'] = df['Gender'].map({'M': 0, 'F': 1}).fillna(0)
    
    # Target
    y = df['SepsisLabel'].copy()

    # Use all data for training (no Patient_ID)
    X = df[feature_cols].copy().fillna(0)
    
    print(f"Final X shape: {X.shape}, available features: {list(X.columns)}")
    print(f"y shape: {y.shape}, y dist: {y.value_counts()}")
    
    print(f"Final features shape: {X.shape}, target distribution:\\n{y.value_counts(normalize=True)}")
    return X, y, feature_cols

if __name__ == "__main__":
    df = load_data()
    X, y, features = preprocess_data(df)
    joblib.dump({'scaler': None, 'features': features}, 'ml/feature_info.pkl')
    print("Preprocessing complete")

