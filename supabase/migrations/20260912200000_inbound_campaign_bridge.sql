-- Attach campaign routing to the existing lead INSERT, before its WhatsApp notification.
-- No existing lead is assigned, updated, notified, or removed by this migration.
BEGIN;

ALTER TABLE public.leads
 ADD COLUMN IF NOT EXISTS campanha text,
 ADD COLUMN IF NOT EXISTS external_id text,
 ADD COLUMN IF NOT EXISTS routing_source text,
 ADD COLUMN IF NOT EXISTS routing_status text,
 ADD COLUMN IF NOT EXISTS routing_reason text,
 ADD COLUMN IF NOT EXISTS routing_campaign_reference text,
 ADD COLUMN IF NOT EXISTS routing_assigned_at timestamptz;
CREATE INDEX IF NOT EXISTS leads_campaign_pending_audit
 ON public.leads(campaign_id,corretor_id,routing_assigned_at)
 WHERE routing_source='campaign' AND routing_status='assigned';

-- Private helpers are shared by automatic INSERT routing and the guarded admin RPC.
CREATE OR REPLACE FUNCTION public.campaign_routing_block_reason(p_campaign public.campaigns)
RETURNS text LANGUAGE plpgsql STABLE SET search_path=public AS $$
BEGIN
 IF p_campaign.id IS NULL THEN RETURN 'Campanha não encontrada.'; END IF;
 IF p_campaign.status IS DISTINCT FROM 'ACTIVE' OR p_campaign.effective_status IS DISTINCT FROM 'ACTIVE'
  THEN RETURN 'Campanha inativa na origem.'; END IF;
 IF NOT p_campaign.routing_enabled THEN RETURN 'Distribuição da campanha desativada.'; END IF;
 IF p_campaign.synced_at IS NULL OR p_campaign.synced_at < now()-interval '30 minutes'
  THEN RETURN 'Campanha sem sincronização recente da Zernio.'; END IF;
 IF p_campaign.start_time > now() OR p_campaign.stop_time < now()
  THEN RETURN 'Campanha fora do período ativo.'; END IF;
 RETURN NULL;
END;$$;
REVOKE ALL ON FUNCTION public.campaign_routing_block_reason(public.campaigns) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.campaign_routing_candidates(p_campaign_id text)
RETURNS TABLE(broker_id uuid,broker_name text,assigned_today bigint,last_assigned timestamptz,score numeric)
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=public AS $$
 SELECT p.id,p.nome,h.today,h.last_at,h.today / COALESCE((c.weights->>p.id::text)::numeric,1)
 FROM public.campaigns c
 JOIN public.profiles p ON p.id=ANY(c.broker_ids) AND p.ativo=true
 LEFT JOIN LATERAL (
  SELECT count(*) FILTER(WHERE history.assigned_at >= (date_trunc('day',now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo')) AS today,
   max(history.assigned_at) AS last_at
  FROM (
   SELECT a.lead_id,a.assigned_at FROM public.lead_assignments a WHERE a.campaign_id=c.id AND a.broker_id=p.id
   UNION ALL
   -- AFTER ROW triggers run at the end of a statement. Include earlier rows from
   -- the same bulk INSERT until their audit rows exist, without counting them twice.
   SELECT l.id,l.routing_assigned_at FROM public.leads l
   WHERE l.campaign_id=c.id AND l.corretor_id=p.id AND l.routing_source='campaign' AND l.routing_status='assigned'
    AND NOT EXISTS(SELECT 1 FROM public.lead_assignments a WHERE a.lead_id=l.id)
  ) history
 ) h ON true
 WHERE c.id=p_campaign_id AND COALESCE((c.weights->>p.id::text)::numeric,1)>0
  AND (c.daily_limit IS NULL OR h.today<c.daily_limit)
 ORDER BY h.today / COALESCE((c.weights->>p.id::text)::numeric,1),h.last_at ASC NULLS FIRST,p.id;
$$;
REVOKE ALL ON FUNCTION public.campaign_routing_candidates(text) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.assign_lead_campaign_on_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.campaigns; chosen record; reference text; matches_count integer;
 candidate_ids text[]; explicit_campaign boolean; meta_origin boolean; blocked text;
BEGIN
 -- Never trust caller-supplied bookkeeping fields, even on service-role inserts.
 NEW.routing_source:='legacy'; NEW.routing_status:='legacy'; NEW.routing_reason:=NULL;
 NEW.routing_assigned_at:=NULL; NEW.routing_campaign_reference:=NULL;
 reference:=COALESCE(NULLIF(btrim(NEW.campaign_id),''),NULLIF(btrim(NEW.campanha),''));
 explicit_campaign:=NULLIF(btrim(NEW.campaign_id),'') IS NOT NULL;
 meta_origin:=COALESCE(NEW.origem,'') ~* '(meta|facebook|instagram)';
 NEW.routing_campaign_reference:=reference;

 -- An explicitly selected owner remains a manual assignment, as in the legacy flow.
 IF NEW.corretor_id IS NOT NULL OR NULLIF(btrim(NEW.corretor),'') IS NOT NULL THEN
  IF NEW.corretor_id IS NOT NULL THEN
   SELECT nome INTO NEW.corretor FROM public.profiles WHERE id=NEW.corretor_id;
  END IF;
  NEW.routing_source:='manual'; NEW.routing_status:='manual';
  RETURN NEW;
 END IF;

 IF reference IS NOT NULL THEN
  -- Canonical identifier wins. Names resolve only when they identify one campaign;
  -- substring matching can send two similarly named campaigns to the wrong brokers.
  SELECT array_agg(id) INTO candidate_ids FROM public.campaigns WHERE id=reference;
  IF COALESCE(cardinality(candidate_ids),0)=0 THEN
   SELECT array_agg(id) INTO candidate_ids FROM public.campaigns WHERE external_id=reference;
  END IF;
  IF COALESCE(cardinality(candidate_ids),0)=0 AND NOT explicit_campaign THEN
   SELECT array_agg(id) INTO candidate_ids FROM public.campaigns WHERE lower(btrim(name))=lower(reference) AND source='meta';
  END IF;
 END IF;
 matches_count:=COALESCE(cardinality(candidate_ids),0);
 IF matches_count<>1 THEN
  IF meta_origin OR explicit_campaign OR matches_count>1 THEN
   -- Keep the lead for review and preserve the existing company-level notification.
   -- Crucially, the legacy fallback cannot distribute an unidentified Meta lead.
   NEW.campaign_id:=NULL; NEW.routing_source:='campaign'; NEW.routing_status:='pending';
   NEW.routing_reason:=CASE WHEN matches_count>1 THEN 'Nome de campanha ambíguo. Identifique a campanha pelo ID.'
    WHEN reference IS NULL THEN 'Lead da Meta sem identificação de campanha.'
    ELSE 'Campanha ainda não encontrada na sincronização da Zernio.' END;
  END IF;
  RETURN NEW;
 END IF;

 SELECT * INTO c FROM public.campaigns WHERE id=candidate_ids[1] FOR UPDATE;
 NEW.campaign_id:=c.id; NEW.routing_source:='campaign'; NEW.routing_status:='pending';
 blocked:=public.campaign_routing_block_reason(c);
 IF blocked IS NOT NULL THEN NEW.routing_reason:=blocked; RETURN NEW; END IF;
 SELECT * INTO chosen FROM public.campaign_routing_candidates(c.id) LIMIT 1;
 IF NOT FOUND THEN NEW.routing_reason:='Nenhum corretor elegível. Confira participantes, pausas e limite diário.'; RETURN NEW; END IF;
 NEW.corretor_id:=chosen.broker_id; NEW.corretor:=chosen.broker_name;
 NEW.routing_status:='assigned'; NEW.routing_assigned_at:=now();
 NEW.routing_reason:='Distribuição automática ponderada por campanha';
 RETURN NEW;
END;$$;
REVOKE ALL ON FUNCTION public.assign_lead_campaign_on_insert() FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE TRIGGER leads_00_campaign_route
 BEFORE INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION public.assign_lead_campaign_on_insert();

-- Retain the real legacy function (rules/configuration) and invoke it only for leads
-- outside campaign routing. Do not replace its body or its notification counterpart.
DO $$
BEGIN
 IF to_regprocedure('public.assign_corretor_roleta()') IS NOT NULL THEN
  IF EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.leads'::regclass AND tgname='leads_roleta' AND NOT tgisinternal
   AND (tgtype<>7 OR tgfoid<>'public.assign_corretor_roleta()'::regprocedure OR tgenabled<>'O')) THEN
   RAISE EXCEPTION 'A roleta legada mudou ou está desativada. Revise o trigger antes de aplicar a integração.';
  END IF;
  EXECUTE 'CREATE OR REPLACE TRIGGER leads_roleta BEFORE INSERT ON public.leads FOR EACH ROW WHEN (NEW.routing_source = ''legacy'') EXECUTE FUNCTION public.assign_corretor_roleta()';
 END IF;
END;$$;

CREATE OR REPLACE FUNCTION public.audit_inbound_campaign_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE inserted_id uuid; campaign_name text;
BEGIN
 IF NEW.routing_source='campaign' AND NEW.routing_status='assigned' THEN
  INSERT INTO public.lead_assignments(lead_id,campaign_id,broker_id,broker_name,assigned_at,reason)
  VALUES(NEW.id,NEW.campaign_id,NEW.corretor_id,NEW.corretor,NEW.routing_assigned_at,NEW.routing_reason)
  ON CONFLICT(lead_id) DO NOTHING RETURNING id INTO inserted_id;
  IF inserted_id IS NOT NULL THEN
   SELECT name INTO campaign_name FROM public.campaigns WHERE id=NEW.campaign_id;
   INSERT INTO public.comments(lead_id,autor,texto) VALUES(NEW.id,'Roleta VilaVix','Lead distribuído para '||NEW.corretor||' pela campanha '||campaign_name||'.');
  END IF;
 END IF;
 RETURN NEW;
END;$$;
REVOKE ALL ON FUNCTION public.audit_inbound_campaign_assignment() FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE TRIGGER leads_campaign_audit
 AFTER INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION public.audit_inbound_campaign_assignment();
-- PostgreSQL runs same-event row triggers alphabetically: campaign_audit precedes
-- leads_notify_whatsapp. That existing trigger receives NEW with the final owner.

CREATE OR REPLACE FUNCTION public.route_lead(p_lead_id bigint,p_campaign_id text)
RETURNS public.lead_assignments LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.campaigns; l public.leads; result public.lead_assignments; chosen record; blocked text;
BEGIN
 IF NOT public.is_crm_admin() THEN RAISE EXCEPTION 'Somente administradores podem distribuir leads.'; END IF;
 SELECT * INTO c FROM public.campaigns WHERE id=p_campaign_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Campanha não encontrada.'; END IF;
 SELECT * INTO l FROM public.leads WHERE id=p_lead_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Lead não encontrado.'; END IF;
 SELECT * INTO result FROM public.lead_assignments WHERE lead_id=p_lead_id;
 IF FOUND THEN
  IF result.campaign_id<>p_campaign_id THEN RAISE EXCEPTION 'O lead pertence a outra campanha.'; END IF;
  RETURN result;
 END IF;
 IF l.corretor_id IS NOT NULL OR NULLIF(btrim(l.corretor),'') IS NOT NULL THEN RAISE EXCEPTION 'O lead já tem um responsável.'; END IF;
 IF l.campaign_id IS NOT NULL AND l.campaign_id<>p_campaign_id THEN RAISE EXCEPTION 'O lead pertence a outra campanha.'; END IF;
 blocked:=public.campaign_routing_block_reason(c);
 IF blocked IS NOT NULL THEN RAISE EXCEPTION '%',blocked; END IF;
 SELECT * INTO chosen FROM public.campaign_routing_candidates(c.id) LIMIT 1;
 IF NOT FOUND THEN RAISE EXCEPTION 'Nenhum corretor elegível. Verifique participantes e limites.'; END IF;
 INSERT INTO public.lead_assignments(lead_id,campaign_id,broker_id,broker_name,reason)
 VALUES(l.id,c.id,chosen.broker_id,chosen.broker_name,'Distribuição ponderada por campanha') RETURNING * INTO result;
 UPDATE public.leads SET campaign_id=c.id,corretor_id=chosen.broker_id,corretor=chosen.broker_name,
  routing_source='campaign',routing_status='assigned',routing_reason=result.reason,routing_assigned_at=result.assigned_at WHERE id=l.id;
 INSERT INTO public.comments(lead_id,autor,texto)VALUES(l.id,'Roleta VilaVix','Lead distribuído para '||chosen.broker_name||' pela campanha '||c.name||'.');
 RETURN result;
END;$$;
REVOKE ALL ON FUNCTION public.route_lead(bigint,text) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.route_lead(bigint,text) TO authenticated;
COMMIT;
