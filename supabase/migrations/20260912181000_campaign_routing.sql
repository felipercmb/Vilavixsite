-- VilaVix: campaign-aware routing. Apply after the base schema and automation migration.
-- Does not activate campaigns, publish ads, or assign existing leads automatically.
BEGIN;
CREATE OR REPLACE FUNCTION public.is_crm_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin' AND ativo=true);
$$;
REVOKE ALL ON FUNCTION public.is_crm_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_crm_admin() TO authenticated;
CREATE OR REPLACE FUNCTION public.is_crm_member() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND ativo=true);
$$;
REVOKE ALL ON FUNCTION public.is_crm_member() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_crm_member() TO authenticated;

CREATE TABLE IF NOT EXISTS public.campaigns (
 id text PRIMARY KEY, external_id text NOT NULL, name text NOT NULL,
 source text NOT NULL DEFAULT 'meta', provider text NOT NULL DEFAULT 'zernio', platform text,
 status text NOT NULL, effective_status text NOT NULL,
 ad_account_id text, ad_account_name text, objective text, ad_count integer DEFAULT 0,
 start_time timestamptz, stop_time timestamptz, synced_at timestamptz,
 broker_ids uuid[] NOT NULL DEFAULT '{}', weights jsonb NOT NULL DEFAULT '{}',
 routing_enabled boolean NOT NULL DEFAULT false,
 daily_limit integer CHECK(daily_limit >= 0), created_at timestamptz DEFAULT now()
);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS campaign_id text REFERENCES public.campaigns(id),
 ADD COLUMN IF NOT EXISTS corretor_id uuid REFERENCES public.profiles(id),
 ADD COLUMN IF NOT EXISTS imovel_ref text,
 ADD COLUMN IF NOT EXISTS source_lead_id text,
 ADD COLUMN IF NOT EXISTS status_changed_at date;
CREATE UNIQUE INDEX IF NOT EXISTS leads_source_lead_unique ON public.leads(source_lead_id) WHERE source_lead_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS public.lead_assignments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 lead_id bigint NOT NULL UNIQUE REFERENCES public.leads(id) ON DELETE CASCADE,
 campaign_id text NOT NULL REFERENCES public.campaigns(id),
 broker_id uuid NOT NULL REFERENCES public.profiles(id), broker_name text NOT NULL,
 assigned_at timestamptz NOT NULL DEFAULT now(), reason text NOT NULL
);
CREATE INDEX IF NOT EXISTS assignments_campaign_broker_day ON public.lead_assignments(campaign_id,broker_id,assigned_at);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Campaign read" ON public.campaigns;
CREATE POLICY "Campaign read" ON public.campaigns FOR SELECT TO authenticated USING(public.is_crm_admin());
DROP POLICY IF EXISTS "Assignment read" ON public.lead_assignments;
CREATE POLICY "Assignment read" ON public.lead_assignments FOR SELECT TO authenticated USING(public.is_crm_member() AND (public.is_crm_admin() OR broker_id=auth.uid()));
-- Metadata writes are server-only. Rule writes and routing go through guarded RPCs.
REVOKE INSERT,UPDATE,DELETE ON public.campaigns,public.lead_assignments FROM authenticated,anon;
GRANT SELECT ON public.campaigns,public.lead_assignments TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_zernio_campaigns(p_rows jsonb,p_account_id text) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE entry jsonb; count_rows integer:=0;
BEGIN
 IF jsonb_typeof(p_rows)<>'array' THEN RAISE EXCEPTION 'Invalid campaign payload'; END IF;
 FOR entry IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
  IF entry->>'ad_account_id' IS DISTINCT FROM p_account_id THEN RAISE EXCEPTION 'Ad account mismatch'; END IF;
  INSERT INTO public.campaigns(id,external_id,name,source,provider,platform,status,effective_status,ad_account_id,ad_account_name,objective,ad_count,start_time,stop_time,synced_at)
  VALUES(entry->>'id',entry->>'external_id',entry->>'name','meta','zernio',entry->>'platform',entry->>'status',entry->>'effective_status',p_account_id,entry->>'ad_account_name',entry->>'objective',COALESCE((entry->>'ad_count')::integer,0),(entry->>'start_time')::timestamptz,(entry->>'stop_time')::timestamptz,(entry->>'synced_at')::timestamptz)
  ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,status=EXCLUDED.status,effective_status=EXCLUDED.effective_status,objective=EXCLUDED.objective,ad_count=EXCLUDED.ad_count,start_time=EXCLUDED.start_time,stop_time=EXCLUDED.stop_time,synced_at=EXCLUDED.synced_at;
  count_rows:=count_rows+1;
 END LOOP;
 UPDATE public.campaigns SET effective_status='UNAVAILABLE',synced_at=now()
 WHERE ad_account_id=p_account_id AND source='meta' AND id NOT IN(SELECT value->>'id' FROM jsonb_array_elements(p_rows));
 RETURN count_rows;
END;$$;
REVOKE ALL ON FUNCTION public.sync_zernio_campaigns(jsonb,text) FROM PUBLIC,authenticated,anon;
GRANT EXECUTE ON FUNCTION public.sync_zernio_campaigns(jsonb,text) TO service_role;

CREATE OR REPLACE FUNCTION public.save_campaign_rules(p_id text,p_broker_ids uuid[],p_weights jsonb,p_enabled boolean,p_daily_limit integer) RETURNS public.campaigns
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result public.campaigns; bid uuid; weight numeric;
BEGIN
 IF NOT public.is_crm_admin() THEN RAISE EXCEPTION 'Somente administradores podem editar a roleta.';END IF;
 IF p_daily_limit IS NOT NULL AND p_daily_limit<0 THEN RAISE EXCEPTION 'Limite diário inválido.';END IF;
 FOREACH bid IN ARRAY p_broker_ids LOOP
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=bid) THEN RAISE EXCEPTION 'Corretor não encontrado.';END IF;
  weight:=COALESCE((p_weights->>bid::text)::numeric,1);
  IF weight<0 OR weight>100 THEN RAISE EXCEPTION 'Peso deve estar entre 0 e 100.';END IF;
 END LOOP;
 UPDATE public.campaigns SET broker_ids=p_broker_ids,weights=p_weights,routing_enabled=p_enabled,daily_limit=p_daily_limit WHERE id=p_id RETURNING * INTO result;
 IF NOT FOUND THEN RAISE EXCEPTION 'Campanha não encontrada. Sincronize pela Zernio.';END IF;
 RETURN result;
END;$$;
REVOKE ALL ON FUNCTION public.save_campaign_rules(text,uuid[],jsonb,boolean,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_campaign_rules(text,uuid[],jsonb,boolean,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.route_lead(p_lead_id bigint,p_campaign_id text) RETURNS public.lead_assignments
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.campaigns; l public.leads; result public.lead_assignments; chosen public.profiles;
 day_start timestamptz:=date_trunc('day',now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
BEGIN
 IF NOT public.is_crm_admin() THEN RAISE EXCEPTION 'Somente administradores podem distribuir leads.';END IF;
 -- Campaign lock serializes weighted selection; lead lock protects idempotent retries.
 SELECT * INTO c FROM public.campaigns WHERE id=p_campaign_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Campanha não encontrada.';END IF;
 SELECT * INTO l FROM public.leads WHERE id=p_lead_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Lead não encontrado.';END IF;
 SELECT * INTO result FROM public.lead_assignments WHERE lead_id=p_lead_id;
 IF FOUND THEN RETURN result;END IF;
 IF l.corretor_id IS NOT NULL OR NULLIF(trim(l.corretor),'') IS NOT NULL THEN RAISE EXCEPTION 'O lead já tem um responsável.';END IF;
 IF l.campaign_id IS NOT NULL AND l.campaign_id<>p_campaign_id THEN RAISE EXCEPTION 'O lead pertence a outra campanha.';END IF;
 IF c.effective_status<>'ACTIVE' OR NOT c.routing_enabled THEN RAISE EXCEPTION 'Campanha ou distribuição inativa.';END IF;
 IF c.synced_at IS NULL OR c.synced_at<now()-interval '30 minutes' THEN RAISE EXCEPTION 'Sincronize a Zernio antes de distribuir.';END IF;
 IF (c.start_time IS NOT NULL AND c.start_time>now()) OR (c.stop_time IS NOT NULL AND c.stop_time<now()) THEN RAISE EXCEPTION 'Campanha fora do período ativo.';END IF;
 SELECT p.* INTO chosen FROM public.profiles p
 LEFT JOIN LATERAL(SELECT count(*) FILTER(WHERE a.assigned_at>=day_start) AS today,max(a.assigned_at) AS last_at FROM public.lead_assignments a WHERE a.campaign_id=c.id AND a.broker_id=p.id) h ON true
 WHERE p.id=ANY(c.broker_ids) AND p.ativo=true AND COALESCE((c.weights->>p.id::text)::numeric,1)>0 AND(c.daily_limit IS NULL OR h.today<c.daily_limit)
 ORDER BY h.today/COALESCE((c.weights->>p.id::text)::numeric,1),h.last_at ASC NULLS FIRST,p.id LIMIT 1;
 IF NOT FOUND THEN RAISE EXCEPTION 'Nenhum corretor elegível. Verifique participantes e limites.';END IF;
 INSERT INTO public.lead_assignments(lead_id,campaign_id,broker_id,broker_name,reason) VALUES(l.id,c.id,chosen.id,chosen.nome,'Distribuição ponderada por campanha') RETURNING * INTO result;
 UPDATE public.leads SET campaign_id=c.id,corretor_id=chosen.id,corretor=chosen.nome WHERE id=l.id;
 INSERT INTO public.comments(lead_id,autor,texto)VALUES(l.id,'Roleta VilaVix','Lead distribuído para '||chosen.nome||' pela campanha '||c.name||'.');
 RETURN result;
END;$$;
REVOKE ALL ON FUNCTION public.route_lead(bigint,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.route_lead(bigint,text) TO authenticated;

-- Read-only preview uses the full campaign history and the same ordering as route_lead.
-- Its snapshot is advisory; route_lead still selects again while holding the campaign lock.
CREATE OR REPLACE FUNCTION public.preview_campaign_routing(p_campaign_id text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.campaigns; eligible jsonb; reason text;
 day_start timestamptz:=date_trunc('day',now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
BEGIN
 IF NOT public.is_crm_admin() THEN RAISE EXCEPTION 'Somente administradores podem consultar a roleta.';END IF;
 SELECT * INTO c FROM public.campaigns WHERE id=p_campaign_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Campanha não encontrada. Sincronize a Zernio.';END IF;
 SELECT COALESCE(jsonb_agg(item ORDER BY score,last_at ASC NULLS FIRST,broker_id),'[]'::jsonb) INTO eligible
 FROM (
  SELECT p.id AS broker_id,h.last_at,
   h.today/COALESCE((c.weights->>p.id::text)::numeric,1) AS score,
   to_jsonb(p)||jsonb_build_object(
    'weight',COALESCE((c.weights->>p.id::text)::numeric,1),
    'assignedToday',h.today,'assignedTotal',h.total,
    'capacityRemaining',CASE WHEN c.daily_limit IS NULL THEN NULL ELSE GREATEST(0,c.daily_limit-h.today) END,
    'lastAssigned',COALESCE(EXTRACT(EPOCH FROM h.last_at)*1000,0)
   ) AS item
  FROM public.profiles p
  LEFT JOIN LATERAL(
   SELECT count(*) FILTER(WHERE a.assigned_at>=day_start) AS today,count(*) AS total,max(a.assigned_at) AS last_at
   FROM public.lead_assignments a WHERE a.campaign_id=c.id AND a.broker_id=p.id
  ) h ON true
  WHERE p.id=ANY(c.broker_ids) AND p.ativo=true
   AND COALESCE((c.weights->>p.id::text)::numeric,1)>0
   AND(c.daily_limit IS NULL OR h.today<c.daily_limit)
 ) ranked;
 IF c.effective_status<>'ACTIVE' THEN reason:='A campanha não está ativa na origem.';
 ELSIF c.synced_at IS NULL OR c.synced_at<now()-interval '30 minutes' THEN reason:='Sincronize as campanhas antes de distribuir leads.';
 ELSIF c.start_time IS NOT NULL AND c.start_time>now() THEN reason:='A campanha ainda não começou.';
 ELSIF c.stop_time IS NOT NULL AND c.stop_time<now() THEN reason:='O período da campanha terminou.';
 ELSIF NOT c.routing_enabled THEN reason:='Ative a distribuição desta campanha.';
 ELSIF jsonb_array_length(eligible)=0 THEN reason:='Nenhum corretor elegível: confira participantes, pausa e limite diário.';
 END IF;
 RETURN jsonb_build_object('campaign',to_jsonb(c),'eligibleBrokers',eligible,
  'nextBroker',CASE WHEN reason IS NULL THEN eligible->0 ELSE NULL END,'reason',reason);
END;$$;
REVOKE ALL ON FUNCTION public.preview_campaign_routing(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.preview_campaign_routing(text) TO authenticated;

-- Prevent self-promotion via editable user metadata or the legacy broad profile policy.
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.profiles(id,nome,email,foto,role,ativo)VALUES(NEW.id,COALESCE(NEW.raw_user_meta_data->>'nome',split_part(NEW.email,'@',1)),NEW.email,UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'nome',NEW.email),2)),'corretor',false);RETURN NEW;
END;$$;
DROP POLICY IF EXISTS "Profiles logado" ON public.profiles;
DROP POLICY IF EXISTS "Profiles leitura CRM" ON public.profiles;
CREATE POLICY "Profiles leitura CRM" ON public.profiles FOR SELECT TO authenticated USING(id=auth.uid() OR public.is_crm_member());
DROP POLICY IF EXISTS "Profiles administracao" ON public.profiles;
CREATE POLICY "Profiles administracao" ON public.profiles FOR UPDATE TO authenticated USING(public.is_crm_admin()) WITH CHECK(public.is_crm_admin());
COMMIT;
