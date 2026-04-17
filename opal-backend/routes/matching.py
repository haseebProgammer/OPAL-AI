import time
import os
import pandas as pd
import joblib
import numpy as np
from pathlib import Path
from typing import List, Literal, Optional, Dict
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from core.config import settings
from services.supabase_client import get_supabase
from services.compatibility_engine import filter_compatible_donors, MODEL_DISCLAIMER, FilterStats
from services.explanation_service import get_explanation_service

router = APIRouter(prefix="/api/match", tags=["Clinical Matching"])

# --- Models ---
class HospitalMatchRequest(BaseModel):
    hospital_id: str
    required_organs: List[str]
    patient_blood_type: Literal["A+","A-","B+","B-","AB+","AB-","O+","O-"]
    urgency_level: Literal["low", "medium", "critical"] = "medium"
    donor_type: Literal["blood", "organ"] = "organ"
    max_results: int = Field(default=10, ge=1, le=50)

class ScoreBreakdown(BaseModel):
    hla_compatibility: float
    waitlist_priority: float
    urgency_weight: float
    cit_viability: float

class MatchResult(BaseModel):
    donor_id: str
    name: str
    blood_type: str
    available_organs: List[str]
    distance_km: float
    ai_score: float
    score_breakdown: ScoreBreakdown
    ai_explanation: str
    explanation_source: str

class MatchResponse(BaseModel):
    advisory_notice: str = MODEL_DISCLAIMER
    matches: List[MatchResult]
    filter_stats: Dict[str, int]

# --- ML Model Internal ---
_model_cache = None

def get_model():
    global _model_cache
    if _model_cache is None:
        model_path = Path("opal-backend/models/match_ranker_v1.joblib")
        if not model_path.exists():
            # Fallback for relative paths in different execution contexts
            model_path = Path("models/match_ranker_v1.joblib")

        if not model_path.exists():
            raise RuntimeError("Advanced Match Ranker not found. Please run 'python ml/train_model.py' first.")
        
        print(f"[ML] Loading Clinical Ranker (XGBRanker) from {model_path}")
        _model_cache = joblib.load(model_path)
    return _model_cache

def predict_rank_score(donor_record: dict, request_data: dict, model_data: dict) -> float:
    """
    Maps donor/request to features for the XGBRanker.
    """
    model = model_data["model"]
    features = model_data["features"]
    
    # 2. Build feature vector (Production mapping)
    feat_dict = {f: 0 for f in features}
    feat_dict['age'] = donor_record.get('age', 30)
    feat_dict['hla_match_points'] = donor_record.get('hla_points', 3)
    feat_dict['wait_time_days'] = donor_record.get('wait_time_days', 100)
    feat_dict['distance_km'] = donor_record.get('distance_km', 50)
    feat_dict['is_diabetic'] = 1 if donor_record.get('diabetic_status') else 0
    feat_dict['is_hypertensive'] = 1 if donor_record.get('hypertension') else 0
    feat_dict['heart_disease'] = 1 if donor_record.get('heart_disease') else 0
    
    # One-hot blood
    bt_feat = f"blood_{donor_record.get('blood_type')}"
    if bt_feat in feat_dict: feat_dict[bt_feat] = 1
    
    # One-hot urgency
    urg_feat = f"urgency_{request_data.get('urgency_level')}"
    if urg_feat in feat_dict: feat_dict[urg_feat] = 1
    
    X = pd.DataFrame([feat_dict])[features]
    score = model.predict(X)[0]
    return float(score)

# --- Router ---
@router.post("/find", response_model=MatchResponse)
async def find_matches(request: HospitalMatchRequest):
    supabase = get_supabase()
    
    # 1. Fetch Hospital Location
    hosp_res = supabase.table("hospitals").select("*").eq("user_id", request.hospital_id).execute()
    if not hosp_res.data:
        hosp_res = supabase.table("hospitals").select("*").limit(1).execute()
        if not hosp_res.data:
            raise HTTPException(status_code=404, detail="Hospital data sync failed")
    
    hosp = hosp_res.data[0]
    h_lat, h_lng = hosp.get('latitude', 33.6844), hosp.get('longitude', 73.0479)

    # 2. Fetch Available Donors from Unified Production Table
    try:
        # Query the unified table with verified status and availability
        query = supabase.table("donors").select("*") \
            .eq("is_available", True) \
            .eq("approval_status", "verified") \
            .eq("donor_type", request.donor_type)
        
        # Surgical Filter: Only fetch requested organs if organ mode
        if request.donor_type == "organ" and request.required_organs:
            # Matches any organ in required list using Supabase filter syntax
            # Assuming organs_available is JSONB
            # We filter for donors who HAVE the required organs
            pass # Compatibility engine below does the heavy lifting
            
        donors_res = query.execute()
        raw_donors = donors_res.data
    except Exception as e:
        print(f"[SQL ERROR] Surgical fetch failed: {e}")
        raw_donors = []

    # 3. Clinical Compatibility Filter (CIT + Age + Blood)
    comp_donors, stats = filter_compatible_donors(
        raw_donors, 
        request.required_organs, 
        request.patient_blood_type,
        h_lat, h_lng
    )
    
    if not comp_donors:
        return MatchResponse(
            matches=[],
            filter_stats={
                "total_donors_checked": len(raw_donors),
                "failed_blood_type": stats.failed_blood,
                "failed_age_window": stats.failed_age,
                "failed_cit_viability": stats.failed_cit,
                "passed_clinical_filters": 0
            }
        )

    # 4. ML Ranking
    model_data = get_model()
    
    results = []
    for donor in comp_donors:
        # Predict ranking score using LambdaMART model
        score = predict_rank_score(donor, request.dict(), model_data)
        
        # Build clinical breakdown for transparency
        results.append({
            "donor": donor,
            "score": score,
            "breakdown": ScoreBreakdown(
                hla_compatibility=donor.get('hla_points', 3.0) / 6.0, # Visual proxy
                waitlist_priority=min(1.0, donor.get('wait_time_days', 0) / 730),
                urgency_weight=1.0 if request.urgency_level == "critical" else 0.5,
                cit_viability=1.0 - (donor.get('estimated_travel_time', 0) / 12.0)
            )
        })

    # Sort by XGBoost Rank Score
    results.sort(key=lambda x: x['score'], reverse=True)
    top_results = results[:request.max_results]

    # 5. Hybrid Explanations (Top 3)
    exp_service = get_explanation_service()
    final_matches = []
    
    for i, res in enumerate(top_results):
        donor = res['donor']
        explanation, source = "Audit log only.", "internal"
        
        if i < 3:
            explanation, source = await exp_service.explain_match(
                rank=i+1,
                total_compatible=len(comp_donors),
                donor_data=donor,
                request_data=request.dict(),
                score_breakdown=res['breakdown'].dict()
            )

        final_matches.append(MatchResult(
            donor_id=donor['id'],
            name=donor['full_name'],
            blood_type=donor['blood_type'],
            available_organs=donor['organs_available'],
            distance_km=donor['distance_km'],
            ai_score=res['score'],
            score_breakdown=res['breakdown'],
            ai_explanation=explanation,
            explanation_source=source
        ))

    return MatchResponse(
        matches=final_matches,
        filter_stats={
            "total_donors_checked": len(raw_donors),
            "failed_blood_type": stats.failed_blood,
            "failed_age_window": stats.failed_age,
            "failed_cit_viability": stats.failed_cit,
            "passed_clinical_filters": stats.passed
        }
    )
