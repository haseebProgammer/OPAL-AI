from typing import List, Dict, Tuple, Any
from pydantic import BaseModel

MODEL_DISCLAIMER = (
    "ADVISORY ONLY: This AI score is generated from a synthetically-labeled "
    "training set and has not been validated against clinical outcomes. "
    "It must not be used as the sole basis for any medical decision."
)

class FilterStats(BaseModel):
    total: int = 0
    failed_blood: int = 0
    failed_age: int = 0
    failed_condition: int = 0
    passed: int = 0

COMPATIBLE_DONORS = {
    "A+":  ["A+", "A-", "O+", "O-"],
    "A-":  ["A-", "O-"],
    "B+":  ["B+", "B-", "O+", "O-"],
    "B-":  ["B-", "O-"],
    "AB+": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    "AB-": ["A-", "B-", "AB-", "O-"],
    "O+":  ["O+", "O-"],
    "O-":  ["O-"],
}

ORGAN_AGE_LIMITS = {
    "Heart":      (8, 45),
    "Lung":       (8, 55),
    "Kidney":     (2, 70),
    "Liver":      (2, 70),
    "Pancreas":   (2, 60),
    "Cornea":     (2, 80),
    "Bone Marrow":(2, 60),
    "Skin":       (2, 75),
    "Plasma":     (16, 70),
    "Platelet":   (16, 70),
}

CONDITION_BLOCKS = {
    "Heart":    ["condition_heart_disease"],
    "Pancreas": ["condition_diabetes"],
    "Liver":    [],
    "Kidney":   [],
    "Lung":     [],
}

def filter_compatible_donors(
    donors: List[Dict[str, Any]],
    required_organs: List[str],
    patient_blood_type: str
) -> Tuple[List[Dict[str, Any]], FilterStats]:
    """
    Hard compatibility filter for donor-recipient matching.
    """
    stats = FilterStats(total=len(donors))
    compatible_donors = []

    for donor in donors:
        donor_id = donor.get('id', 'unknown')
        
        # 1. Blood Type Filter
        if donor.get('blood_type') not in COMPATIBLE_DONORS.get(patient_blood_type, []):
            print(f"[FILTER] Donor {donor_id} EXCLUDED: Incompatible blood type {donor.get('blood_type')} for patient {patient_blood_type}")
            stats.failed_blood += 1
            continue

        # 2. Age Filter (Check against ALL required organs)
        age_passed = True
        donor_age = donor.get('age', 0)
        for organ in required_organs:
            limits = ORGAN_AGE_LIMITS.get(organ)
            if limits:
                if not (limits[0] <= donor_age <= limits[1]):
                    print(f"[FILTER] Donor {donor_id} EXCLUDED: Age {donor_age} out of window for {organ} ({limits[0]}-{limits[1]})")
                    age_passed = False
                    break
        
        if not age_passed:
            stats.failed_age += 1
            continue

        # 3. Condition Disqualifications
        condition_passed = True
        for organ in required_organs:
            blocks = CONDITION_BLOCKS.get(organ, [])
            for condition in blocks:
                if donor.get(condition) is True:
                    print(f"[FILTER] Donor {donor_id} EXCLUDED: Condition {condition} disqualifies for {organ}")
                    condition_passed = False
                    break
            if not condition_passed:
                break
        
        if not condition_passed:
            stats.failed_condition += 1
            continue

        # All checks passed
        compatible_donors.append(donor)
        stats.passed += 1

    return compatible_donors, stats
