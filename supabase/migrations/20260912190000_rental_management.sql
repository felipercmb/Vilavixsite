BEGIN;
-- Membership is intentionally empty. Provision verified profile UUIDs through the
-- SQL console/service role only; CRM administrators do not implicitly have access.
CREATE TABLE IF NOT EXISTS public.rental_members (
 profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 enabled boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION public.has_rental_access() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS (
  SELECT 1 FROM public.rental_members m JOIN public.profiles p ON p.id=m.profile_id
  WHERE m.profile_id=auth.uid() AND m.enabled AND p.ativo=true
 );
$$;
CREATE OR REPLACE FUNCTION public.require_rental_access() RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.has_rental_access() THEN RAISE EXCEPTION 'Acesso à carteira de aluguel não autorizado. Fale com o responsável pela liberação.' USING ERRCODE='42501'; END IF;
END;$$;

CREATE TABLE IF NOT EXISTS public.rental_properties (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), catalog_ref text,
 title text NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 240),
 address text NOT NULL DEFAULT '' CHECK(length(address)<=1000),
 owner_name text NOT NULL CHECK(length(trim(owner_name)) BETWEEN 1 AND 240),
 owner_contact text NOT NULL DEFAULT '' CHECK(length(owner_contact)<=500),
 notes text NOT NULL DEFAULT '' CHECK(length(notes)<=8000), archived boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.rental_contracts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), property_id uuid NOT NULL REFERENCES public.rental_properties(id),
 tenant_name text NOT NULL CHECK(length(trim(tenant_name)) BETWEEN 1 AND 240),
 tenant_contact text NOT NULL DEFAULT '' CHECK(length(tenant_contact)<=500),
 start_date date NOT NULL, end_date date,
 rent_cents bigint NOT NULL CHECK(rent_cents BETWEEN 1 AND 100000000000),
 admin_fee_bps integer NOT NULL DEFAULT 0 CHECK(admin_fee_bps BETWEEN 0 AND 10000),
 due_day integer NOT NULL CHECK(due_day BETWEEN 1 AND 31),
 transfer_day integer NOT NULL CHECK(transfer_day BETWEEN 1 AND 31),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','ended')),
 adjustment_date date, adjustment_index text NOT NULL DEFAULT '' CHECK(length(adjustment_index)<=100),
 notes text NOT NULL DEFAULT '' CHECK(length(notes)<=8000),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(end_date IS NULL OR end_date>=start_date), CHECK(status<>'ended' OR end_date IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS public.rental_charges (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), contract_id uuid NOT NULL REFERENCES public.rental_contracts(id),
 reference_month date NOT NULL CHECK(EXTRACT(day FROM reference_month)=1), due_date date NOT NULL, transfer_date date NOT NULL,
 amount_cents bigint NOT NULL CHECK(amount_cents BETWEEN 1 AND 100000000000),
 admin_fee_bps integer NOT NULL CHECK(admin_fee_bps BETWEEN 0 AND 10000),
 received_cents bigint NOT NULL DEFAULT 0 CHECK(received_cents>=0),
 payout_cents bigint NOT NULL DEFAULT 0 CHECK(payout_cents>=0),
 fee_cents bigint NOT NULL DEFAULT 0 CHECK(fee_cents>=0),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(contract_id,reference_month),
 CHECK(received_cents<=amount_cents), CHECK(payout_cents+fee_cents<=received_cents)
);
CREATE TABLE IF NOT EXISTS public.rental_receipts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), charge_id uuid NOT NULL REFERENCES public.rental_charges(id),
 amount_cents bigint NOT NULL CHECK(amount_cents BETWEEN 1 AND 100000000000), date date NOT NULL,
 method text NOT NULL DEFAULT 'transferencia' CHECK(length(method)<=80), note text NOT NULL DEFAULT '' CHECK(length(note)<=4000),
 request_id uuid NOT NULL UNIQUE, created_by uuid NOT NULL REFERENCES public.profiles(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.rental_payouts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), charge_id uuid NOT NULL REFERENCES public.rental_charges(id),
 amount_cents bigint NOT NULL CHECK(amount_cents BETWEEN 1 AND 100000000000), date date NOT NULL,
 note text NOT NULL DEFAULT '' CHECK(length(note)<=4000), request_id uuid NOT NULL UNIQUE,
 created_by uuid NOT NULL REFERENCES public.profiles(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.rental_issues (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), property_id uuid NOT NULL REFERENCES public.rental_properties(id),
 title text NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 240), description text NOT NULL DEFAULT '' CHECK(length(description)<=8000),
 priority text NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high')),
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','resolved')), due_date date,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.rental_documents (
 id uuid PRIMARY KEY, contract_id uuid NOT NULL REFERENCES public.rental_contracts(id),
 name text NOT NULL CHECK(length(name) BETWEEN 1 AND 240), storage_path text NOT NULL UNIQUE,
 size_bytes integer NOT NULL CHECK(size_bytes BETWEEN 1 AND 10485760),
 mime_type text NOT NULL CHECK(mime_type IN ('application/pdf','image/jpeg','image/png')),
 uploaded_by uuid NOT NULL REFERENCES public.profiles(id), created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(storage_path=contract_id::text||'/'||id::text||CASE mime_type WHEN 'application/pdf' THEN '.pdf' WHEN 'image/jpeg' THEN '.jpg' ELSE '.png' END)
);
CREATE TABLE IF NOT EXISTS public.rental_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid REFERENCES public.profiles(id),
 action text NOT NULL, entity_type text NOT NULL, entity_id uuid NOT NULL,
 details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rental_contracts_property_idx ON public.rental_contracts(property_id);
CREATE INDEX IF NOT EXISTS rental_receipts_charge_idx ON public.rental_receipts(charge_id);
CREATE INDEX IF NOT EXISTS rental_payouts_charge_idx ON public.rental_payouts(charge_id);
CREATE INDEX IF NOT EXISTS rental_documents_contract_idx ON public.rental_documents(contract_id);
CREATE INDEX IF NOT EXISTS rental_audit_entity_idx ON public.rental_audit(entity_id,created_at DESC);

-- Read access is shared by the selected members. Every write goes through guarded
-- functions, so client-side totals, membership changes and ledger edits are rejected.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['rental_members','rental_properties','rental_contracts','rental_charges','rental_receipts','rental_payouts','rental_issues','rental_documents','rental_audit'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated',t);
  EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
  EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
  EXECUTE format('DROP POLICY IF EXISTS rental_private_read ON public.%I',t);
  EXECUTE format('CREATE POLICY rental_private_read ON public.%I FOR SELECT TO authenticated USING(public.has_rental_access())',t);
 END LOOP;
END;$$;

CREATE OR REPLACE FUNCTION public.audit_rental_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.rental_audit(actor_id,action,entity_type,entity_id,details)
 VALUES(auth.uid(),lower(TG_OP),TG_TABLE_NAME,NEW.id,
  CASE WHEN TG_OP='UPDATE' THEN jsonb_build_object('before',to_jsonb(OLD),'after',to_jsonb(NEW)) ELSE jsonb_build_object('after',to_jsonb(NEW)) END);
 RETURN NEW;
END;$$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['rental_properties','rental_contracts','rental_receipts','rental_payouts','rental_issues','rental_documents'] LOOP
  EXECUTE format('DROP TRIGGER IF EXISTS rental_audit_change ON public.%I',t);
  EXECUTE format('CREATE TRIGGER rental_audit_change AFTER INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_rental_change()',t);
 END LOOP;
END;$$;
CREATE OR REPLACE FUNCTION public.audit_rental_membership() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.rental_audit(actor_id,action,entity_type,entity_id,details)
 VALUES(auth.uid(),lower(TG_OP),'rental_members',COALESCE(NEW.profile_id,OLD.profile_id),
  jsonb_build_object('before',CASE WHEN TG_OP<>'INSERT' THEN to_jsonb(OLD) ELSE NULL END,'after',CASE WHEN TG_OP<>'DELETE' THEN to_jsonb(NEW) ELSE NULL END));
 RETURN NULL;
END;$$;
DROP TRIGGER IF EXISTS rental_membership_audit ON public.rental_members;
CREATE TRIGGER rental_membership_audit AFTER INSERT OR UPDATE OR DELETE ON public.rental_members
 FOR EACH ROW EXECUTE FUNCTION public.audit_rental_membership();
CREATE OR REPLACE FUNCTION public.rental_immutable_ledger() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Lançamentos financeiros e histórico são imutáveis.' USING ERRCODE='42501'; END;$$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['rental_receipts','rental_payouts','rental_audit'] LOOP
  EXECUTE format('DROP TRIGGER IF EXISTS rental_immutable ON public.%I',t);
  EXECUTE format('CREATE TRIGGER rental_immutable BEFORE UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.rental_immutable_ledger()',t);
 END LOOP;
END;$$;

CREATE OR REPLACE FUNCTION public.save_rental_property(p_values jsonb) RETURNS public.rental_properties
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.rental_properties; v_id uuid:=COALESCE((p_values->>'id')::uuid,gen_random_uuid()); BEGIN
 PERFORM public.require_rental_access();
 PERFORM 1 FROM public.rental_properties WHERE id=v_id FOR UPDATE;
 IF COALESCE((p_values->>'archived')::boolean,false) AND EXISTS(SELECT 1 FROM public.rental_contracts WHERE property_id=v_id AND status='active') THEN
  RAISE EXCEPTION 'Encerre os contratos ativos antes de arquivar o imóvel.';
 END IF;
 INSERT INTO public.rental_properties(id,catalog_ref,title,address,owner_name,owner_contact,notes,archived)
 VALUES(v_id,NULLIF(p_values->>'catalog_ref',''),p_values->>'title',COALESCE(p_values->>'address',''),p_values->>'owner_name',COALESCE(p_values->>'owner_contact',''),COALESCE(p_values->>'notes',''),COALESCE((p_values->>'archived')::boolean,false))
 ON CONFLICT(id) DO UPDATE SET catalog_ref=EXCLUDED.catalog_ref,title=EXCLUDED.title,address=EXCLUDED.address,owner_name=EXCLUDED.owner_name,owner_contact=EXCLUDED.owner_contact,notes=EXCLUDED.notes,archived=EXCLUDED.archived,updated_at=now()
 RETURNING * INTO r; RETURN r;
END;$$;
CREATE OR REPLACE FUNCTION public.save_rental_contract(p_values jsonb) RETURNS public.rental_contracts
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.rental_contracts; old_row public.rental_contracts; v_id uuid:=COALESCE((p_values->>'id')::uuid,gen_random_uuid()); prop uuid:=(p_values->>'property_id')::uuid; BEGIN
 PERFORM public.require_rental_access();
 PERFORM 1 FROM public.rental_properties WHERE id=prop AND NOT archived FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Selecione um imóvel ativo da carteira.'; END IF;
 SELECT * INTO old_row FROM public.rental_contracts WHERE id=v_id FOR UPDATE;
 IF old_row.id IS NOT NULL AND EXISTS(SELECT 1 FROM public.rental_charges WHERE contract_id=v_id) AND (prop<>old_row.property_id OR p_values->>'status'='draft') THEN
  RAISE EXCEPTION 'Um contrato com cobranças não pode trocar de imóvel ou voltar a rascunho.';
 END IF;
 IF p_values->>'status'<>'draft' AND EXISTS(
  SELECT 1 FROM public.rental_contracts c WHERE c.property_id=prop AND c.id<>v_id AND c.status<>'draft'
   AND daterange(c.start_date,c.end_date,'[]') && daterange((p_values->>'start_date')::date,NULLIF(p_values->>'end_date','')::date,'[]')
 ) THEN RAISE EXCEPTION 'Já existe um contrato neste imóvel para esse período. Revise as datas.'; END IF;
 IF EXISTS(SELECT 1 FROM public.rental_charges WHERE contract_id=v_id AND
  (reference_month>(NULLIF(p_values->>'end_date',''))::date OR (reference_month+interval '1 month - 1 day')::date<(p_values->>'start_date')::date)) THEN
  RAISE EXCEPTION 'As novas datas deixariam cobranças existentes fora do período do contrato.';
 END IF;
 INSERT INTO public.rental_contracts(id,property_id,tenant_name,tenant_contact,start_date,end_date,rent_cents,admin_fee_bps,due_day,transfer_day,status,adjustment_date,adjustment_index,notes)
 VALUES(v_id,prop,p_values->>'tenant_name',COALESCE(p_values->>'tenant_contact',''),(p_values->>'start_date')::date,NULLIF(p_values->>'end_date','')::date,(p_values->>'rent_cents')::bigint,(p_values->>'admin_fee_bps')::integer,(p_values->>'due_day')::integer,(p_values->>'transfer_day')::integer,COALESCE(p_values->>'status','draft'),NULLIF(p_values->>'adjustment_date','')::date,COALESCE(p_values->>'adjustment_index',''),COALESCE(p_values->>'notes',''))
 ON CONFLICT(id) DO UPDATE SET property_id=EXCLUDED.property_id,tenant_name=EXCLUDED.tenant_name,tenant_contact=EXCLUDED.tenant_contact,start_date=EXCLUDED.start_date,end_date=EXCLUDED.end_date,rent_cents=EXCLUDED.rent_cents,admin_fee_bps=EXCLUDED.admin_fee_bps,due_day=EXCLUDED.due_day,transfer_day=EXCLUDED.transfer_day,status=EXCLUDED.status,adjustment_date=EXCLUDED.adjustment_date,adjustment_index=EXCLUDED.adjustment_index,notes=EXCLUDED.notes,updated_at=now()
 RETURNING * INTO r; RETURN r;
END;$$;
CREATE OR REPLACE FUNCTION public.save_rental_issue(p_values jsonb) RETURNS public.rental_issues
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.rental_issues; BEGIN
 PERFORM public.require_rental_access();
 INSERT INTO public.rental_issues(id,property_id,title,description,priority,status,due_date)
 VALUES(COALESCE((p_values->>'id')::uuid,gen_random_uuid()),(p_values->>'property_id')::uuid,p_values->>'title',COALESCE(p_values->>'description',''),COALESCE(p_values->>'priority','normal'),COALESCE(p_values->>'status','open'),NULLIF(p_values->>'due_date','')::date)
 ON CONFLICT(id) DO UPDATE SET property_id=EXCLUDED.property_id,title=EXCLUDED.title,description=EXCLUDED.description,priority=EXCLUDED.priority,status=EXCLUDED.status,due_date=EXCLUDED.due_date,updated_at=now()
 RETURNING * INTO r; RETURN r;
END;$$;
CREATE OR REPLACE FUNCTION public.generate_rental_charges(p_month date) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.rental_contracts; v_id uuid; added integer:=0; total integer; last_day integer; BEGIN
 PERFORM public.require_rental_access();
 IF p_month IS NULL OR EXTRACT(day FROM p_month)<>1 THEN RAISE EXCEPTION 'Informe o primeiro dia da competência.'; END IF;
 IF p_month>date_trunc('month',now() AT TIME ZONE 'America/Sao_Paulo')::date THEN RAISE EXCEPTION 'Gere cobranças da competência atual ou de meses anteriores.'; END IF;
 last_day:=EXTRACT(day FROM p_month+interval '1 month - 1 day');
 FOR c IN SELECT rc.* FROM public.rental_contracts rc JOIN public.rental_properties rp ON rp.id=rc.property_id
  WHERE rc.status<>'draft' AND NOT rp.archived AND rc.start_date<=(p_month+interval '1 month - 1 day')::date AND (rc.end_date IS NULL OR rc.end_date>=p_month)
  ORDER BY rc.id FOR UPDATE OF rc LOOP
  v_id:=NULL;
  INSERT INTO public.rental_charges(contract_id,reference_month,due_date,transfer_date,amount_cents,admin_fee_bps)
  VALUES(c.id,p_month,p_month+(LEAST(c.due_day,last_day)-1),p_month+(LEAST(c.transfer_day,last_day)-1),c.rent_cents,c.admin_fee_bps)
  ON CONFLICT(contract_id,reference_month) DO NOTHING RETURNING id INTO v_id;
  IF v_id IS NOT NULL THEN
   added:=added+1;
   INSERT INTO public.rental_audit(actor_id,action,entity_type,entity_id,details) VALUES(auth.uid(),'generate','rental_charges',v_id,jsonb_build_object('contract_id',c.id,'reference_month',p_month,'amount_cents',c.rent_cents));
  END IF;
 END LOOP;
 SELECT count(*)::integer INTO total FROM public.rental_charges WHERE reference_month=p_month;
 RETURN jsonb_build_object('created',added,'total',total);
END;$$;
CREATE OR REPLACE FUNCTION public.adjust_rental_charge(p_charge_id uuid,p_amount_cents bigint,p_reason text) RETURNS public.rental_charges
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.rental_charges; before_row jsonb; BEGIN
 PERFORM public.require_rental_access();
 SELECT * INTO c FROM public.rental_charges WHERE id=p_charge_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Cobrança não encontrada.'; END IF;
 IF c.received_cents<>0 OR EXISTS(SELECT 1 FROM public.rental_receipts WHERE charge_id=c.id) THEN RAISE EXCEPTION 'Uma cobrança com recebimentos não pode ter o valor alterado.'; END IF;
 IF p_amount_cents IS NULL OR p_amount_cents<1 OR p_amount_cents>100000000000 THEN RAISE EXCEPTION 'Informe um valor positivo válido em centavos.'; END IF;
 IF p_reason IS NULL OR length(trim(p_reason))<3 OR length(p_reason)>4000 THEN RAISE EXCEPTION 'Informe o motivo do ajuste, com pelo menos três caracteres.'; END IF;
 before_row:=to_jsonb(c);
 UPDATE public.rental_charges SET amount_cents=p_amount_cents WHERE id=c.id RETURNING * INTO c;
 INSERT INTO public.rental_audit(actor_id,action,entity_type,entity_id,details)
 VALUES(auth.uid(),'adjust','rental_charges',c.id,jsonb_build_object('before',before_row,'after',to_jsonb(c),'reason',trim(p_reason)));
 RETURN c;
END;$$;
CREATE OR REPLACE FUNCTION public.record_rental_receipt(p_charge_id uuid,p_amount_cents bigint,p_date date,p_method text,p_note text,p_request_id uuid) RETURNS public.rental_receipts
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.rental_charges; r public.rental_receipts; received bigint; BEGIN
 PERFORM public.require_rental_access();
 -- A request-level lock also prevents the same retry key being reused concurrently on another charge.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,913));
 SELECT * INTO r FROM public.rental_receipts WHERE request_id=p_request_id;
 IF FOUND THEN
  IF r.charge_id<>p_charge_id OR r.amount_cents<>p_amount_cents OR r.date<>p_date OR r.method IS DISTINCT FROM p_method OR r.note IS DISTINCT FROM COALESCE(p_note,'') OR r.created_by<>auth.uid() THEN RAISE EXCEPTION 'Identificador de recebimento já usado com outros dados.'; END IF;
  RETURN r;
 END IF;
 SELECT * INTO c FROM public.rental_charges WHERE id=p_charge_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Cobrança não encontrada.'; END IF;
 IF p_amount_cents IS NULL OR p_amount_cents<=0 OR p_amount_cents>c.amount_cents-c.received_cents THEN RAISE EXCEPTION 'O valor excede o saldo em aberto desta cobrança ou não é positivo.'; END IF;
 IF p_date IS NULL OR p_date>(now() AT TIME ZONE 'America/Sao_Paulo')::date THEN RAISE EXCEPTION 'Informe a data em que o recebimento aconteceu, sem data futura.'; END IF;
 INSERT INTO public.rental_receipts(charge_id,amount_cents,date,method,note,request_id,created_by)
 VALUES(p_charge_id,p_amount_cents,p_date,p_method,COALESCE(p_note,''),p_request_id,auth.uid()) RETURNING * INTO r;
 SELECT sum(amount_cents)::bigint INTO received FROM public.rental_receipts WHERE charge_id=p_charge_id;
 UPDATE public.rental_charges SET received_cents=received,fee_cents=round(received::numeric*c.admin_fee_bps/10000)::bigint WHERE id=p_charge_id;
 RETURN r;
END;$$;
CREATE OR REPLACE FUNCTION public.record_rental_payout(p_charge_id uuid,p_amount_cents bigint,p_date date,p_note text,p_request_id uuid) RETURNS public.rental_payouts
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.rental_charges; r public.rental_payouts; paid bigint; BEGIN
 PERFORM public.require_rental_access();
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,914));
 SELECT * INTO r FROM public.rental_payouts WHERE request_id=p_request_id;
 IF FOUND THEN
  IF r.charge_id<>p_charge_id OR r.amount_cents<>p_amount_cents OR r.date<>p_date OR r.note IS DISTINCT FROM COALESCE(p_note,'') OR r.created_by<>auth.uid() THEN RAISE EXCEPTION 'Identificador de repasse já usado com outros dados.'; END IF;
  RETURN r;
 END IF;
 SELECT * INTO c FROM public.rental_charges WHERE id=p_charge_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Cobrança não encontrada.'; END IF;
 IF p_amount_cents IS NULL OR p_amount_cents<=0 OR p_amount_cents>c.received_cents-c.fee_cents-c.payout_cents THEN RAISE EXCEPTION 'O repasse excede o saldo recebido disponível, após a taxa de administração, ou não é positivo.'; END IF;
 IF p_date IS NULL OR p_date>(now() AT TIME ZONE 'America/Sao_Paulo')::date THEN RAISE EXCEPTION 'Informe a data em que o repasse aconteceu, sem data futura.'; END IF;
 INSERT INTO public.rental_payouts(charge_id,amount_cents,date,note,request_id,created_by)
 VALUES(p_charge_id,p_amount_cents,p_date,COALESCE(p_note,''),p_request_id,auth.uid()) RETURNING * INTO r;
 SELECT sum(amount_cents)::bigint INTO paid FROM public.rental_payouts WHERE charge_id=p_charge_id;
 UPDATE public.rental_charges SET payout_cents=paid WHERE id=p_charge_id;
 RETURN r;
END;$$;

-- Private attachments: the storage bucket also enforces the MIME/size restrictions.
DO $$ BEGIN
 IF to_regclass('storage.buckets') IS NOT NULL THEN
  INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  VALUES('rental-documents','rental-documents',false,10485760,ARRAY['application/pdf','image/jpeg','image/png'])
  ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=EXCLUDED.file_size_limit,allowed_mime_types=EXCLUDED.allowed_mime_types;
 END IF;
 IF to_regclass('storage.objects') IS NOT NULL THEN
  DROP POLICY IF EXISTS rental_document_read ON storage.objects;
  DROP POLICY IF EXISTS rental_document_upload ON storage.objects;
  CREATE POLICY rental_document_read ON storage.objects FOR SELECT TO authenticated
   USING(bucket_id='rental-documents' AND public.has_rental_access() AND EXISTS(SELECT 1 FROM public.rental_documents d WHERE d.storage_path=storage.objects.name));
  CREATE POLICY rental_document_upload ON storage.objects FOR INSERT TO authenticated
   WITH CHECK(bucket_id='rental-documents' AND public.has_rental_access()
    AND name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(pdf|jpg|png)$'
    AND EXISTS(SELECT 1 FROM public.rental_contracts c WHERE c.id::text=split_part(storage.objects.name,'/',1)));
 END IF;
END;$$;
CREATE OR REPLACE FUNCTION public.register_rental_document(p_values jsonb) RETURNS public.rental_documents
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.rental_documents; v_id uuid:=(p_values->>'id')::uuid; v_path text:=p_values->>'storage_path'; BEGIN
 PERFORM public.require_rental_access();
 IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='rental-documents' AND name=v_path) THEN RAISE EXCEPTION 'O upload não foi confirmado. Tente enviar o documento novamente.'; END IF;
 SELECT * INTO r FROM public.rental_documents WHERE id=v_id;
 IF FOUND THEN
  IF r.storage_path<>v_path OR r.contract_id<>(p_values->>'contract_id')::uuid OR r.uploaded_by<>auth.uid() THEN RAISE EXCEPTION 'Documento já cadastrado com outros dados.'; END IF;
  RETURN r;
 END IF;
 INSERT INTO public.rental_documents(id,contract_id,name,storage_path,size_bytes,mime_type,uploaded_by)
 VALUES(v_id,(p_values->>'contract_id')::uuid,p_values->>'name',v_path,(p_values->>'size_bytes')::integer,p_values->>'mime_type',auth.uid()) RETURNING * INTO r;
 RETURN r;
END;$$;

-- Explicit grants; no RPC inherits PostgreSQL's default PUBLIC execute privilege.
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure AS signature,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname IN ('has_rental_access','require_rental_access','audit_rental_change','audit_rental_membership','rental_immutable_ledger','save_rental_property','save_rental_contract','save_rental_issue','generate_rental_charges','adjust_rental_charge','record_rental_receipt','record_rental_payout','register_rental_document') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
  IF f.proname NOT IN ('require_rental_access','audit_rental_change','audit_rental_membership','rental_immutable_ledger') THEN
   EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f.signature);
  END IF;
 END LOOP;
END;$$;
COMMIT;
