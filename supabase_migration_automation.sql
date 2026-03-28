-- ============================================================
-- VilaVix CRM — Migração: Sistema de Automação
-- Execute no SQL Editor do Supabase
-- ============================================================

-- ── 1. Coluna status_changed_at em leads ────────────────────
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS status_changed_at DATE;

-- ── 2. Colunas de automação em tasks ────────────────────────
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS auto_gerada   BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS exige_decisao BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tipo_auto     TEXT,
  ADD COLUMN IF NOT EXISTS dia_sequencia INTEGER;

-- ── 3. Atualizar comentário do status em leads ───────────────
-- (atualiza a documentação inline — sem impacto funcional)
COMMENT ON COLUMN leads.status IS
  'novo | atendimento | visita | proposta | fechado | descartado';

-- ── 4. Índices para performance da automação ─────────────────
CREATE INDEX IF NOT EXISTS idx_tasks_lead_auto
  ON tasks (lead_id, auto_gerada)
  WHERE auto_gerada = true;

CREATE INDEX IF NOT EXISTS idx_tasks_decisao
  ON tasks (lead_id, exige_decisao, concluida)
  WHERE exige_decisao = true;

CREATE INDEX IF NOT EXISTS idx_leads_status_changed
  ON leads (status_changed_at)
  WHERE status_changed_at IS NOT NULL;

-- ── 5. Confirmação ───────────────────────────────────────────
SELECT
  'leads'  AS tabela,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'leads'
  AND column_name IN ('status', 'status_changed_at')
UNION ALL
SELECT
  'tasks',
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'tasks'
  AND column_name IN ('auto_gerada', 'exige_decisao', 'tipo_auto', 'dia_sequencia')
ORDER BY tabela, column_name;
