-- ============================================================
-- VilaVix CRM — Schema completo
-- Execute este arquivo no SQL Editor do Supabase
-- ============================================================

-- ─── PROFILES (corretores — extende auth.users) ──────────────
CREATE TABLE IF NOT EXISTS profiles (
  id           UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nome         TEXT NOT NULL,
  creci        TEXT,
  especialidade TEXT,
  telefone     TEXT,
  email        TEXT,
  foto         TEXT,         -- iniciais do avatar, ex: "AP"
  role         TEXT DEFAULT 'corretor',  -- 'admin' | 'corretor'
  ativo        BOOLEAN DEFAULT true,
  vendas       INTEGER DEFAULT 0,
  comissao     NUMERIC DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── IMÓVEIS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS imoveis (
  id           BIGSERIAL PRIMARY KEY,
  titulo       TEXT NOT NULL,
  tipo         TEXT DEFAULT 'Apartamento',
  status       TEXT DEFAULT 'disponivel',  -- 'disponivel' | 'vendido' | 'alugado' | 'reservado'
  preco        NUMERIC,
  cidade       TEXT,
  bairro       TEXT,
  endereco     TEXT,
  quartos      INTEGER DEFAULT 0,
  banheiros    INTEGER DEFAULT 0,
  vagas        INTEGER DEFAULT 0,
  area         NUMERIC,
  andar        TEXT,
  ano          INTEGER,
  condominio   NUMERIC,
  descricao    TEXT,
  destaque     BOOLEAN DEFAULT false,
  fotos        TEXT[],       -- array de URLs públicas do Storage
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── LEADS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id           BIGSERIAL PRIMARY KEY,
  nome         TEXT NOT NULL,
  email        TEXT,
  telefone     TEXT,
  interesse    TEXT,
  imovel_id    BIGINT REFERENCES imoveis(id) ON DELETE SET NULL,
  status       TEXT DEFAULT 'novo',  -- novo | contato | visita | proposta | fechado
  data         DATE DEFAULT CURRENT_DATE,
  corretor     TEXT,
  origem       TEXT,
  notas        TEXT,
  prioridade   TEXT DEFAULT 'media',  -- alta | media | baixa
  orcamento    TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TASKS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id           BIGSERIAL PRIMARY KEY,
  tipo         TEXT DEFAULT 'geral',  -- ligacao | mensagem | visita | instagram | email | geral
  titulo       TEXT NOT NULL,
  descricao    TEXT,
  lead_id      BIGINT REFERENCES leads(id) ON DELETE SET NULL,
  data         DATE,
  hora         TEXT,
  concluida    BOOLEAN DEFAULT false,
  prioridade   TEXT DEFAULT 'media',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── COMMENTS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id           BIGSERIAL PRIMARY KEY,
  lead_id      BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  autor        TEXT NOT NULL,
  texto        TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE imoveis   ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments  ENABLE ROW LEVEL SECURITY;

-- Imóveis: leitura pública (site público), escrita só logados
CREATE POLICY "Imoveis leitura publica"   ON imoveis FOR SELECT TO anon      USING (true);
CREATE POLICY "Imoveis escrita logado"    ON imoveis FOR ALL    TO authenticated USING (true);

-- Demais tabelas: apenas corretores logados
CREATE POLICY "Profiles logado"  ON profiles  FOR ALL TO authenticated USING (true);
CREATE POLICY "Leads logado"     ON leads     FOR ALL TO authenticated USING (true);
CREATE POLICY "Tasks logado"     ON tasks     FOR ALL TO authenticated USING (true);
CREATE POLICY "Comments logado"  ON comments  FOR ALL TO authenticated USING (true);

-- ============================================================
-- FUNCTION: criar perfil automaticamente ao cadastrar usuário
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, foto, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email), 2)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'corretor')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- STORAGE BUCKET para fotos dos imóveis
-- (Execute separado se der erro — alguns planos requerem dashboard)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('fotos', 'fotos', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "Fotos leitura publica" ON storage.objects
  FOR SELECT TO anon USING (bucket_id = 'fotos');

CREATE POLICY "Fotos upload logado" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'fotos');

CREATE POLICY "Fotos delete logado" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'fotos');
