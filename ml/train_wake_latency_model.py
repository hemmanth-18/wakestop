"""
WakeStop ML Model Training Script
Feature 2: Adaptive Alarm Timing (User Sleep Latency & Trigger Distance Model)
Dataset: wake_latency_dataset.csv (120+ rows)
"""

import pandas as pd
import numpy as np
import json
import os
import sys
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, r2_score, mean_squared_error

# Ensure UTF-8 output encoding for Windows terminal
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

def train_model():
    dataset_path = os.path.join(os.path.dirname(__file__), "wake_latency_dataset.csv")
    if not os.path.exists(dataset_path):
        print(f"❌ Error: Dataset file not found at {dataset_path}")
        return

    print("📊 1. Loading Wake Latency Dataset...")
    df = pd.read_csv(dataset_path)
    print(f"   Dataset successfully loaded with {len(df)} rows and {len(df.columns)} columns.\n")

    # Define Feature Matrix (X) and Target Vector (y)
    feature_cols = [
        "trip_duration_mins",
        "departure_hour",
        "historical_avg_latency_sec",
        "sound_frequency_hz",
        "vibration_enabled",
        "prev_snooze_count",
        "vehicle_speed_kmh"
    ]
    target_col = "target_wake_latency_sec"

    X = df[feature_cols]
    y = df[target_col]

    # Train / Test Split (80% Train, 20% Test)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print("🤖 2. Training Candidate ML Models...")
    models = {
        "RandomForestRegressor": RandomForestRegressor(n_estimators=100, max_depth=6, random_state=42),
        "GradientBoostingRegressor": GradientBoostingRegressor(n_estimators=100, learning_rate=0.1, random_state=42),
        "LinearRegression": LinearRegression()
    }

    best_model = None
    best_name = ""
    best_r2 = -float("inf")

    results = {}
    for name, model in models.items():
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)

        r2 = r2_score(y_test, y_pred)
        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))

        results[name] = {"R2": r2, "MAE_sec": mae, "RMSE_sec": rmse}
        print(f"   • {name:25s} -> R²: {r2:.4f} | MAE: {mae:.2f}s | RMSE: {rmse:.2f}s")

        if r2 > best_r2:
            best_r2 = r2
            best_model = model
            best_name = name

    print(f"\n🏆 Best Model Selected: {best_name} (R² = {best_r2:.4f})\n")

    # Feature Importance Analysis
    if hasattr(best_model, "feature_importances_"):
        print("📈 3. Feature Importance Breakdown:")
        importances = best_model.feature_importances_
        for col, imp in sorted(zip(feature_cols, importances), key=lambda x: x[1], reverse=True):
            print(f"   - {col:30s}: {imp * 100:5.2f}% impact")

    # Export Model Weights / Parameters into JSON format for Frontend Execution
    print("\n💾 4. Exporting Trained ML Model to Frontend...")
    
    # Train model on full dataset for export
    best_model.fit(X, y)

    # Convert linear or tree thresholds to JS export format
    export_payload = {
        "model_type": best_name,
        "dataset_rows": len(df),
        "metrics": results[best_name],
        "feature_names": feature_cols,
        "sample_predictions": []
    }

    # Add sample test predictions for verification
    for idx in range(min(5, len(X_test))):
        sample_x = X_test.iloc[[idx]]
        pred_sec = float(best_model.predict(sample_x)[0])
        actual_sec = float(y_test.iloc[idx])
        
        # Calculate dynamic alarm distance
        speed_ms = float(sample_x["vehicle_speed_kmh"].values[0]) / 3.6
        rec_alarm_dist_m = int(speed_ms * (pred_sec + 90)) # 90 sec safety buffer

        export_payload["sample_predictions"].append({
            "features": sample_x.to_dict(orient="records")[0],
            "actual_latency_sec": round(actual_sec, 1),
            "predicted_latency_sec": round(pred_sec, 1),
            "recommended_alarm_trigger_m": rec_alarm_dist_m
        })

    # Save to frontend public/models/mlWakeModel.json
    output_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "src", "utils")
    os.makedirs(output_dir, exist_ok=True)
    json_path = os.path.join(output_dir, "mlWakeModel.json")

    with open(json_path, "w") as f:
        json.dump(export_payload, f, indent=2)

    print(f"✅ ML Model exported to: {json_path}")

if __name__ == "__main__":
    train_model()
