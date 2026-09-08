-- ====================================================================
-- DENTIVO — Fix Warranty Template RLS (tenant isolation)
-- Multi-Tenant Vertical SaaS for Dental Laboratories
-- ====================================================================
-- The warranty_templates table and the 'template' storage bucket had
-- policies with USING (true) / WITH CHECK (true), letting any authed
-- lab user touch another lab's templates. Scope everything by lab.
-- ====================================================================

-- ----- public.warranty_templates -----

-- Drop the permissive catch-all policy
DROP POLICY IF EXISTS "Allow authenticated users to manage warranty templates"
  ON public.warranty_templates;

-- Also drop the earlier read-only / super-admin policies so this
-- migration re-establishes a clean, re-runnable state
DROP POLICY IF EXISTS "Lab user reads own warranty_templates"
  ON public.warranty_templates;
DROP POLICY IF EXISTS "Super admin full access on warranty_templates"
  ON public.warranty_templates;
DROP POLICY IF EXISTS "Lab user manages own warranty_templates"
  ON public.warranty_templates;

-- Recreate following the exact pattern used on public.doctors
CREATE POLICY "Super admin full access on warranty_templates"
    ON public.warranty_templates FOR ALL
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

CREATE POLICY "Lab user manages own warranty_templates"
    ON public.warranty_templates FOR ALL
    USING (lab_id = public.get_my_lab_id())
    WITH CHECK (lab_id = public.get_my_lab_id());

-- ----- storage.objects — 'template' bucket -----

-- Drop the four permissive per-verb policies
DROP POLICY IF EXISTS "Authenticated users can view template"   ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload template" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update template" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete template" ON storage.objects;

DROP POLICY IF EXISTS "Super admin manages template files" ON storage.objects;
DROP POLICY IF EXISTS "Lab user manages own template files" ON storage.objects;

-- Super admins can fully manage template files
CREATE POLICY "Super admin manages template files"
  ON storage.objects FOR ALL
  USING (bucket_id = 'template' AND public.is_super_admin())
  WITH CHECK (bucket_id = 'template' AND public.is_super_admin());

-- Lab users can manage only their own lab's template files
-- (path isolated per lab: first folder segment is the lab id)
CREATE POLICY "Lab user manages own template files"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'template'
    AND (storage.foldername(name))[1]::uuid = public.get_my_lab_id()
  )
  WITH CHECK (
    bucket_id = 'template'
    AND (storage.foldername(name))[1]::uuid = public.get_my_lab_id()
  );
