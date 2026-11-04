-- Read-only supervision. Does not activate intake, transfer leads or change routing.
BEGIN;
SET LOCAL lock_timeout='5s';
CREATE INDEX IF NOT EXISTS reactivation_notes_case_time ON public.reactivation_notes(case_id,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS reactivation_notes_activity_time ON public.reactivation_notes(created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS reactivation_cases_received_time ON public.reactivation_cases(received_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS reactivation_cases_finished_time ON public.reactivation_cases(finished_at) WHERE finished_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.reactivation_admin_report(
 p_from date DEFAULT NULL,p_to date DEFAULT NULL,p_worker_id uuid DEFAULT NULL,
 p_status text DEFAULT 'all',p_query text DEFAULT '',p_page integer DEFAULT 1,p_activity_page integer DEFAULT 1
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE
 v_today date:=(now() AT TIME ZONE 'America/Sao_Paulo')::date;
 v_to date:=COALESCE(p_to,v_today); v_start timestamptz; v_end timestamptz;
 v_chart_start date; v_query text; v_result jsonb;
BEGIN
 IF NOT public.is_crm_admin() THEN RAISE EXCEPTION 'Somente administradores podem consultar a gestão do remalho.' USING ERRCODE='42501'; END IF;
 IF (p_from IS NOT NULL AND p_from>v_to) OR v_to>v_today THEN RAISE EXCEPTION 'Informe um período válido até hoje.'; END IF;
 IF p_status IS NULL OR p_status NOT IN ('all','active','reactivated','closed','overdue','untouched','due_today') THEN RAISE EXCEPTION 'Situação de acompanhamento inválida.'; END IF;
 IF COALESCE(p_page,1)<1 OR COALESCE(p_activity_page,1)<1 OR length(COALESCE(p_query,''))>200 THEN RAISE EXCEPTION 'Revise a busca ou a página solicitada.'; END IF;
 v_start:=p_from::timestamp AT TIME ZONE 'America/Sao_Paulo';
 v_end:=(v_to+1)::timestamp AT TIME ZONE 'America/Sao_Paulo';
 v_chart_start:=GREATEST(COALESCE(p_from,v_to-13),v_to-13);
 v_query:=translate(lower(btrim(COALESCE(p_query,''))),'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc');

 WITH base AS MATERIALIZED (
  SELECT c.*,p.nome AS worker_name,l.status AS lead_status,l.corretor AS current_owner,l.corretor_id AS current_owner_id,
   EXISTS(SELECT 1 FROM public.reactivation_notes n WHERE n.case_id=c.id) AS has_notes,
   translate(lower(concat_ws(' ',c.lead_name,c.interest,p.nome,c.previous_broker_name,c.returned_broker_name)),
    'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc') AS search_text
  FROM public.reactivation_cases c JOIN public.profiles p ON p.id=c.worker_id
  JOIN public.leads l ON l.id=c.lead_id WHERE p_worker_id IS NULL OR c.worker_id=p_worker_id
 ), period_notes AS MATERIALIZED (
  SELECT n.*,b.lead_id,b.lead_name,b.interest,b.worker_id,b.worker_name,b.status,b.previous_broker_name,b.returned_broker_name
  FROM public.reactivation_notes n JOIN base b ON b.id=n.case_id
  WHERE n.created_at>=COALESCE(v_start,'-infinity'::timestamptz) AND n.created_at<v_end
 ), period_finished AS MATERIALIZED (
  SELECT * FROM base b WHERE b.finished_at>=COALESCE(v_start,'-infinity'::timestamptz) AND b.finished_at<v_end
   AND b.status IN ('reactivated','closed')
 ), selected AS MATERIALIZED (
  SELECT * FROM base b WHERE (v_query='' OR strpos(b.search_text,v_query)>0) AND
   CASE p_status WHEN 'all' THEN true
    WHEN 'overdue' THEN b.status='active' AND b.next_contact_on<v_today
    WHEN 'due_today' THEN b.status='active' AND b.next_contact_on=v_today
    WHEN 'untouched' THEN b.status='active' AND NOT b.has_notes ELSE b.status=p_status END
 ), period_cases AS MATERIALIZED (
  SELECT * FROM selected b WHERE
   (b.received_at>=COALESCE(v_start,'-infinity'::timestamptz) AND b.received_at<v_end)
   OR (b.finished_at>=COALESCE(v_start,'-infinity'::timestamptz) AND b.finished_at<v_end)
   OR EXISTS(SELECT 1 FROM period_notes n WHERE n.case_id=b.id)
 ), selected_notes AS MATERIALIZED (
  SELECT n.* FROM period_notes n JOIN selected b ON b.id=n.case_id
 ), counts AS (
  SELECT (SELECT count(*) FROM period_cases) AS cases,(SELECT count(*) FROM selected_notes) AS activities
 ), bounds AS (
  SELECT *,GREATEST(1,LEAST(COALESCE(p_page,1),ceil(cases/20.0)::integer)) AS case_page,
   GREATEST(1,LEAST(COALESCE(p_activity_page,1),ceil(activities/20.0)::integer)) AS activity_page FROM counts
 ), case_page AS (
  SELECT b.id,b.lead_id,b.lead_name,b.interest,b.worker_id,b.worker_name,b.previous_broker_name,b.inactive_since,
   b.received_at,b.next_contact_on,b.status,b.finished_at,b.returned_broker_name,b.lead_status,b.current_owner,
   (SELECT count(*) FROM public.reactivation_notes n WHERE n.case_id=b.id) AS attempts,
   (SELECT n.created_at FROM public.reactivation_notes n WHERE n.case_id=b.id ORDER BY n.created_at DESC,n.id DESC LIMIT 1) AS last_attempt_at,
   (SELECT n.outcome FROM public.reactivation_notes n WHERE n.case_id=b.id ORDER BY n.created_at DESC,n.id DESC LIMIT 1) AS last_outcome,
   CASE WHEN b.status='active' AND b.next_contact_on<v_today THEN 0 WHEN b.status='active' THEN 1 ELSE 2 END AS sort_group
  FROM period_cases b ORDER BY sort_group,b.next_contact_on,b.received_at DESC,b.id DESC
  LIMIT 20 OFFSET (SELECT (case_page-1)*20 FROM bounds)
 ), activity_page AS (
  SELECT id,case_id,lead_id,lead_name,interest,worker_id,worker_name,status,previous_broker_name,returned_broker_name,author_id,author_name,body,outcome,created_at,
   author_id=worker_id AS by_worker FROM selected_notes ORDER BY created_at DESC,id DESC
  LIMIT 20 OFFSET (SELECT (activity_page-1)*20 FROM bounds)
 ), daily AS (
  SELECT (n.created_at AT TIME ZONE 'America/Sao_Paulo')::date AS day,count(*) AS attempts,
   count(*) FILTER(WHERE n.author_id=n.worker_id) AS worker_attempts
  FROM period_notes n GROUP BY 1
 ), chart AS (
  SELECT d::date AS day,COALESCE(n.attempts,0) AS attempts,COALESCE(n.worker_attempts,0) AS worker_attempts
  FROM generate_series(v_chart_start::timestamp,v_to::timestamp,interval '1 day') d LEFT JOIN daily n ON n.day=d::date
 ), deliveries AS (
  SELECT returned_broker_id AS broker_id,returned_broker_name AS broker_name,count(*) AS received,
   count(*) FILTER(WHERE lead_status='novo') AS new,
   count(*) FILTER(WHERE lead_status IN ('contato','atendimento','visita','proposta')) AS in_progress,
   count(*) FILTER(WHERE lead_status='fechado') AS won,
   count(*) FILTER(WHERE lead_status='descartado') AS lost,
   count(*) FILTER(WHERE current_owner_id IS DISTINCT FROM returned_broker_id) AS reassigned
  FROM period_finished WHERE status='reactivated' GROUP BY returned_broker_id,returned_broker_name
 ), workers AS (
  SELECT p.id,p.nome FROM public.profiles p WHERE
   EXISTS(SELECT 1 FROM public.reactivation_cases c WHERE c.worker_id=p.id)
   OR EXISTS(SELECT 1 FROM public.reactivation_settings s WHERE s.worker_id=p.id)
 )
 SELECT jsonb_build_object(
  'period',jsonb_build_object('from',p_from,'to',v_to,'today',v_today,'chartFrom',v_chart_start),
  'generatedAt',now(),
  'settings',(SELECT jsonb_build_object('enabled',s.enabled,'workerId',s.worker_id,'workerName',p.nome)
   FROM public.reactivation_settings s LEFT JOIN public.profiles p ON p.id=s.worker_id WHERE s.id),
  'workers',COALESCE((SELECT jsonb_agg(to_jsonb(w) ORDER BY nome,id) FROM workers w),'[]'::jsonb),
  'metrics',jsonb_build_object(
   'received',(SELECT count(*) FROM base WHERE received_at>=COALESCE(v_start,'-infinity'::timestamptz) AND received_at<v_end),
   'attempts',(SELECT count(*) FROM period_notes),
   'workerAttempts',(SELECT count(*) FROM period_notes WHERE author_id=worker_id),
   'supervisorAttempts',(SELECT count(*) FROM period_notes WHERE author_id<>worker_id),
   'contacted',(SELECT count(DISTINCT case_id) FROM period_notes),
   'reactivated',(SELECT count(*) FROM period_finished WHERE status='reactivated'),
   'closed',(SELECT count(*) FROM period_finished WHERE status='closed'),
   'reactivationRate',(SELECT round(100.0*count(*) FILTER(WHERE status='reactivated')/NULLIF(count(*),0),1) FROM period_finished)
  ),
  'queue',jsonb_build_object(
   'active',(SELECT count(*) FROM base WHERE status='active'),
   'dueToday',(SELECT count(*) FROM base WHERE status='active' AND next_contact_on=v_today),
   'overdue',(SELECT count(*) FROM base WHERE status='active' AND next_contact_on<v_today),
   'untouched',(SELECT count(*) FROM base WHERE status='active' AND NOT has_notes)
  ),
  'daily',COALESCE((SELECT jsonb_agg(to_jsonb(d) ORDER BY day) FROM chart d),'[]'::jsonb),
  'deliveries',COALESCE((SELECT jsonb_agg(to_jsonb(d) ORDER BY received DESC,broker_name,broker_id) FROM deliveries d),'[]'::jsonb),
  'cases',COALESCE((SELECT jsonb_agg(to_jsonb(c) ORDER BY sort_group,next_contact_on,received_at DESC,id DESC) FROM case_page c),'[]'::jsonb),
  'activities',COALESCE((SELECT jsonb_agg(to_jsonb(a) ORDER BY created_at DESC,id DESC) FROM activity_page a),'[]'::jsonb),
  'pagination',(SELECT jsonb_build_object('caseTotal',cases,'casePage',case_page,'activityTotal',activities,'activityPage',activity_page,'pageSize',20) FROM bounds)
 ) INTO v_result;
 RETURN v_result;
END;$$;
REVOKE ALL ON FUNCTION public.reactivation_admin_report(date,date,uuid,text,text,integer,integer) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.reactivation_admin_report(date,date,uuid,text,text,integer,integer) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
