import type {
  BloodDonorRow,
  OrganDonorRow,
  HospitalRow,
  MatchResultRow,
  Donor,
  Match,
  Hospital,
  CompatibilityLevel,
} from './types';

/** Safe string utility to avoid UI breaking on nulls */
export function safeField(value: string | null | undefined, fallback: string = '—'): string {
  if (!value || value === 'null' || value === 'undefined' || value.trim() === '') {
    return fallback;
  }
  return value;
}

/** Determines compatibility level from raw string */
function parseCompatibility(raw: string | null): CompatibilityLevel {
  if (!raw) return 'compatible';
  const lower = raw.toLowerCase();
  if (lower.includes('full') || lower.includes('perfect') || lower.includes('100')) return 'full';
  if (lower.includes('incompatible')) return 'incompatible';
  return 'compatible';
}

/** Maps a BloodDonorRow to the unified Donor UI model */
export function mapBloodDonor(row: BloodDonorRow): Donor {
  if (!row.id || !row.full_name) {
    console.error("Mapping Error: Missing critical fields in BloodDonorRow", row);
  }

  return {
    id: row.id,
    user_id: row.user_id,
    full_name: safeField(row.full_name, 'Anonymous Donor'),
    age: row.age || 0,
    gender: safeField(row.gender),
    blood_type: safeField(row.blood_type, 'Unknown'),
    city: safeField(row.city),
    latitude: row.latitude || null,
    longitude: row.longitude || null,
    is_available: !!row.is_available,
    cnic: safeField(row.cnic),
    donor_type: 'blood',
    donating_items: 'Whole Blood',
    verification_status: row.approval_status || 'pending',
    clinical: {
      hep: safeField(row.hepatitis_status),
    },
    created_at: row.created_at || new Date().toISOString(),
  };
}

/** Maps an OrganDonorRow to the unified Donor UI model */
export function mapOrganDonor(row: OrganDonorRow): Donor {
  const organs = Array.isArray(row.organs_available) 
    ? row.organs_available 
    : typeof row.organs_available === 'string' 
      ? JSON.parse(row.organs_available || '[]')
      : [];

  return {
    id: row.id,
    user_id: row.user_id,
    full_name: safeField(row.full_name, 'Anonymous Donor'),
    age: row.age || 0,
    gender: safeField(row.gender),
    blood_type: safeField(row.blood_type, 'Unknown'),
    city: safeField(row.city),
    latitude: row.latitude || null,
    longitude: row.longitude || null,
    is_available: !!row.is_available,
    cnic: safeField(row.cnic),
    donor_type: 'organ',
    donating_items: organs.join(', '),
    verification_status: row.approval_status || 'pending',
    clinical: {
      organs,
      hiv: safeField(row.hiv_status),
      hep: safeField(row.hepatitis_status),
      diabetes: !!row.diabetes,
      smoker: !!row.smoker,
      heart: !!row.heart_disease,
      hypertension: !!row.hypertension,
      kin_contact: safeField(row.next_of_kin_contact),
    },
    created_at: row.created_at || new Date().toISOString(),
  };
}

/** Maps standardized HospitalRow to UI Model */
export function mapHospital(row: HospitalRow): Hospital {
  return {
    id: row.id,
    name: safeField(row.name, 'Unnamed Facility'),
    license_number: safeField(row.license_number, 'PENDING'),
    city: safeField(row.city),
    contact_email: safeField(row.contact_email, ''),
    latitude: row.latitude || null,
    longitude: row.longitude || null,
    is_verified: !!row.is_verified,
    created_at: row.created_at || new Date().toISOString(),
  };
}

/** Maps MatchResultRow to UI Model */
export function mapMatchResult(row: MatchResultRow, donorName?: string, hospitalName?: string): Match {
  return {
    id: row.id,
    donor_id: row.donor_id,
    donor_name: donorName || 'Donor',
    match_score: Number(row.match_score) || 0,
    compatibility: parseCompatibility(row.compatibility),
    distance_km: Number(row.distance_km) || 0,
    status: row.status || 'pending',
    urgency: safeField(row.urgency, 'Routine'),
    blood_type: '—', // Usually fetched separately
    hospital_name: hospitalName || 'Partner Hospital',
    created_at: row.created_at || new Date().toISOString(),
  };
}
