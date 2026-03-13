import pandas as pd

# load dataset
df = pd.read_csv("data/Dataset.csv")

# columns useful for sepsis prediction
cols = [
    "HR","O2Sat","Temp","SBP","MAP","DBP","Resp","EtCO2",
    "pH","PaCO2","SaO2","HCO3","BaseExcess",
    "WBC","Platelets","Hgb","Hct","Creatinine","BUN","Lactate","Glucose",
    "Potassium","Calcium","Magnesium","Phosphate","Chloride",
    "AST","Alkalinephos","Bilirubin_total","Bilirubin_direct",
    "PTT","Fibrinogen",
    "Age","Gender","ICULOS","SepsisLabel"
]

# keep only columns that exist
cols = [c for c in cols if c in df.columns]

filtered = df[cols]

# save new CSV
filtered.to_csv("data/sepsis_relevant_columns.csv", index=False)

print("Saved as data/sepsis_relevant_columns.csv")
