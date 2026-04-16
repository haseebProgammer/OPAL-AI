import pytest
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from services.ai_matching_service import get_ai_service
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_score_donor_logic():
    service = get_ai_service()
    
    # Valid record
    donor = {
        "age": 25,
        "gender": "Male",
        "blood_type": "O+",
        "organs_available": ["Kidney", "Liver"],
        "diabetes": False
    }
    score = service.score_donor(donor)
    assert 0 <= score <= 1
    print(f"Test Score (Full): {score}")

def test_score_donor_missing_fields():
    service = get_ai_service()
    
    # Missing fields - should not crash
    donor = {
        "age": 30,
        "blood_type": "A-"
    }
    score = service.score_donor(donor)
    assert 0 <= score <= 1
    print(f"Test Score (Partial): {score}")

def test_api_score_endpoint():
    payload = {
        "donor_record": {
            "age": 22,
            "gender": "Female",
            "blood_type": "B+",
            "organs_available": ["Heart"],
            "diabetes": False,
            "full_name": "Test User"
        }
    }
    response = client.post("/api/match/score", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "score" in data
    assert data["full_name"] == "Test User"
    print(f"API Score: {data['score']}")

if __name__ == "__main__":
    # Quick manual run
    test_score_donor_logic()
    test_score_donor_missing_fields()
    print("Tests passed!")
