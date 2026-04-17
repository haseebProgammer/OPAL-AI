// ============================================================
// OPAL-AI Type Definitions (Standardized & Repaired)
// ============================================================

export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type OrganType = 'Kidney' | 'Liver' | 'Heart' | 'Lung' | 'Pancreas' | 'Cornea' | string;
export type UrgencyLevel = 'Emergency' | 'Urgent' | 'Routine';
export type MatchStatus = 'pending' | 'approved' | 'completed' | 'rejected';
export type CompatibilityLevel = 'full' | 'compatible' | 'incompatible';
export type RequestType = 'blood' | 'organ';
export type UserRole = 'donor' | 'hospital' | 'doctor' | 'admin';
export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'flagged';

// ---------- Supabase DB Row Types ----------

/** Profile table in Supabase */
export interface ProfileRow {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  created_at: string;
}

/** Standalone blood_donors table row */
export interface BloodDonorRow {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  age: number | null;
  gender: string | null;
  blood_type: string;
  cnic: string | null;
  hepatitis_status: string | null;
  medical_conditions: string | null;
  city: string;
  latitude: number | null;
  longitude: number | null;
  is_available: boolean;
  approval_status: VerificationStatus;
  created_at: string;
}

/** Standalone organ_donors table row */
export interface OrganDonorRow {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  age: number | null;
  gender: string | null;
  blood_type: string;
  cnic: string | null;
  organs_available: string[] | string | null; // JSONB can be parsed as array or string
  hiv_status: string | null;
  hepatitis_status: string | null;
  diabetes: boolean;
  smoker: boolean;
  heart_disease: boolean;
  hypertension: boolean;
  height_cm: number | null;
  weight_kg: number | null;
  is_living_donor: boolean;
  next_of_kin_name: string | null;
  next_of_kin_contact: string | null;
  consent_given: boolean;
  medical_report_url: string | null;
  city: string;
  latitude: number | null;
  longitude: number | null;
  is_available: boolean;
  approval_status: VerificationStatus;
  created_at: string;
}

/** Standardized Hospital table row */
export interface HospitalRow {
  id: string;
  user_id: string | null;
  name: string; // Standardized from hospital_name
  license_number: string | null;
  city: string;
  full_address: string | null;
  phone: string | null;
  contact_email: string | null;
  latitude: number | null;
  longitude: number | null;
  is_verified: boolean;
  created_at: string;
}

/** Organ/Blood Request Table row */
export interface OrganRequestRow {
  id: string;
  hospital_id: string;
  patient_name: string | null;
  patient_blood_type: string;
  required_organs: string[] | string;
  urgency_level: UrgencyLevel;
  status: string;
  created_at: string;
}

/** Database Results for Match operations */
export interface MatchResultRow {
  id: string;
  donor_id: string;
  recipient_id: string | null;
  hospital_id: string | null;
  match_score: number;
  compatibility: string | null;
  distance_km: number | null;
  status: string;
  urgency: string | null;
  created_at: string;
}

// ---------- Unified Application Models (Used in Frontend) ----------

/** UI Model for a Donor (Unified view of Blood/Organ) */
export interface Donor {
  id: string;
  user_id: string | null;
  full_name: string;
  age: number;
  gender: string;
  blood_type: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  is_available: boolean;
  cnic: string;
  donor_type: 'blood' | 'organ' | 'both';
  donating_items?: string;
  verification_status: VerificationStatus;
  
  // Optional clinical metadata
  clinical?: {
    organs?: string[];
    hiv?: string;
    hep?: string;
    diabetes?: boolean;
    smoker?: boolean;
    heart?: boolean;
    hypertension?: boolean;
    kin_contact?: string;
  };
  
  created_at: string;
}

export interface Hospital {
  id: string;
  name: string;
  license_number: string;
  city: string;
  contact_email: string;
  latitude: number | null;
  longitude: number | null;
  is_verified: boolean;
  created_at: string;
}

export interface Match {
  id: string;
  donor_id: string;
  donor_name: string;
  match_score: number;
  compatibility: CompatibilityLevel;
  distance_km: number;
  status: string;
  urgency: string;
  blood_type: string;
  hospital_name: string;
  created_at: string;
}

export interface GlobalStats {
  totalDonors: number;
  totalHospitals: number;
  livesSaved: number;
  citiesCovered: number;
}

export interface DonorRequestFormData {
  request_type: RequestType;
  blood_type?: string;
  organ_type?: string;
  urgency: UrgencyLevel;
  city: string;
}
