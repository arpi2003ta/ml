# ==========================================================
# 🚀 FastAPI App — Hierarchical College Predictor API
# ==========================================================

from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import numpy as np

# ------------------------------
# Load models and encoders
# ------------------------------
model_institute = joblib.load("model_institute_xgb.pkl")
model_degree = joblib.load("model_degree_xgb.pkl")
model_program = joblib.load("model_program_xgb.pkl")

encoders = joblib.load("encoders.pkl")
label_encoders = encoders['feature_encoders']
scaler = encoders['scaler']
le_institute = encoders['le_institute']
le_degree = encoders['le_degree']
le_program = encoders['le_program']

# ------------------------------
# FastAPI initialization
# ------------------------------
app = FastAPI(
    title="🎓 Hierarchical College Predictor API",
    description="Predicts Institute → Degree → Program based on user's rank and category.",
    version="1.0.0"
)

# ------------------------------
# Input schema
# ------------------------------
class UserInput(BaseModel):
    quota: str
    pool: str
    category: str
    user_rank: float

# ------------------------------
# Prediction function
# ------------------------------
def predict_college_user(quota, pool, category, user_rank):
    # Encode inputs
    quota_e = label_encoders['quota'].transform([quota])[0]
    pool_e = label_encoders['pool'].transform([pool])[0]
    cat_e = label_encoders['category'].transform([category])[0]

    # Approximation for spread (mean value from training)
    avg_spread = 0.0  # you can store the mean during training if preferred
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
        "institute": inst_name,
        "degree": deg_name,
        "program": prog_name
    }

# ------------------------------
# API Routes
# ------------------------------
@app.get("/")
def home():
    return {"message": "Welcome to the Hierarchical College Predictor API 🎓"}

@app.post("/predict")
def predict(input_data: UserInput):
    result = predict_college_user(
        quota=input_data.quota,
        pool=input_data.pool,
        category=input_data.category,
        user_rank=input_data.user_rank
    )
    return {"prediction": result}

# ------------------------------
# Run: uvicorn main:app --reload
# ------------------------------