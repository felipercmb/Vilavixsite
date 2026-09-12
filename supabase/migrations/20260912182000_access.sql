BEGIN;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS corretor text;
CREATE OR REPLACE FUNCTION public.is_crm_member() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND ativo=true);
$$;
REVOKE ALL ON FUNCTION public.is_crm_member() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_crm_member() TO authenticated;

-- Existing memberships are preserved. New registrations require admin activation.
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.profiles(id,nome,email,foto,role,ativo)
 VALUES(NEW.id,COALESCE(NEW.raw_user_meta_data->>'nome',split_part(NEW.email,'@',1)),NEW.email,UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'nome',NEW.email),2)),'corretor',false);
 RETURN NEW;
END;$$;

DROP POLICY IF EXISTS "Profiles leitura CRM" ON public.profiles;
CREATE POLICY "Profiles leitura CRM" ON public.profiles FOR SELECT TO authenticated
 USING(id=auth.uid() OR public.is_crm_member());

DO $$
DECLARE table_name text;
BEGIN
 -- A permissive ALL policy would OR with the production ownership policies,
 -- exposing every broker's leads/tasks. Keep those policies and AND the active
 -- membership requirement with them through a separate restrictive policy.
 FOREACH table_name IN ARRAY ARRAY['leads','tasks','comments','imoveis','config',
  'roleta_regras','meta_leads_log','wa_notify_log','zernio_inbound_log',
  'campaigns','lead_assignments'] LOOP
  IF to_regclass('public.'||table_name) IS NOT NULL THEN
   EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',table_name);
   EXECUTE format('DROP POLICY IF EXISTS crm_active_membership ON public.%I',table_name);
   EXECUTE format('CREATE POLICY crm_active_membership ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING(public.is_crm_member()) WITH CHECK(public.is_crm_member())',table_name);
  END IF;
 END LOOP;
 -- Recover from an earlier application of the broad policy without changing a
 -- base installation that only has its original generic policy. Production has
 -- the named ownership policies; these must remain the permissive authorization.
 IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='leads' AND policyname='leads_select') THEN
  DROP POLICY IF EXISTS "Leads logado" ON public.leads;
 END IF;
 IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tasks' AND policyname='tasks_select') THEN
  DROP POLICY IF EXISTS "Tasks logado" ON public.tasks;
 END IF;
END;$$;
-- Contact history follows the same visibility as its lead. The legacy comments
-- policy grants all active users access, so this restriction must be ANDed with it.
DROP POLICY IF EXISTS crm_comment_lead_scope ON public.comments;
CREATE POLICY crm_comment_lead_scope ON public.comments AS RESTRICTIVE FOR ALL TO authenticated
 USING(public.is_crm_admin() OR EXISTS(SELECT 1 FROM public.leads WHERE leads.id=comments.lead_id))
 WITH CHECK(public.is_crm_admin() OR EXISTS(SELECT 1 FROM public.leads WHERE leads.id=comments.lead_id));
DO $$
BEGIN
 IF to_regclass('storage.objects') IS NOT NULL THEN
  DROP POLICY IF EXISTS "Fotos upload logado" ON storage.objects;
  DROP POLICY IF EXISTS "Fotos delete logado" ON storage.objects;
  CREATE POLICY "Fotos upload logado" ON storage.objects FOR INSERT TO authenticated
   WITH CHECK(bucket_id='fotos' AND public.is_crm_member());
  CREATE POLICY "Fotos delete logado" ON storage.objects FOR DELETE TO authenticated
   USING(bucket_id='fotos' AND public.is_crm_member());
 END IF;
END;$$;
COMMIT;
