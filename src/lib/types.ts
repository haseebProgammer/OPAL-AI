// ============================================================
// OPAL-AI Type Definitions (Architectural Overhaul)
// ============================================================

export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type OrganType = 'Kidney' | 'Liver' | 'Heart' | 'Lung' | 'Pancreas' | 'Cornea' | string;
export type UrgencyLevel = 'Emergency' | 'Urgent' | 'Routine';
export type MatchStatus = 'pending' | 'approved' | 'completed' | 'rejected';
export type CompatibilityLevel = 'full' | 'compatible' | 'incompatible';
export type RequestType = 'blood' | 'organ';
export type UserRole = 'donor' | 'hospital' | 'doctor' | 'admin';
export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'flagged';

export interface DonorRequestFormData {
  request_type: RequestType;
  blood_type?: BloodType;
  organ_type?: OrganType;
  urgency: UrgencyLevel;
  city: string;
}

// ---------- Supabase DB Row Types ----------

/** Unified donors table */
export interface DonorRow {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  gender: string | null;
  contact_number: string | null;
  city: string;
  latitude: number | null;
  longitude: number | null;
  blood_type: string;
  is_blood_donor: boolean;
  is_organ_donor: boolean;
  donating_blood_items: string | null;
  donating_organs: string | null;
  cnic: string | null;
  status: string | null;
  created_at: string | null;
}

/** Separate blood_donors table */
export interface BloodDonorRow {
  id: string;
  user_id?: string | null;
  full_name: string;
  email: string;
  phone: string;
  age: number;
  blood_type: string;
  cnic: string;
  hepatitis_status: string;
  medical_conditions?: string | null;
  city: string;
  latitude: number | null;
  longitude: number | null;
  is_available: boolean;
  suspension_reason?: string | null;
  created_at?: string;
}

/** Separate organ_donors table */
export interface OrganDonorRow {
  id: string;
  user_id?: string | null;
  full_name: string;
  email: string;
  phone: string;
  age: number;
  blood_type: string;
  cnic: string;
  organs_available: string[] | string;
  hiv_status: string;
  hepatitis_status: string;
  diabetes: boolean;
  smoker: boolean;
  height_cm: number;
  weight_kg: number;
  // Organ Specific Medical Fields
  hiv_status: VerificationStatus;
  hepatitis_status: VerificationStatus;
  smoking_history: boolean;
  medical_report_url?: string;
  next_of_kin_contact: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  is_available: boolean;
  suspension_reason?: string | null;
  created_at?: string;
}

/** `medical_profiles` table */
export interface MedicalProfileRow {
  id: string;
  donor_id: string;
  hiv_status: string | null;
  hepatitis_status: string | null;
  is_diabetic: boolean;
  is_smoker: boolean;
  medications: string | null;
  medical_conditions: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  donor_status: string | null;
  next_of_kin_name: string | null;
  next_of_kin_contact: string | null;
  consent_signed: boolean;
  updated_at: string | null;
}

export interface RecipientRow {
  recipient_id: number;
  user_id: string | null;
  first_name: string;
  last_name: string;
  blood_type: string;
  required_organ: string | null;
  urgency_level: string;
  city: string;
  hospital_name: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string | null;
  created_at: string | null;
}

export interface HospitalRow {
  id: string;
  user_id: string | null;
  hospital_name: string;
  license_number: string;
  hospital_type?: string;
  specialization?: string;
  city: string;
  full_address?: string;
  latitude: number | null;
  longitude: number | null;
  phone?: string;
  emergency_contact?: string;
  admin_name?: string;
  designation?: string;
  is_verified: boolean;
  contact_email?: string | null;
  contact_phone?: string | null;
  created_at?: string;
}

export interface MatchResultRow {
  id: number;
  donor_id: string;
  recipient_id: number | null;
  match_score: number;
  compatibility: string | null;
  distance_km: number | null;
  status: string | null;
  urgency: string | null;
  blood_type: string | null;
  organ_type: string | null;
  donor_name: string | null;
  hospital_name: string | null;
  cnic: string | null;
  created_at: string | null;
}

// ---------- Unified UI Models ----------

export interface Donor {
  id: string;
  user_id: string | null;
  full_name: string;
  first_name: string;
  last_name: string;
  age: number; // calculated from birth_date
  gender: string;
  contact_number: string;
  blood_type: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  is_available: boolean;
  cnic: string;
  
  // Dynamic Items
  is_blood_donor: boolean;
  is_organ_donor: boolean;
  donating_items: string; // Combined formatted string
  
  // Medical Profile (Joined)
  medical?: {
    hiv_status: string;
    hepatitis_status: string;
    is_diabetic: boolean;
    is_smoker: boolean;
    medical_conditions: string;
    medications: string;
    height_cm: number | null;
    weight_kg: number | null;
    donor_status: string;
    next_of_kin_name: string;
    next_of_kin_contact: string;
    consent_signed: boolean;
  };

  // Optional fields for dashboard/mock compatibility
  hospital_name?: string;
  medical_conditions?: string;
  hepatitis_status?: string;
  time_of_death?: string | null;
  cause_of_death?: string | null;
  donor_type?: 'blood' | 'organ';
  suspension_reason?: string;
  verification_status: VerificationStatus;
  verified_by_id?: string;
  medical_document_url?: string;

  created_at: string;
}

export interface Hospital {
  id: string; // Alias for hospital_id for map/compatibility
  hospital_id: string;
  hospital_name: string;
  license_number: string;
  city: string;
  contact_email: string;
  contact_phone: string;
  latitude: number | null;
  longitude: number | null;
  is_verified: boolean;
  created_at: string;
  admin_name?: string;
  hospital_type?: string;
}

export interface Match {
  id: string;
  donor_id: string;
  donor_name: string;
  match_score: number;
  score_breakdown?: {
    compatibility: number;
    distance: number;
    urgency: number;
  };
  compatibility: CompatibilityLevel;
  distance_km: number;
  status: string;
  urgency: string;
  blood_type: string;
  organ_type?: string;
  hospital_name: string;
  hospital_id?: string;
  cnic: string;
  created_at: string;
}

export interface Recipient {
  id: string;
  full_name: string;
  blood_type: string;
  required_organ: string;
  urgency_level: string;
  city: string;
  hospital_name: string;
  status: string;
  created_at: string;
}

export interface CityDonorStats {
  city: string;
  total_donors: number;
  available_donors: number;
  blood_donors: number;
  organ_donors: number;
}

export interface GlobalStats {
  totalDonors: number;
  totalHospitals: number;
  livesSaved: number;
  citiesCovered: number;
}
