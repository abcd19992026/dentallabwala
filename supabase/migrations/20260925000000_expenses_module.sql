-- ====================================================================
-- DENTIVO — Expenses Module (EXPENSES-ONLY)
-- Multi-Tenant Vertical SaaS for Dental Laboratories
-- ====================================================================
-- Scope: expense_categories + expense_entries only. This module never
-- reads from or writes to doctors / doctor_supplies / doctor_payments /
-- doctor_ledger_entries, and computes no profit figures.
-- ====================================================================

-- ====================================================================
-- 1. TABLES
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.expense_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_id      UUID NOT NULL REFERENCES public.labs (id) ON DELETE CASCADE,
    name        TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 50),
    is_default  BOOLEAN NOT NULL DEFAULT false,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    sort_order  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A lab cannot have two categories that only differ by case or
-- surrounding whitespace.
CREATE UNIQUE INDEX IF NOT EXISTS ux_expense_categories_lab_name
    ON public.expense_categories (lab_id, lower(btrim(name)));

CREATE INDEX IF NOT EXISTS idx_expense_categories_lab_id
    ON public.expense_categories (lab_id);

CREATE TABLE IF NOT EXISTS public.expense_entries (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_id        UUID NOT NULL REFERENCES public.labs (id) ON DELETE CASCADE,
    expense_date  DATE NOT NULL CHECK (expense_date <= CURRENT_DATE + INTERVAL '1 day'),
    title         TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 150),
    category_id   UUID NOT NULL REFERENCES public.expense_categories (id) ON DELETE NO ACTION,
    payment_mode  TEXT NOT NULL CHECK (payment_mode IN ('cash', 'upi', 'bank_transfer')),
    paid_to       TEXT CHECK (paid_to IS NULL OR char_length(paid_to) <= 100),
    amount        NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    notes         TEXT,
    created_by    UUID,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expense_entries_lab_date
    ON public.expense_entries (lab_id, expense_date);

CREATE INDEX IF NOT EXISTS idx_expense_entries_lab_category
    ON public.expense_entries (lab_id, category_id);

-- ====================================================================
-- 2. TRIGGERS — expense_categories
-- ====================================================================

-- Normalize name before it ever reaches the CHECK/unique index, so
-- " Rent" and "Rent" are treated as the same category.
CREATE OR REPLACE FUNCTION public.trim_expense_category_name()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.name := btrim(NEW.name);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_expense_categories_trim_name
  BEFORE INSERT OR UPDATE OF name ON public.expense_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.trim_expense_category_name();

-- ====================================================================
-- 3. TRIGGERS — expense_entries
-- ====================================================================

-- created_by must reflect the actual caller, never a client-supplied
-- value.
CREATE OR REPLACE FUNCTION public.set_expense_entry_created_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.created_by := auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_expense_entries_created_by
  BEFORE INSERT ON public.expense_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.set_expense_entry_created_by();

-- An expense's category must belong to the same lab as the expense
-- itself, and must be active whenever a category is newly assigned
-- (insert, or an update that changes category_id). An update that
-- leaves category_id untouched doesn't re-check is_active, so an
-- entry can still be edited after its category was later deactivated
-- — this trigger only fires on UPDATE OF category_id, lab_id anyway.
CREATE OR REPLACE FUNCTION public.enforce_expense_category_lab_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category_changed BOOLEAN;
BEGIN
  v_category_changed := (TG_OP = 'INSERT') OR (NEW.category_id IS DISTINCT FROM OLD.category_id);

  IF v_category_changed THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.expense_categories c
      WHERE c.id = NEW.category_id
        AND c.lab_id = NEW.lab_id
        AND c.is_active = true
    ) THEN
      RAISE EXCEPTION 'category_id % is not an active category for lab_id %', NEW.category_id, NEW.lab_id;
    END IF;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM public.expense_categories c
      WHERE c.id = NEW.category_id
        AND c.lab_id = NEW.lab_id
    ) THEN
      RAISE EXCEPTION 'category_id does not belong to lab_id %', NEW.lab_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_expense_entries_category_lab_match
  BEFORE INSERT OR UPDATE OF category_id, lab_id ON public.expense_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_expense_category_lab_match();

-- Generic updated_at bump — first table in this project to use one.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_expense_entries_updated_at
  BEFORE UPDATE ON public.expense_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ====================================================================
-- 4. DEFAULT CATEGORIES
-- ====================================================================

-- Single source of truth for the 9 default categories, in order.
-- Used both for backfilling existing labs and for seeding new ones.
CREATE OR REPLACE FUNCTION public.default_expense_categories()
RETURNS TABLE (name TEXT, sort_order INT)
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT * FROM (VALUES
    ('Raw Material',  1),
    ('Staff Salary',  2),
    ('Rent',          3),
    ('Food',          4),
    ('Marketing',     5),
    ('Miscellaneous', 6),
    ('Referral',      7),
    ('Tea',           8),
    ('Travel',        9)
  ) AS t(name, sort_order);
$$;

-- Backfill: give every existing lab its 9 default categories.
INSERT INTO public.expense_categories (lab_id, name, is_default, sort_order)
SELECT l.id, d.name, true, d.sort_order
FROM public.labs l
CROSS JOIN public.default_expense_categories() d
ON CONFLICT (lab_id, lower(btrim(name))) DO NOTHING;

-- Every new lab automatically gets the same 9 categories.
CREATE OR REPLACE FUNCTION public.seed_default_expense_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.expense_categories (lab_id, name, is_default, sort_order)
  SELECT NEW.id, d.name, true, d.sort_order
  FROM public.default_expense_categories() d
  ON CONFLICT (lab_id, lower(btrim(name))) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_labs_seed_default_expense_categories
  AFTER INSERT ON public.labs
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_default_expense_categories();

-- ====================================================================
-- 5. ROW LEVEL SECURITY
-- ====================================================================

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_entries ENABLE ROW LEVEL SECURITY;

-- ----- expense_categories -----
CREATE POLICY "Super admin full access on expense_categories"
    ON public.expense_categories FOR ALL
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

CREATE POLICY "Lab user manages own expense_categories"
    ON public.expense_categories FOR ALL
    USING (lab_id = public.get_my_lab_id())
    WITH CHECK (lab_id = public.get_my_lab_id());

-- ----- expense_entries -----
CREATE POLICY "Super admin full access on expense_entries"
    ON public.expense_entries FOR ALL
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

CREATE POLICY "Lab user manages own expense_entries"
    ON public.expense_entries FOR ALL
    USING (lab_id = public.get_my_lab_id())
    WITH CHECK (lab_id = public.get_my_lab_id());
