import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import torch
import torch.nn as nn
import shap
import numpy as np

app = FastAPI(title="Anomaly Detection ML Engine with XAI (SHAP)")

class AnomalyLSTM(nn.Module):
    def __init__(self, input_size, hidden_size=16, num_layers=1):
        super(AnomalyLSTM, self).__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_size, 1)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        out, _ = self.lstm(x)
        out = out[:, -1, :]
        out = self.fc(out)
        return self.sigmoid(out)

input_feature_size = 5
feature_names = ["login_time_deviation", "duration_deviation", "is_new_ip", "is_new_location", "is_new_resource"]

model = AnomalyLSTM(input_size=input_feature_size)
model.eval()

# SHAP Explainer Initialization
# For DeepExplainer, we need a background dataset. We create a dummy background of zeros.
background_data = torch.zeros((10, 1, input_feature_size))
explainer = shap.DeepExplainer(model, background_data)

class FeaturePayload(BaseModel):
    login_time_deviation: float 
    duration_deviation: float   
    is_new_ip: float            
    is_new_location: float      
    is_new_resource: float      

class PredictionResponse(BaseModel):
    is_anomaly: bool
    risk_score: float
    confidence: float
    attack_classification: str
    top_contributing_features: dict
    human_readable_explanation: str

@app.post("/predict", response_model=PredictionResponse)
def predict(payload: FeaturePayload):
    try:
        features = torch.tensor([
            payload.login_time_deviation,
            payload.duration_deviation,
            payload.is_new_ip,
            payload.is_new_location,
            payload.is_new_resource
        ], dtype=torch.float32)
        
        x = features.unsqueeze(0).unsqueeze(0)
        
        with torch.no_grad():
            score_tensor = model(x)
            risk_score_raw = score_tensor.item()
            
        # Blend LSTM mock output with heuristic for demonstrable results
        heuristic_score = 0
        if payload.is_new_location == 1.0: heuristic_score += 0.4
        if payload.is_new_ip == 1.0: heuristic_score += 0.2
        if payload.login_time_deviation > 3.0: heuristic_score += 0.2
        if payload.is_new_resource == 1.0: heuristic_score += 0.15
        
        final_score = min(risk_score_raw * 0.1 + heuristic_score, 0.99)
        risk_percentage = final_score * 100
        is_anomaly = risk_percentage > 60.0
        
        classification = "Normal"
        if is_anomaly:
            if payload.is_new_location == 1.0 and payload.login_time_deviation > 1.0:
                classification = "Impossible Travel"
            elif payload.is_new_resource == 1.0:
                classification = "Lateral Movement"
            else:
                classification = "Suspicious Behaviour"
                
        # --- Explainable AI (SHAP) Calculation ---
        # Compute exact SHAP values for this prediction
        shap_values = explainer.shap_values(x)
        # shap_values is a list, taking the first element for our single output, and squeezing batch/seq dims
        event_shap_values = np.array(shap_values).squeeze()
        
        # Determine top features based on SHAP magnitude
        contrib = {}
        for i, val in enumerate(event_shap_values):
            if abs(val) > 0.01:  # Threshold for significance
                contrib[feature_names[i]] = float(val)
                
        # Generate Human Readable Explanation based on top SHAP contributors
        explanation_parts = []
        if contrib.get("is_new_location", 0) > 0:
            explanation_parts.append("login originated from an unseen location")
        if contrib.get("is_new_ip", 0) > 0:
            explanation_parts.append("used a novel IP address")
        if contrib.get("login_time_deviation", 0) > 0:
            explanation_parts.append(f"login time deviated heavily ({payload.login_time_deviation:.1f} hours from baseline)")
        if contrib.get("is_new_resource", 0) > 0:
            explanation_parts.append("accessed a restricted resource for the first time")
            
        if is_anomaly:
            human_explanation = f"Flagged as {classification} because " + " and ".join(explanation_parts) + "."
        else:
            human_explanation = "Session appears normal matching established baseline patterns."
            
        return PredictionResponse(
            is_anomaly=is_anomaly,
            risk_score=round(risk_percentage, 2),
            confidence=round(max(final_score, 1 - final_score) * 100, 2),
            attack_classification=classification,
            top_contributing_features=contrib,
            human_readable_explanation=human_explanation
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
