-- Manual operator installation, NOT an application migration.
-- Loading this file defines an installer; it does not schedule or invoke anything.
-- Before calling it, deploy sync-zernio-campaigns with dedicated-key authentication,
-- configure its secrets, and store the SAME cron key in Vault under a unique name.
-- The caller supplies the verified deployed endpoint and project reference.

CREATE OR REPLACE FUNCTION public.install_campaign_sync_schedule(
 p_deployed_endpoint text,
 p_verified_project_ref text,
 p_vault_secret_name text,
 p_endpoint_verified boolean DEFAULT false
) RETURNS bigint LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_catalog AS $$
DECLARE secret_count integer; key_length integer; command text; scheduled_job bigint;
BEGIN
 IF NOT p_endpoint_verified OR p_verified_project_ref IS NULL OR p_verified_project_ref !~ '^[a-z0-9]{20}$'
  OR p_deployed_endpoint IS DISTINCT FROM ('https://'||p_verified_project_ref||'.supabase.co/functions/v1/sync-zernio-campaigns')
  THEN RAISE EXCEPTION 'Informe o endpoint já publicado e o projeto verificado antes de instalar o agendamento.'; END IF;
 IF p_vault_secret_name IS NULL OR btrim(p_vault_secret_name)='' THEN RAISE EXCEPTION 'Informe o nome do segredo dedicado no Vault.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_cron') OR NOT EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_net')
  OR to_regclass('vault.decrypted_secrets') IS NULL THEN RAISE EXCEPTION 'Habilite Cron, pg_net e Vault antes da instalação.'; END IF;
 SELECT count(*),min(length(decrypted_secret)) INTO secret_count,key_length FROM vault.decrypted_secrets WHERE name=p_vault_secret_name;
 IF secret_count<>1 OR key_length<32 OR key_length>256 THEN RAISE EXCEPTION 'O Vault precisa conter um único segredo dedicado válido com esse nome.'; END IF;
 -- The cron catalog stores a Vault lookup, never the credential itself.
 command:=format($job$
  SELECT net.http_post(
   url := %L,
   headers := jsonb_build_object('Content-Type','application/json','X-Campaign-Sync-Key',
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name=%L)),
   body := '{}'::jsonb,
   timeout_milliseconds := 100000
  );
 $job$,p_deployed_endpoint,p_vault_secret_name);
 -- pg_cron updates the existing named job for the caller instead of duplicating it.
 SELECT cron.schedule('vilavix-zernio-campaign-sync','*/10 * * * *',command) INTO scheduled_job;
 RETURN scheduled_job;
END;$$;
REVOKE ALL ON FUNCTION public.install_campaign_sync_schedule(text,text,text,boolean) FROM PUBLIC,anon,authenticated,service_role;
-- Execute the installer through an authorized database administrator connection.
-- Use bound parameters; the parameter list contains only endpoint/reference/secret NAME.
-- SELECT public.install_campaign_sync_schedule($1,$2,$3,true);
