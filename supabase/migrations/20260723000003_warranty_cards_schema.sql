-- ====================================================================
-- DENTAL LAB WALA — Warranty Cards Final Schema
-- Multi-Tenant Vertical SaaS for Dental Laboratories
-- ====================================================================

-- Remove old unused columns
ALTER TABLE public.warranty_cards DROP COLUMN IF EXISTS doctor_name;
ALTER TABLE public.warranty_cards DROP COLUMN IF EXISTS warranty_years;
ALTER TABLE public.warranty_cards DROP COLUMN IF EXISTS notes;

-- Add new columns matching the Warranty Card form
ALTER TABLE public.warranty_cards ADD COLUMN IF NOT EXISTS sl_no INTEGER;
ALTER TABLE public.warranty_cards ADD COLUMN IF NOT EXISTS lab_dentist TEXT DEFAULT '';
ALTER TABLE public.warranty_cards ADD COLUMN IF NOT EXISTS tooth_no TEXT DEFAULT '';
ALTER TABLE public.warranty_cards ADD COLUMN IF NOT EXISTS reg_no TEXT DEFAULT '';
ALTER TABLE public.warranty_cards ADD COLUMN IF NOT EXISTS valid_till DATE;
ALTER TABLE public.warranty_cards ADD COLUMN IF NOT EXISTS warranty TEXT DEFAULT '';
ALTER TABLE public.warranty_cards ADD COLUMN IF NOT EXISTS authorised_code TEXT DEFAULT '';
