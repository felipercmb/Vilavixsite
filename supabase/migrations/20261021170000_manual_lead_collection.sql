BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS carteira text;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.leads'::regclass AND conname='leads_carteira_check') THEN
    ALTER TABLE public.leads ADD CONSTRAINT leads_carteira_check CHECK (carteira IS NULL OR carteira IN ('entrada','prospeccao'));
  END IF;
END;
$$;
COMMENT ON COLUMN public.leads.carteira IS 'Escolha manual: entrada ou prospeccao. NULL mantém a classificação automática pela procedência histórica.';
NOTIFY pgrst, 'reload schema';
COMMIT;
