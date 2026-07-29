-- ====================================================================
-- DENTAL LAB WALA — Production Database Schema
-- Multi-Tenant Vertical SaaS for Dental Laboratories
-- ====================================================================

-- ====================================================================
-- 1. TABLES
-- ====================================================================

-- Labs (Tenants)
CREATE TABLE public.labs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_name    TEXT NOT NULL,
    owner_name  TEXT,
    email       TEXT,
    mobile      TEXT,
    address     TEXT,
    template_a_front TEXT,
    template_a_back  TEXT,
    template_b_front TEXT,
    template_b_back  TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_labs_is_active ON public.labs (is_active);
CREATE INDEX idx_labs_email ON public.labs (email);

-- Profiles (extends auth.users with role and tenant binding)
CREATE TABLE public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    lab_id      UUID REFERENCES public.labs (id) ON DELETE SET NULL,
    role        TEXT NOT NULL DEFAULT 'lab_user' CHECK (role IN ('super_admin', 'lab_user')),
    full_name   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_lab_id ON public.profiles (lab_id);
CREATE INDEX idx_profiles_role ON public.profiles (role);

-- Doctors (tenant-scoped)
CREATE TABLE public.doctors (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_id      UUID NOT NULL REFERENCES public.labs (id) ON DELETE CASCADE,
    name        TEXT,
    phone       TEXT,
    clinic_name TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_doctors_lab_id ON public.doctors (lab_id);

-- Warranty Cards (tenant-scoped)
CREATE TABLE public.warranty_cards (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_id          UUID NOT NULL REFERENCES public.labs (id) ON DELETE CASCADE,
    patient_name    TEXT,
    doctor_name     TEXT,
    issue_date      DATE DEFAULT CURRENT_DATE,
    warranty_years  INT,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_warranty_cards_lab_id ON public.warranty_cards (lab_id);

-- Doctor Ledger Entries (tenant-scoped)
CREATE TABLE public.doctor_ledger_entries (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_id      UUID NOT NULL REFERENCES public.labs (id) ON DELETE CASCADE,
    doctor_id   UUID REFERENCES public.doctors (id) ON DELETE SET NULL,
    amount      NUMERIC(12, 2),
    entry_type  TEXT CHECK (entry_type IN ('debit', 'credit')),
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_doctor_ledger_lab_id ON public.doctor_ledger_entries (lab_id);
CREATE INDEX idx_doctor_ledger_doctor_id ON public.doctor_ledger_entries (doctor_id);

-- ====================================================================
-- 2. HELPER FUNCTIONS
-- ====================================================================

-- Returns true if the current authenticated user has the super_admin role
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'super_admin'
  );
$$;

-- Returns the lab_id of the current authenticated user
CREATE OR REPLACE FUNCTION public.get_my_lab_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lab_id FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- ====================================================================
-- 3. ROW LEVEL SECURITY
-- ====================================================================

ALTER TABLE public.labs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_ledger_entries ENABLE ROW LEVEL SECURITY;

-- ----- labs -----
CREATE POLICY "Super admin full access on labs"
    ON public.labs FOR ALL
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

CREATE POLICY "Lab user reads own lab"
    ON public.labs FOR SELECT
    USING (id = public.get_my_lab_id());

-- ----- profiles -----
CREATE POLICY "Super admin full access on profiles"
    ON public.profiles FOR ALL
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

CREATE POLICY "User reads own profile"
    ON public.profiles FOR SELECT
    USING (id = auth.uid());

-- ----- doctors -----
CREATE POLICY "Super admin full access on doctors"
    ON public.doctors FOR ALL
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

CREATE POLICY "Lab user manages own doctors"
    ON public.doctors FOR ALL
    USING (lab_id = public.get_my_lab_id())
    WITH CHECK (lab_id = public.get_my_lab_id());

-- ----- warranty_cards -----
CREATE POLICY "Super admin full access on warranty_cards"
    ON public.warranty_cards FOR ALL
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

CREATE POLICY "Lab user manages own warranty cards"
    ON public.warranty_cards FOR ALL
    USING (lab_id = public.get_my_lab_id())
    WITH CHECK (lab_id = public.get_my_lab_id());

-- ----- doctor_ledger_entries -----
CREATE POLICY "Super admin full access on doctor_ledger_entries"
    ON public.doctor_ledger_entries FOR ALL
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

CREATE POLICY "Lab user manages own ledger entries"
    ON public.doctor_ledger_entries FOR ALL
    USING (lab_id = public.get_my_lab_id())
    WITH CHECK (lab_id = public.get_my_lab_id());

-- ====================================================================
-- 4. TRIGGER — auto-create profile on auth.users insert
-- ====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'lab_user')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
