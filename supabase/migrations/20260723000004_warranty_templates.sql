-- ====================================================================
-- DENTAL LAB WALA — Warranty Templates Table
-- Multi-Tenant Vertical SaaS for Dental Laboratories
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.warranty_templates (
    lab_id          UUID PRIMARY KEY REFERENCES public.labs (id) ON DELETE CASCADE,
    template_a_front TEXT,
    template_a_back  TEXT,
    template_b_front TEXT,
    template_b_back  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.warranty_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin full access on warranty_templates"
    ON public.warranty_templates FOR ALL
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

CREATE POLICY "Lab user reads own warranty_templates"
    ON public.warranty_templates FOR SELECT
    USING (lab_id = public.get_my_lab_id());
