BEGIN;
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
DECLARE table_name text; policy_name text;
BEGIN
 FOR table_name,policy_name IN SELECT * FROM (VALUES('leads','Leads logado'),('tasks','Tasks logado'),('comments','Comments logado'),('imoveis','Imoveis escrita logado')) AS policies(t,p) LOOP
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',policy_name,table_name);
  EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING(public.is_crm_member()) WITH CHECK(public.is_crm_member())',policy_name,table_name);
 END LOOP;
END;$$;
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
