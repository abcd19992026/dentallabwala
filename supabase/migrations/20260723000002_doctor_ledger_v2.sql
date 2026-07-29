-- ====================================================================
-- DENTAL LAB WALA — Doctor Ledger Module V2 Tables & Security
-- Multi-Tenant Vertical SaaS for Dental Laboratories
-- ====================================================================

-- 1. Ensure `doctors` table has address & opening_balance
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT '';
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00;

-- 2. Doctor Supplies (Work entries for each doctor)
CREATE TABLE IF NOT EXISTS public.doctor_supplies (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_id           UUID NOT NULL REFERENCES public.labs (id) ON DELETE CASCADE,
    doctor_id        UUID NOT NULL REFERENCES public.doctors (id) ON DELETE CASCADE,
    entry_date       DATE NOT NULL DEFAULT CURRENT_DATE,
    case_no          TEXT NOT NULL DEFAULT '',
    patient_name     TEXT NOT NULL DEFAULT '',
    work_description TEXT NOT NULL DEFAULT '',
    tooth_no         TEXT NOT NULL DEFAULT '',
    unit_count       INT NOT NULL DEFAULT 1,
    billing_amount   NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    delivery_date    DATE,
    remarks          TEXT NOT NULL DEFAULT '',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doctor_supplies_lab_id ON public.doctor_supplies (lab_id);
CREATE INDEX IF NOT EXISTS idx_doctor_supplies_doctor_id ON public.doctor_supplies (doctor_id);

-- 3. Doctor Payments (Payment history for each doctor)
CREATE TABLE IF NOT EXISTS public.doctor_payments (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_id       UUID NOT NULL REFERENCES public.labs (id) ON DELETE CASCADE,
    doctor_id    UUID NOT NULL REFERENCES public.doctors (id) ON DELETE CASCADE,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount       NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_mode TEXT NOT NULL DEFAULT 'Cash' CHECK (payment_mode IN ('Cash', 'UPI', 'Cheque')),
    remarks      TEXT NOT NULL DEFAULT '',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doctor_payments_lab_id ON public.doctor_payments (lab_id);
CREATE INDEX IF NOT EXISTS idx_doctor_payments_doctor_id ON public.doctor_payments (doctor_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.doctor_supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_payments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY "Super admin full access on doctor_supplies"
    ON public.doctor_supplies FOR ALL
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

CREATE POLICY "Lab user manages own doctor_supplies"
    ON public.doctor_supplies FOR ALL
    USING (lab_id = public.get_my_lab_id())
    WITH CHECK (lab_id = public.get_my_lab_id());

CREATE POLICY "Super admin full access on doctor_payments"
    ON public.doctor_payments FOR ALL
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

CREATE POLICY "Lab user manages own doctor_payments"
    ON public.doctor_payments FOR ALL
    USING (lab_id = public.get_my_lab_id())
    WITH CHECK (lab_id = public.get_my_lab_id());
