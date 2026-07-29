-- ====================================================================
-- DENTAL LAB WALA — Template Configuration Store
-- Multi-Tenant Vertical SaaS for Dental Laboratories
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.template_configs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_id          UUID NOT NULL REFERENCES public.labs (id) ON DELETE CASCADE,
    template_key    TEXT NOT NULL CHECK (template_key IN ('template_a_front', 'template_a_back', 'template_b_front', 'template_b_back')),
    config          JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (lab_id, template_key)
);

ALTER TABLE public.template_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin full access on template_configs"
    ON public.template_configs FOR ALL
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

CREATE POLICY "Lab user manages own template_configs"
    ON public.template_configs FOR ALL
    USING (lab_id = public.get_my_lab_id())
    WITH CHECK (lab_id = public.get_my_lab_id());
