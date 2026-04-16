import hashlib
import json
import time
from typing import Optional, Dict
import google.generativeai as genai
from core.config import settings

MODEL_DISCLAIMER = (
    "ADVISORY ONLY: This AI score is generated from a synthetically-labeled "
    "training set and has not been validated against clinical outcomes. "
    "It must not be used as the sole basis for any medical decision."
)

class ExplanationService:
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel('gemini-1.5-flash')
        self._cache: Dict[str, Dict] = {}
        
    def _get_cache_key(self, donor_id: str, patient_blood_type: str, required_organs: list[str]) -> str:
        raw = f"{donor_id}:{patient_blood_type}:{sorted(required_organs)}"
        return hashlib.sha256(raw.encode()).hexdigest()

    async def explain_match(
        self,
        rank: int,
        total_compatible: int,
        donor_data: dict,
        request_data: dict,
        score_breakdown: dict
    ) -> tuple[str, str]:
        """
        Generates a clinical explanation for a match using Gemini with caching.
        """
        cache_key = self._get_cache_key(
            donor_data['id'], 
            request_data['patient_blood_type'], 
            request_data['required_organs']
        )
        
        # Check cache (TTL 300s)
        if cache_key in self._cache:
            cached = self._cache[cache_key]
            if time.time() - cached['timestamp'] < 300:
                print(f"[CACHE] Returning cached explanation for {donor_data['id']}")
                return cached['explanation'], "gemini"

        system_prompt = (
            "You are a clinical matching assistant for a hospital coordinator dashboard. "
            "Be factual, concise, and clinical. Never speculate beyond the data. "
            "Never use the words 'perfect', 'ideal', or 'best'."
        )

        user_prompt = f"""
        A donor has been ranked #{rank} out of {total_compatible} compatible donors for this request.

        Donor data:
        - Age: {donor_data['age']}, Blood type: {donor_data['blood_type']}
        - Available organs/components: {donor_data['available_organs']}
        - Active medical conditions: {donor_data.get('conditions', 'None recorded')}
        - Distance from hospital: {donor_data['distance_km']:.1f} km

        Hospital request:
        - Required: {request_data['required_organs']}
        - Patient blood type: {request_data['patient_blood_type']}

        Score breakdown:
        - Blood compatibility: {score_breakdown['blood_compatibility']:.0%}
        - Organ availability: {score_breakdown['organ_availability']:.0%}
        - Age factor: {score_breakdown['age_factor']:.0%}
        - Condition factor: {score_breakdown['condition_factor']:.0%}
        - Proximity: {score_breakdown['proximity']:.0%}

        In exactly 2-3 sentences, explain to the coordinator why this donor is ranked #{rank}. 
        Reference specific score factors. Do not recommend action.
        """

        fallback_msg = (
            "Explanation unavailable. Donor ranked based on blood compatibility, "
            "organ availability, age profile, and proximity score."
        )

        try:
            # 8s hard limit as per requirement
            response = self.model.generate_content(
                f"SYSTEM: {system_prompt}\nUSER: {user_prompt}",
                generation_config={"timeout": 8.0}
            )
            explanation = response.text.strip()
            
            # Store in cache
            self._cache[cache_key] = {
                "explanation": explanation,
                "timestamp": time.time()
            }
            return explanation, "gemini"
            
        except Exception as e:
            print(f"[EXPLANATION] Gemini Error (timeout or key): {e}")
            return fallback_msg, "fallback"

_explanation_service = None

def get_explanation_service():
    global _explanation_service
    if _explanation_service is None:
        _explanation_service = ExplanationService()
    return _explanation_service
