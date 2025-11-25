# ==========================================================
# 🎓 Hierarchical College Predictor (User Rank Version)
# Predicts: institute_short → degree_short → program_name
# Inputs: quota, pool, category, user_rank
# ==========================================================

import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from xgboost import XGBClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import numpy as np
import joblib

# ------------------------------
# Load dataset
# ------------------------------
df = pd.read_csv("data.csv")
df = df.dropna(subset=['institute_short', 'degree_short', 'program_name'])

# ------------------------------
# Feature engineering
# ------------------------------
df['mid_rank'] = (df['opening_rank'] + df['closing_rank']) / 2
df['spread'] = (df['closing_rank'] - df['opening_rank']).clip(lower=0.0)

# We'll only use mid_rank and spread as numeric features
feature_cols = ['quota', 'pool', 'category', 'mid_rank', 'spread']

# ------------------------------
# Encode categorical features
# ------------------------------
categorical_cols = ['quota', 'pool', 'category']
label_encoders = {col: LabelEncoder().fit(df[col]) for col in categorical_cols}

for col in categorical_cols:
    df[col] = label_encoders[col].transform(df[col])

scaler = StandardScaler()
df[['mid_rank', 'spread']] = scaler.fit_transform(df[['mid_rank', 'spread']])

# ------------------------------
# Stage 1: Predict Institute
# ------------------------------
X1 = df[feature_cols]
y1 = df['institute_short']

le_institute = LabelEncoder()
y1_enc = le_institute.fit_transform(y1)

X1_train, X1_test, y1_train, y1_test = train_test_split(X1, y1_enc, test_size=0.2, random_state=42)

model_institute = RandomForestClassifier(random_state=42)
model_institute.fit(X1_train, y1_train)
print(f"Stage 1 - Institute Accuracy: {accuracy_score(y1_test, model_institute.predict(X1_test)):.3f}")

# Add predicted institute
df['pred_institute'] = le_institute.transform(df['institute_short'])

# ------------------------------
# Stage 2: Predict Degree
# ------------------------------
X2 = df[feature_cols + ['pred_institute']]
y2 = df['degree_short']

le_degree = LabelEncoder()
y2_enc = le_degree.fit_transform(y2)

X2_train, X2_test, y2_train, y2_test = train_test_split(X2, y2_enc, test_size=0.2, random_state=42)

model_degree = XGBClassifier(
    n_estimators=300, max_depth=8, learning_rate=0.1,
    subsample=0.8, colsample_bytree=0.8, random_state=42
)
model_degree.fit(X2_train, y2_train)
print(f"Stage 2 - Degree Accuracy: {accuracy_score(y2_test, model_degree.predict(X2_test)):.3f}")

# Add predicted degree
df['pred_degree'] = le_degree.transform(df['degree_short'])

# ------------------------------
# Stage 3: Predict Program
# ------------------------------
X3 = df[feature_cols + ['pred_institute', 'pred_degree']]
y3 = df['program_name']

le_program = LabelEncoder()
y3_enc = le_program.fit_transform(y3)

X3_train, X3_test, y3_train, y3_test = train_test_split(X3, y3_enc, test_size=0.2, random_state=42)

model_program = XGBClassifier(
    n_estimators=400, max_depth=10, learning_rate=0.1,
    subsample=0.8, colsample_bytree=0.8, random_state=42
)
model_program.fit(X3_train, y3_train)
print(f"Stage 3 - Program Accuracy: {accuracy_score(y3_test, model_program.predict(X3_test)):.3f}")

# ------------------------------
# Save models and encoders
# ------------------------------
joblib.dump(model_institute, "model_institute_xgb.pkl")
joblib.dump(model_degree, "model_degree_xgb.pkl")
joblib.dump(model_program, "model_program_xgb.pkl")

joblib.dump({
    'le_institute': le_institute,
    'le_degree': le_degree,
    'le_program': le_program,
    'feature_encoders': label_encoders,
    'scaler': scaler
}, "encoders.pkl")

print("\n✅ Models and encoders saved successfully!")

# ==========================================================
# 🧮 Inference Function (User enters their rank)
# ==========================================================

def predict_college_user(quota, pool, category, user_rank):
    # Encode inputs
    quota_e = label_encoders['quota'].transform([quota])[0]
    pool_e = label_encoders['pool'].transform([pool])[0]
    cat_e = label_encoders['category'].transform([category])[0]

    # Prepare numeric inputs
    avg_spread = df['spread'].mean()  # mean spread as approximation
    scaled_vals = scaler.transform([[user_rank, avg_spread]])[0]
    mid_scaled, spread_scaled = scaled_vals

    x_base = np.array([[quota_e, pool_e, cat_e, mid_scaled, spread_scaled]])

    # Stage 1: Institute
    inst_pred = model_institute.predict(x_base)[0]
    inst_name = le_institute.inverse_transform([inst_pred])[0]

    # Stage 2: Degree
    x2 = np.hstack([x_base, [[inst_pred]]])
    deg_pred = model_degree.predict(x2)[0]
    deg_name = le_degree.inverse_transform([deg_pred])[0]

    # Stage 3: Program
    x3 = np.hstack([x_base, [[inst_pred, deg_pred]]])
    prog_pred = model_program.predict(x3)[0]
    prog_name = le_program.inverse_transform([prog_pred])[0]

    return {
        'institute': inst_name,
        'degree': deg_name,
        'program': prog_name
    }

# ------------------------------
# Example: User Input Prediction
# ------------------------------
example = predict_college_user('AI', 'Gender-Neutral', 'GEN', 12000)
print("\n🔮 Predicted Choice:", example)