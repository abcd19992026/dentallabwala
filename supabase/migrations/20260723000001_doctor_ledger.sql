-- ====================================================================
-- DENTAL LAB WALA — Doctor Ledger Module Tables & Security
-- Multi-Tenant Vertical SaaS for Dental Laboratories
-- ====================================================================

-- 1. Doctor Ledgers (Header & Master Record)
CREATE TABLE IF NOT EXISTS public.doctor_ledgers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_id          UUID NOT NULL REFERENCES public.labs (id) ON DELETE CASCADE,
    doctor_id       UUID REFERENCES public.doctors (id) ON DELETE SET NULL,
    lab_name        TEXT NOT NULL DEFAULT '',
    address         TEXT NOT NULL DEFAULT '',
    mobile          TEXT NOT NULL DEFAULT '',
    period_from     DATE,
    period_to       DATE,
    opening_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    title           TEXT NOT NULL DEFAULT 'DOCTOR LEDGER',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doctor_ledgers_lab_id ON public.doctor_ledgers (lab_id);
CREATE INDEX IF NOT EXISTS idx_doctor_ledgers_doctor_id ON public.doctor_ledgers (doctor_id);

-- 2. Doctor Ledger Items (Table Work Rows)
CREATE TABLE IF NOT EXISTS public.doctor_ledger_items (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_id           UUID NOT NULL REFERENCES public.labs (id) ON DELETE CASCADE,
    ledger_id        UUID NOT NULL REFERENCES public.doctor_ledgers (id) ON DELETE CASCADE,
    entry_date       DATE NOT NULL DEFAULT CURRENT_DATE,
    case_no          TEXT NOT NULL DEFAULT '',
    doctor_name      TEXT NOT NULL DEFAULT '',
    patient_name     TEXT NOT NULL DEFAULT '',
    work_description TEXT NOT NULL DEFAULT '',
    tooth_no         TEXT NOT NULL DEFAULT '',
    unit_count       INT NOT NULL DEFAULT 1,
    billing_amount   NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    grand_total      NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    delivery_date    DATE,
    sort_order       INT NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doctor_ledger_items_lab_id ON public.doctor_ledger_items (lab_id);
CREATE INDEX IF NOT EXISTS idx_doctor_ledger_items_ledger_id ON public.doctor_ledger_items (ledger_id);

-- 3. Doctor Ledger Payments (Bottom Payment Summary Entries)
CREATE TABLE IF NOT EXISTS public.doctor_ledger_payments (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_id       UUID NOT NULL REFERENCES public.labs (id) ON DELETE CASCADE,
    ledger_id    UUID NOT NULL REFERENCES public.doctor_ledgers (id) ON DELETE CASCADE,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount       NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_mode TEXT NOT NULL DEFAULT 'Cash', -- Cheque, Cash, UPI, Bank Transfer, etc.
    reference_no TEXT NOT NULL DEFAULT '',
    remarks      TEXT NOT NULL DEFAULT '',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doctor_ledger_payments_lab_id ON public.doctor_ledger_payments (lab_id);
CREATE INDEX IF NOT EXISTS idx_doctor_ledger_payments_ledger_id ON public.doctor_ledger_payments (ledger_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.doctor_ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_ledger_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_ledger_payments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- doctor_ledgers policies
CREATE POLICY "Super admin full access on doctor_ledgers"
    ON public.doctor_ledgers FOR ALL
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

CREATE POLICY "Lab user manages own doctor_ledgers"
    ON public.doctor_ledgers FOR ALL
    USING (lab_id = public.get_my_lab_id())
    WITH CHECK (lab_id = public.get_my_lab_id());

-- doctor_ledger_items policies
CREATE POLICY "Super admin full access on doctor_ledger_items"
    ON public.doctor_ledger_items FOR ALL
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

CREATE POLICY "Lab user manages own doctor_ledger_items"
    ON public.doctor_ledger_items FOR ALL
    USING (lab_id = public.get_my_lab_id())
    WITH CHECK (lab_id = public.get_my_lab_id());

-- doctor_ledger_payments policies
CREATE POLICY "Super admin full access on doctor_ledger_payments"
    ON public.doctor_ledger_payments FOR ALL
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

CREATE POLICY "Lab user manages own doctor_ledger_payments"
    ON public.doctor_ledger_payments FOR ALL
    USING (lab_id = public.get_my_lab_id())
    WITH CHECK (lab_id = public.get_my_lab_id());
