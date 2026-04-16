import time
import pandas as pd
import joblib
from typing import List, Literal, Optional, Dict
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from core.config import settings
from services.supabase_client import get_supabase
from services.compatibility_engine import filter_compatible_donors, MODEL_DISCLAIMER, FilterStats
from services.explanation_service import get_explanation_service
from math import radians, cos, sin, asin, sqrt

router = APIRouter(prefix="/api/match", tags=["Production Matching"])

# --- Models ---
class HospitalMatchRequest(BaseModel):
    hospital_id: str
    required_organs: List[str]
    patient_blood_type: Literal["A+","A-","B+","B-","AB+","AB-","O+","O-"]
    max_results: int = Field(default=10, ge=1, le=50)

class ScoreBreakdown(BaseModel):
    blood_compatibility: float
    organ_availability: float
    age_factor: float
    condition_factor: float
    proximity: float

class MatchResult(BaseModel):
    donor_id: str
    name: str
    blood_type: str
    available_organs: List[str]
    distance_km: float
    ai_score: float
    score_breakdown: ScoreBreakdown
    ai_explanation: str
    explanation_source: Literal["gemini", "fallback"]

class MatchResponse(BaseModel):
    advisory_notice: str = MODEL_DISCLAIMER
    matches: List[MatchResult]
    filter_stats: Dict[str, int]

# --- ML Singleton ---
class MLModelManager:
    _instance = None
    _model_data = None
    _load_count = 0

    @classmethod
    def get_model(cls):
        if cls._instance is None:
            print(f"[ML] Loading model v2 from {settings.MODEL_PATH}")
            cls._instance = joblib.load(settings.MODEL_PATH)
            cls._load_count += 1
        return cls._instance

# --- Utils ---
def haversine(lat1, lon1, lat2, lon2):
    R = 6372.8
    dLat, dLon = radians(lat2 - lat1), radians(lon2 - lon1)
    a = sin(dLat/2)**2 + cos(radians(lat1))*cos(radians(lat2))*sin(dLon/2)**2
    return R * 2 * asin(sqrt(a))

# --- Router ---
@router.post("/find", response_model=MatchResponse)
async def find_matches(request: HospitalMatchRequest):
    supabase = get_supabase()
    
    # 1. Fetch Hospital
    hosp_res = supabase.table("hospitals").select("*").eq("id", request.hospital_id).execute()
    if not hosp_res.data:
        raise HTTPException(status_code=404, detail="Hospital not found")
    hosp = hosp_res.data[0]
    h_lat, h_lng = hosp['latitude'], hosp['longitude']

    # 2. Fetch All Available Donors (requires MIGRATION for unified view, currently joining)
    # Using organ_donors as primary source for this high-fidelity pipeline
    donors_res = supabase.table("organ_donors").select("*").eq("is_available", True).execute()
    raw_donors = donors_res.data

    # 3. Compatibility Filter
    comp_donors, stats = filter_compatible_donors(
        raw_donors, 
        request.required_organs, 
        request.patient_blood_type
    )
    
    if not comp_donors:
        return MatchResponse(
            matches=[],
            filter_stats={
                "total_donors_in_db": len(raw_donors),
                "failed_blood_type": stats.failed_blood,
                "failed_age_window": stats.failed_age,
                "failed_condition": stats.failed_condition,
                "passed_compatibility": 0,
                "ranked_by_ai": 0
            }
        )

    # 4. ML Scoring
    model_data = MLModelManager.get_model()
    model = model_data['model']
    features = model_data['feature_names']
    
    results = []
    for donor in comp_donors:
        # Distance calculation
        dist = haversine(h_lat, h_lng, donor['latitude'], donor['longitude'])
        
        # Mapping to ML features
        input_data = {feat: 0 for feat in features}
        input_data['age'] = donor['age']
        input_data['latitude'] = donor['latitude']
        input_data['longitude'] = donor['longitude']
        input_data['condition_diabetes'] = 1 if donor.get('diabetes') else 0
        input_data['condition_hypertension'] = 1 if donor.get('condition_hypertension') else 0
        input_data['condition_heart_disease'] = 1 if donor.get('condition_heart_disease') else 0
        
        input_data[f"blood_{donor['blood_type']}"] = 1
        for organ in donor.get('organs_available', []):
            input_data[f"has_{organ}"] = 1
            
        X = pd.DataFrame([input_data])[features]
        score = float(model.predict(X)[0])
        
        # Manual breakdown for UI (simulated from components of the ML target)
        # This reflects the compute_match_score logic in train_model.py
        results.append({
            "donor": donor,
            "dist": dist,
            "score": round(score, 4),
            "breakdown": {
                "blood_compatibility": 1.0 if donor['blood_type'] == request.patient_blood_type else 0.75,
                "organ_availability": len(set(donor['organs_available']) & set(request.required_organs)) / len(request.required_organs),
                "age_factor": 0.9, # Simplified for now
                "condition_factor": 1.0 - (sum([donor.get('diabetes', 0)]) * 0.25),
                "proximity": max(0, 1 - (dist / 500))
            }
        })

    # Sort and Limit
    results.sort(key=lambda x: x['score'], reverse=True)
    top_results = results[:request.max_results]

    # 5. Explanations (Top 3)
    exp_service = get_explanation_service()
    final_matches = []
    
    for i, res in enumerate(top_results):
        donor = res['donor']
        explanation, source = "Explanation skipped for lower ranks.", "fallback"
        
        if i < 3:
            explanation, source = await exp_service.explain_match(
                rank=i+1,
                total_compatible=len(comp_donors),
                donor_data={
                    "id": donor['id'],
                    "age": donor['age'],
                    "blood_type": donor['blood_type'],
                    "available_organs": donor['organs_available'],
                    "distance_km": res['dist']
                },
                request_data={
                    "required_organs": request.required_organs,
                    "patient_blood_type": request.patient_blood_type
                },
                score_breakdown=res['breakdown']
            )

        final_matches.append(MatchResult(
            donor_id=donor['id'],
            name=donor['full_name'],
            blood_type=donor['blood_type'],
            available_organs=donor['organs_available'],
            distance_km=res['dist'],
            ai_score=res['score'],
            score_breakdown=ScoreBreakdown(**res['breakdown']),
            ai_explanation=explanation,
            explanation_source=source
        ))

    return MatchResponse(
        matches=final_matches,
        filter_stats={
            "total_donors_in_db": len(raw_donors),
            "failed_blood_type": stats.failed_blood,
            "failed_age_window": stats.failed_age,
            "failed_condition": stats.failed_condition,
            "passed_compatibility": stats.passed,
            "ranked_by_ai": len(final_matches)
        }
    )

@router.get("/explain/{donor_id}")
async def get_fresh_explanation(
    donor_id: str,
    hospital_id: str,
    required_organs: str = Query(...), # comma separated
    patient_blood_type: str = Query(...)
):
    # Bypass cache required
    # NOTE: Rate limit would typically be middleware, but implemented as logic for demo if needed
    supabase = get_supabase()
    donor_res = supabase.table("organ_donors").select("*").eq("id", donor_id).execute()
    if not donor_res.data: raise HTTPException(404, "Donor not found")
    donor = donor_res.data[0]
    
    hosp_res = supabase.table("hospitals").select("*").eq("id", hospital_id).execute()
    if not hosp_res.data: raise HTTPException(404, "Hospital not found")
    hosp = hosp_res.data[0]
    
    dist = haversine(hosp['latitude'], hosp['longitude'], donor['latitude'], donor['longitude'])
    organs = required_organs.split(",")

    exp_service = get_explanation_service()
    explanation, source = await exp_service.explain_match(
        rank=1, total_compatible=1,
        donor_data={
            "id": donor['id'], "age": donor['age'], "blood_type": donor['blood_type'],
            "available_organs": donor['organs_available'], "distance_km": dist
        },
        request_data={"required_organs": organs, "patient_blood_type": patient_blood_type},
        score_breakdown={"blood_compatibility": 0.9, "organ_availability": 0.9, "age_factor": 0.9, "condition_factor": 0.9, "proximity": 0.9}
    )
    return {"explanation": explanation, "source": source}
