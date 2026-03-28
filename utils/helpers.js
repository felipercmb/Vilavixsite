// ── Formatters ──────────────────────────────────────────────
export const formatCurrency = (val) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(val);

export const formatCurrencyShort = (val) => {
  if (val >= 1_000_000) return `R$ ${(val / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (val >= 1_000)     return `R$ ${(val / 1_000).toFixed(0)}k`;
  return formatCurrency(val);
};

export const formatDate = (str) => {
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
};

export const formatPhone = (str) => str; // already formatted in data

// ── WhatsApp ────────────────────────────────────────────────
export const WPP_NUMBER = '5527999887766';
export const WPP_DEFAULT_MSG = 'Olá! Vim pelo site da VilaVix e gostaria de mais informações.';

export const wppLink = (telefone, mensagem) => {
  const num = telefone ? telefone.replace(/\D/g, '') : WPP_NUMBER;
  const msg = mensagem || WPP_DEFAULT_MSG;
  return `https://wa.me/55${num}?text=${encodeURIComponent(msg)}`;
};

export const wppImovelMsg = (titulo, id) =>
  `Olá! Tenho interesse no imóvel "${titulo}" (Ref: #${id}). Gostaria de mais informações!`;

export const wppLeadMsg = (nome) => {
  const primeiro = nome ? nome.split(' ')[0] : '';
  return `Olá ${primeiro}! Aqui é da VilaVix Imóveis. Tudo bem?`;
};

// ── Pipeline ─────────────────────────────────────────────────
export const PIPELINE_STAGES = ['novo', 'atendimento', 'visita', 'proposta', 'fechado'];
export const ALL_STATUSES    = ['novo', 'atendimento', 'visita', 'proposta', 'fechado', 'descartado'];

export const PIPELINE_LABELS = {
  novo:        'Novo Lead',
  atendimento: 'Em Atendimento',
  visita:      'Visita Agendada',
  proposta:    'Proposta',
  fechado:     'Fechado',
  descartado:  'Descartado',
  // legado
  contato:     'Em Contato',
};

export const STATUS_COLORS = {
  novo:        '#3B82F6',
  atendimento: '#8B5CF6',
  visita:      '#F59E0B',
  proposta:    '#EC4899',
  fechado:     '#10B981',
  descartado:  '#6B7280',
  contato:     '#F59E0B',
};

export const STATUS_BADGE = {
  novo:        'badge-blue',
  atendimento: 'badge-purple',
  visita:      'badge-amber',
  proposta:    'badge-pink',
  fechado:     'badge-green',
  descartado:  'badge-gray',
  contato:     'badge-amber',
};

// ── Priority ─────────────────────────────────────────────────
export const PRIORITY_COLORS = {
  alta:  '#C62828',
  media: '#F59E0B',
  baixa: '#10B981',
};

export const PRIORITY_LABELS = {
  alta:  'Alta',
  media: 'Média',
  baixa: 'Baixa',
};

// ── Origin emojis ────────────────────────────────────────────
export const ORIGIN_EMOJI = {
  Site:       '🌐',
  WhatsApp:   '💬',
  Instagram:  '📸',
  Google:     '🔍',
  Indicação:  '🤝',
};

// ── Property types ───────────────────────────────────────────
export const TIPOS_IMOVEL = ['Apartamento', 'Casa', 'Cobertura', 'Terreno', 'Comercial'];
export const TRANSACOES   = ['Venda', 'Aluguel'];

// ── Initials helper ──────────────────────────────────────────
export const initials = (name) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
