-- OPAL-AI ADMINISTRATIVE OVERSIGHT RECOVERY
-- Objective: Standardize status columns, enable account activation flags, and fix RLS for Admin updates.

BEGIN;

-- 1. Standardize Donors Table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='donors' AND column_name='is_active') THEN
        ALTER TABLE public.donors ADD COLUMN is_active BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Standardize Hospitals Table
DO $$ 
BEGIN 
    -- Add approval_status if mapping from is_verified
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hospitals' AND column_name='approval_status') THEN
        ALTER TABLE public.hospitals ADD COLUMN approval_status TEXT DEFAULT 'pending';
        -- Migrating existing verified status
        UPDATE public.hospitals SET approval_status = 'verified' WHERE is_verified = TRUE;
    END IF;

    -- Add is_active flag for login gating
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hospitals' AND column_name='is_active') THEN
        ALTER TABLE public.hospitals ADD COLUMN is_active BOOLEAN DEFAULT FALSE;
        UPDATE public.hospitals SET is_active = TRUE WHERE is_verified = TRUE;
    END IF;
END $$;

-- 3. Enhance Profiles Table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_active') THEN
        ALTER TABLE public.profiles ADD COLUMN is_active BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 4. Supabase Admin Permissions (RLS Bypass for Admin)
-- Ensure Admin role can update all records
DROP POLICY IF EXISTS "Admin full access on donors" ON public.donors;
CREATE POLICY "Admin full access on donors" 
ON public.donors 
FOR ALL 
TO authenticated 
USING (auth.jwt() ->> 'email' = 'ranahaseeb9427@gmail.com' OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admin full access on hospitals" ON public.hospitals;
CREATE POLICY "Admin full access on hospitals" 
ON public.hospitals 
FOR ALL 
TO authenticated 
USING (auth.jwt() ->> 'email' = 'ranahaseeb9427@gmail.com' OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admin full access on profiles" ON public.profiles;
CREATE POLICY "Admin full access on profiles" 
ON public.profiles 
FOR ALL 
TO authenticated 
USING (auth.jwt() ->> 'email' = 'ranahaseeb9427@gmail.com' OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

COMMIT;
