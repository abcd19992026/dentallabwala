-- ====================================================================
-- DENTIVO — Lab Logo & WhatsApp Number
-- Multi-Tenant Vertical SaaS for Dental Laboratories
-- ====================================================================

-- Add only the two new columns to labs (existing columns untouched)
ALTER TABLE public.labs
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
  ADD COLUMN IF NOT EXISTS logo_path TEXT;

-- Lab logo storage bucket (private — accessed via signed URLs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lab-logo',
  'lab-logo',
  false,
  2621440, -- 2.5 MB per file
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Super admins can fully manage lab logos
CREATE POLICY "Super admin manages lab logos"
  ON storage.objects FOR ALL
  USING (bucket_id = 'lab-logo' AND public.is_super_admin())
  WITH CHECK (bucket_id = 'lab-logo' AND public.is_super_admin());

-- Lab users can read only their own lab's logos (path isolated per lab)
CREATE POLICY "Lab user reads own lab logos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'lab-logo'
    AND (storage.foldername(name))[1]::uuid = public.get_my_lab_id()
  );