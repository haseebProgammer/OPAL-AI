-- OPAL-AI PRODUCTION-GRADE DATABASE CONSOLIDATION
-- Objectives: Unify donors, add clinical fields, and implement compliance logging.

BEGIN;

-- 1. Create Data Access Logs (Privacy Compliance)
CREATE TABLE IF NOT EXISTS public.data_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE,
    donor_id UUID NOT NULL,
    action_type TEXT NOT NULL DEFAULT 'reveal_contact',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Waitlist Table (Automated Escalation)
CREATE TABLE IF NOT EXISTS public.waitlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE,
    required_item TEXT NOT NULL, -- e.g., 'Kidney' or 'Blood O+'
    blood_type VARCHAR(10) NOT NULL,
    urgency_level TEXT DEFAULT 'Routine',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Unified Donors Table
-- This replaces blood_donors and organ_donors with a single clinical registry.
CREATE TABLE IF NOT EXISTS public.donors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    age INTEGER,
    gender TEXT, -- Missing Field Added
    blood_type TEXT NOT NULL,
    cnic TEXT UNIQUE,
    donor_type TEXT DEFAULT 'blood', -- 'blood', 'organ', 'both'
    
    -- Clinical Indicators (Standardized)
    hypertension BOOLEAN DEFAULT FALSE, -- Missing Field Added
    heart_disease BOOLEAN DEFAULT FALSE, -- Missing Field Added
    diabetic_status BOOLEAN DEFAULT FALSE, -- Missing Field Added
    hepatitis_status TEXT DEFAULT 'Negative',
    hiv_status TEXT DEFAULT 'Negative',
    
    -- Organ Specific
    organs_available JSONB DEFAULT '[]'::jsonb,
    is_living_donor BOOLEAN DEFAULT TRUE,
    medical_report_url TEXT,
    
    -- Geospatial
    city TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    
    -- Status
    is_available BOOLEAN DEFAULT TRUE,
    approval_status TEXT DEFAULT 'pending', -- 'pending', 'verified', 'rejected'
    last_verified_by UUID REFERENCES auth.users(id), -- Human-in-the-loop signoff
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.data_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donors ENABLE ROW LEVEL SECURITY;

-- 5. Copy data from legacy tables (Best effort migration)
-- Note: You should check your current data count before dropping legacy tables.
INSERT INTO public.donors (id, user_id, full_name, email, phone, age, gender, blood_type, cnic, city, latitude, longitude, is_available, approval_status, created_at, donor_type)
SELECT id, user_id, full_name, email, phone, age, gender, blood_type, cnic, city, latitude, longitude, is_available, approval_status, created_at, 'blood'
FROM public.blood_donors
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.donors (id, user_id, full_name, email, phone, age, gender, blood_type, cnic, city, latitude, longitude, is_available, approval_status, created_at, donor_type, organs_available, hypertension, heart_disease, diabetic_status)
SELECT id, user_id, full_name, email, phone, age, gender, blood_type, cnic, city, latitude, longitude, is_available, approval_status, created_at, 'organ', organs_available, hypertension, heart_disease, diabetes 
FROM public.organ_donors
ON CONFLICT (id) DO NOTHING;

-- 6. Indices
CREATE INDEX idx_donors_unified_blood_type ON donors(blood_type);
CREATE INDEX idx_donors_unified_city ON donors(city);
CREATE INDEX idx_donors_unified_available ON donors(is_available) WHERE is_available = TRUE;

COMMIT;
