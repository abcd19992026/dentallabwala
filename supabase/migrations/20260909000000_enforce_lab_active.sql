-- ====================================================================
-- DENTIVO — Enforce lab deactivation at the database layer
-- Multi-Tenant Vertical SaaS for Dental Laboratories
-- ====================================================================
-- Deactivating a lab only sets labs.is_active = false. No RLS policy
-- checked it, so a deactivated lab could still read/write its data via
-- the API (the only block was a client-side check in auth.service.ts).
--
-- Fix: get_my_lab_id() now returns the lab_id ONLY while the lab is
-- active, and NULL otherwise. Every "Lab user manages own ..." policy
-- already compares lab_id = get_my_lab_id(), and NULL never matches —
-- so this single change enforces deactivation across all 11 tables
-- without touching any policy definition.
--
-- is_super_admin() is intentionally left untouched: super admin access
-- must keep working regardless of any lab's active state, otherwise a
-- deactivated lab could never be reactivated.
-- ====================================================================

CREATE OR REPLACE FUNCTION public.get_my_lab_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT p.lab_id
  FROM public.profiles p
  JOIN public.labs l ON l.id = p.lab_id
  WHERE p.id = auth.uid()
    AND l.is_active = true
  LIMIT 1;
$function$;
