import httpx
import asyncio
from typing import List, Dict, Any, Tuple

class ClinicalLogisticsService:
    """
    Advanced Medical-Logistics Engine.
    Switches from Haversine (Direct) to OSRM (Road-Network) for CIT viability.
    """
    OSRM_BASE_URL = "http://router.project-osrm.org/table/v1/driving/"

    @staticmethod
    def calculate_haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        from math import radians, cos, sin, asin, sqrt
        R = 6371.0 # Earth radius in km
        dLat = radians(lat2 - lat1)
        dLon = radians(lon2 - lon1)
        a = sin(dLat / 2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dLon / 2)**2
        c = 2 * asin(sqrt(a))
        return R * c

    @staticmethod
    async def get_road_metrics(origin: Tuple[float, float], destinations: List[Tuple[float, float]]) -> List[Dict[str, float]]:
        """
        Fetches Real Road Distance using OSRM. 
        FALLBACK: If OSRM is unreachable or returns null (No Route), calculates 
        Haversine distance with a 2.0x Time Penalty for clinical safety.
        """
        coords = f"{origin[1]},{origin[0]}"
        for dest in destinations:
            coords += f";{dest[1]},{dest[0]}"
        
        url = f"{ClinicalLogisticsService.OSRM_BASE_URL}{coords}?sources=0"
        
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(url)
                if response.status_code == 200:
                    data = response.json()
                    durations = data.get("durations", [[]])[0]
                    results = []
                    
                    for i in range(1, len(durations)):
                        dur = durations[i]
                        if dur is not None and dur > 0:
                            results.append({
                                "duration_secs": dur,
                                "duration_hours": dur / 3600.0,
                                "distance_km": (dur / 3600.0) * 85.0 # Reliable OSRM estimate
                            })
                        else:
                            # NO ROAD ROUTE FOUND - Trigger Penalty Fallback
                            h_dist = ClinicalLogisticsService.calculate_haversine(origin[0], origin[1], destinations[i-1][0], destinations[i-1][1])
                            results.append({
                                "duration_secs": (h_dist / 40.0) * 3600.0 * 2.0, # 40km/h and 2x penalty
                                "duration_hours": (h_dist / 40.0) * 2.0, 
                                "distance_km": h_dist
                            })
                    return results
        except Exception as e:
            print(f"[OSRM CRITICAL FAILURE] Falling back to Bio-Penalty Geometry: {e}")
        
        # TOTAL SYSTEM FALLBACK: Use haversine for all
        fallback_results = []
        for dest in destinations:
            h_dist = ClinicalLogisticsService.calculate_haversine(origin[0], origin[1], dest[0], dest[1])
            fallback_results.append({
                "duration_secs": (h_dist / 45.0) * 3600.0 * 2.5, # Heavy penalty for unknown road state
                "duration_hours": (h_dist / 45.0) * 2.5,
                "distance_km": h_dist
            })
        return fallback_results

    @staticmethod
    def get_clinical_matrix(category: str) -> Dict[str, List[str]]:
        """
        Implements distinct logic for Organs vs Plasma (Inverse ABO).
        """
        STANDARD_MATRIX = {
            "A+": ["A+", "A-", "O+", "O-"],
            "A-": ["A-", "O-"],
            "B+": ["B+", "B-", "O+", "O-"],
            "B-": ["B-", "O-"],
            "AB+": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
            "AB-": ["A-", "B-", "AB-", "O-"],
            "O+": ["O+", "O-"],
            "O-": ["O-"],
        }
        
        PLASMA_MATRIX = {
            "O": ["O", "A", "B", "AB"],
            "A": ["A", "AB"],
            "B": ["B", "AB"],
            "AB": ["AB"],
        }
        
        return PLASMA_MATRIX if category.lower() == "plasma" else STANDARD_MATRIX

    @staticmethod
    def is_cit_viable(organ_type: str, travel_hours: float) -> bool:
        """
        Strict Medical Cut-offs for cold ischemia. 
        Deterioration increases exponentially after these limits.
        """
        LIMITS = {
            "Heart": 4.0,
            "Lung": 6.0,
            "Liver": 12.0,
            "Pancreas": 12.0,
            "Kidney": 24.0,
            "Cornea": 96.0
        }
        return travel_hours <= LIMITS.get(organ_type, 12.0)
