"""
WakeStop ML Model Training Script
Feature: Intelligent Battery-Aware Alert Prediction
Dataset: battery_risk_dataset.csv
"""

import pandas as pd
import numpy as np
import json
import os
import sys
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix

# Ensure UTF-8 output encoding for Windows terminal
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

def train_battery_model():
    dataset_path = os.path.join(os.path.dirname(__file__), "battery_risk_dataset.csv")
    if not os.path.exists(dataset_path):
        print(f"❌ Error: Dataset file not found at {dataset_path}")
        return

    print("📊 1. Loading Battery Risk Telemetry Dataset...")
    df = pd.read_csv(dataset_path)
    print(f"   Dataset loaded successfully with {len(df)} rows and {len(df.columns)} columns.\n")

    feature_cols = [
        "battery_pct",
        "drain_rate_pct_min",
        "screen_on",
        "gps_active",
        "charging",
        "eta_minutes",
        "historical_drain_rate"
    ]
    target_col = "risk_level"

    X = df[feature_cols]
    y = df[target_col]

    # Train / Test Split (80% Train, 20% Test)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    print("🤖 2. Training Candidate Battery Risk Classifier Models...")
    models = {
        "RandomForestClassifier": RandomForestClassifier(n_estimators=100, max_depth=6, random_state=42),
        "GradientBoostingClassifier": GradientBoostingClassifier(n_estimators=100, learning_rate=0.1, random_state=42),
        "DecisionTreeClassifier": DecisionTreeClassifier(max_depth=5, random_state=42)
    }

    best_model = None
    best_name = ""
    best_acc = -1.0

    results = {}
    for name, model in models.items():
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)

        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred, average="weighted")
        rec = recall_score(y_test, y_pred, average="weighted")
        f1 = f1_score(y_test, y_pred, average="weighted")

        results[name] = {
            "accuracy": float(acc),
            "precision": float(prec),
            "recall": float(rec),
            "f1_score": float(f1)
        }
        print(f"   • {name:28s} -> Acc: {acc*100:.2f}% | F1: {f1:.4f} | Prec: {prec:.4f} | Rec: {rec:.4f}")

        if acc > best_acc:
            best_acc = acc
            best_model = model
            best_name = name

    print(f"\n🏆 Best Classifier Selected: {best_name} (Accuracy = {best_acc*100:.2f}%)\n")

    # Train best model on full dataset for export
    best_model.fit(X, y)

    # Feature Importance Breakdown
    feature_importances = {}
    if hasattr(best_model, "feature_importances_"):
        print("📈 3. Feature Importance Breakdown:")
        importances = best_model.feature_importances_
        for col, imp in sorted(zip(feature_cols, importances), key=lambda x: x[1], reverse=True):
            feature_importances[col] = float(imp)
            print(f"   - {col:30s}: {imp * 100:5.2f}% impact")

    # Export Model Payload for Frontend Execution
    print("\n💾 4. Exporting Trained Battery ML Model to Frontend...")
    
    # Class labels
    class_map = {0: "Safe", 1: "Warning", 2: "Critical"}

    export_payload = {
        "model_name": best_name,
        "dataset_rows": len(df),
        "target_classes": class_map,
        "metrics": results[best_name],
        "feature_importances": feature_importances,
        "critical_thresholds": {
            "critical_battery_pct": 10,
            "critical_runtime_margin_mins": 5,
            "warning_runtime_margin_mins": 15
        },
        "sample_evaluations": []
    }

    # Add sample evaluations
    for idx in range(min(5, len(X_test))):
        sample_x = X_test.iloc[[idx]]
        pred_class = int(best_model.predict(sample_x)[0])
        actual_class = int(y_test.iloc[idx])
        
        battery_pct = float(sample_x["battery_pct"].values[0])
        drain_rate = float(sample_x["drain_rate_pct_min"].values[0])
        eta_mins = float(sample_x["eta_minutes"].values[0])
        
        est_runtime_mins = round(battery_pct / max(drain_rate, 0.05), 1)

        export_payload["sample_evaluations"].append({
            "features": sample_x.to_dict(orient="records")[0],
            "actual_risk": class_map[actual_class],
            "predicted_risk": class_map[pred_class],
            "est_phone_runtime_mins": est_runtime_mins,
            "eta_mins": eta_mins
        })

    # Save to frontend/src/utils/mlBatteryModel.json
    output_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "src", "utils")
    os.makedirs(output_dir, exist_ok=True)
    json_path = os.path.join(output_dir, "mlBatteryModel.json")

    with open(json_path, "w") as f:
        json.dump(export_payload, f, indent=2)

    print(f"✅ ML Battery Model exported to: {json_path}")

if __name__ == "__main__":
    train_battery_model()
