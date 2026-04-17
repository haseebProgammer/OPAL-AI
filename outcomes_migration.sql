-- OPAL-AI CLINICAL OUTCOME REGISTRY
-- Objective: Track successful AI-driven matches for auditing and life-saving analytics.

BEGIN;

CREATE TABLE IF NOT EXISTS public.match_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE,
    donor_id UUID REFERENCES public.donors(id) ON DELETE CASCADE,
    organ_type TEXT NOT NULL,
    match_score DOUBLE PRECISION,
    cit_viability_status TEXT DEFAULT 'optimal', -- 'optimal', 'acceptable', 'borderline'
    verification_doctor_id UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'coordinated', -- 'coordinated', 'transporting', 'success', 'failed'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.match_outcomes ENABLE ROW LEVEL SECURITY;

-- Admin/Hospital Visibility
CREATE POLICY "Hospitals can view their own match outcomes"
ON public.match_outcomes FOR SELECT
TO authenticated
USING (hospital_id IN (SELECT id FROM public.hospitals WHERE user_id = auth.uid()));

CREATE POLICY "Admin can view all outcomes"
ON public.match_outcomes FOR ALL
TO authenticated
USING (auth.jwt() ->> 'email' = 'ranahaseeb9427@gmail.com' OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

COMMIT;
