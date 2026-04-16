from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class DonorRecord(BaseModel):
    id: Optional[str] = None
    full_name: Optional[str] = None
    age: int
    gender: Optional[str] = "Unknown"
    blood_type: str
    organs_available: List[str] = []
    diabetes: bool = False
    hypertension: bool = False
    heart_disease: bool = False
    
    # Allow extra fields for flexibility
    class Config:
        extra = "allow"

class MatchRequest(BaseModel):
    donor_record: DonorRecord

class BatchMatchRequest(BaseModel):
    donors: List[DonorRecord]
    hospital_id: Optional[str] = None

class MatchResponse(BaseModel):
    score: float
    donor_id: Optional[str] = None
    full_name: Optional[str] = None

class BatchMatchResponse(BaseModel):
    results: List[MatchResponse]
