BEGIN;
ALTER TABLE public.imoveis
 ADD COLUMN IF NOT EXISTS codigo text,
 ADD COLUMN IF NOT EXISTS slug text,
 ADD COLUMN IF NOT EXISTS finalidade text DEFAULT 'venda',
 ADD COLUMN IF NOT EXISTS suites integer,
 ADD COLUMN IF NOT EXISTS estado text DEFAULT 'ES',
 ADD COLUMN IF NOT EXISTS caracteristicas text[] DEFAULT '{}',
 ADD COLUMN IF NOT EXISTS source_url text,
 ADD COLUMN IF NOT EXISTS imported_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS imoveis_codigo_unique ON public.imoveis(codigo);
CREATE INDEX IF NOT EXISTS imoveis_public_filters ON public.imoveis(status,cidade,tipo,preco);
CREATE OR REPLACE FUNCTION public.import_legacy_catalog(p_rows jsonb) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r jsonb; n integer:=0;
BEGIN
 IF jsonb_typeof(p_rows)<>'array' THEN RAISE EXCEPTION 'Invalid catalog';END IF;
 FOR r IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
  IF NULLIF(r->>'codigo','') IS NULL OR NULLIF(r->>'titulo','') IS NULL OR NULLIF(r->>'sourceUrl','') IS NULL THEN RAISE EXCEPTION 'Missing catalog identity or source';END IF;
  INSERT INTO public.imoveis(codigo,slug,titulo,tipo,finalidade,status,preco,cidade,bairro,estado,quartos,suites,banheiros,vagas,area,descricao,destaque,fotos,caracteristicas,source_url,imported_at)
  VALUES(r->>'codigo',r->>'slug',r->>'titulo',r->>'tipo',r->>'finalidade','disponivel',(r->>'preco')::numeric,r->>'cidade',r->>'bairro',COALESCE(r->>'estado','ES'),(r->>'quartos')::integer,(r->>'suites')::integer,(r->>'banheiros')::integer,(r->>'vagas')::integer,(r->>'area')::numeric,r->>'descricao',COALESCE((r->>'destaque')::boolean,false),ARRAY(SELECT jsonb_array_elements_text(r->'fotos')),ARRAY(SELECT jsonb_array_elements_text(r->'caracteristicas')),r->>'sourceUrl',(r->>'importedAt')::timestamptz)
  ON CONFLICT(codigo) DO UPDATE SET slug=EXCLUDED.slug,titulo=EXCLUDED.titulo,tipo=EXCLUDED.tipo,finalidade=EXCLUDED.finalidade,preco=EXCLUDED.preco,cidade=EXCLUDED.cidade,bairro=EXCLUDED.bairro,estado=EXCLUDED.estado,quartos=EXCLUDED.quartos,suites=EXCLUDED.suites,banheiros=EXCLUDED.banheiros,vagas=EXCLUDED.vagas,area=EXCLUDED.area,descricao=EXCLUDED.descricao,destaque=EXCLUDED.destaque,fotos=EXCLUDED.fotos,caracteristicas=EXCLUDED.caracteristicas,source_url=EXCLUDED.source_url,imported_at=EXCLUDED.imported_at;
  n:=n+1;
 END LOOP;
 RETURN n;
END;$$;
REVOKE ALL ON FUNCTION public.import_legacy_catalog(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.import_legacy_catalog(jsonb) TO service_role;
COMMIT;
