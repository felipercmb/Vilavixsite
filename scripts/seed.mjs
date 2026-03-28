/**
 * Popula o Supabase com os dados de demonstração.
 * Execute: node scripts/seed.mjs
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://zinayjqfgvywlmybhvvy.supabase.co',
  'sb_publishable_xDfvLrIKLDlh8xKGAh0rCg_yWqUrKhr'
);

// Login como admin para ter permissão de escrita
const { error: loginErr } = await supabase.auth.signInWithPassword({
  email: 'ana@vilavix.com.br',
  password: 'VilaVix@2026',
});
if (loginErr) { console.error('Login falhou:', loginErr.message); process.exit(1); }
console.log('✅ Autenticado como Ana Paula');

// ── Limpa dados existentes (para evitar duplicatas) ──────────
await supabase.from('comments').delete().gt('id', 0);
await supabase.from('tasks').delete().gt('id', 0);
await supabase.from('leads').delete().gt('id', 0);
console.log('🗑  Tabelas limpas');

// ── LEADS ────────────────────────────────────────────────────
const leadsData = [
  { nome: 'Marcela Rodrigues',     email: 'marcela.rodrigues@gmail.com',  telefone: '(27) 99812-4530', interesse: 'Cobertura Duplex Vista Mar',             status: 'proposta', data: '2026-03-14', corretor: 'Ana Paula',     origem: 'Site',       notas: 'Cliente muito interessada, já visitou o imóvel duas vezes. Aguardando aprovação do financiamento no banco. Precisa de resposta até o final do mês para não perder a proposta.', prioridade: 'alta',  orcamento: 'R$ 2.8M - R$ 3.2M' },
  { nome: 'Carlos Eduardo Mendonça', email: 'carlos.mendonca@empresa.com.br', telefone: '(27) 98765-1122', interesse: 'Apartamento Moderno Jardim da Penha', status: 'visita',   data: '2026-03-16', corretor: 'Roberto Silva', origem: 'Instagram',  notas: 'Procura imóvel para morar com a família. Gostou muito das fotos do apartamento. Visita agendada para sábado de manhã. Tem capacidade financeira confirmada.', prioridade: 'alta',  orcamento: 'R$ 800k - R$ 1M' },
  { nome: 'Fernanda Oliveira',     email: 'fernanda.oli@hotmail.com',     telefone: '(27) 99234-8871', interesse: 'Studio Premium — Enseada do Suá',        status: 'contato',  data: '2026-03-17', corretor: 'Ana Paula',     origem: 'WhatsApp',   notas: 'Recém formada, primeiro aluguel. Orçamento um pouco abaixo do valor do studio. Verificar se há possibilidade de negociar o valor ou oferecer alternativas no mesmo bairro.', prioridade: 'media', orcamento: 'R$ 3.5k - R$ 4.5k/mês' },
  { nome: 'Thiago Barcelos',       email: 'thiago.barcelos@outlook.com',  telefone: '(27) 98444-3390', interesse: 'Casa com Piscina — Mata da Praia',       status: 'novo',     data: '2026-03-18', corretor: 'Roberto Silva', origem: 'Google',      notas: 'Empresário buscando imóvel de luxo para a família. Entrou pelo Google Ads. Ainda não foi contatado. Ligar amanhã pela manhã.', prioridade: 'alta',  orcamento: 'R$ 1.5M - R$ 2M' },
  { nome: 'Priscila Santos',       email: 'priscila.santos@medico.com',   telefone: '(27) 99100-5577', interesse: 'Apartamento 2 Quartos — Bento Ferreira', status: 'contato',  data: '2026-03-15', corretor: 'Carlos Neves', origem: 'Indicação',   notas: 'Médica que foi indicada por uma cliente antiga (Dra. Renata). Procura apartamento perto do hospital. Já tem aprovação de financiamento. Prefere ligar após as 19h.', prioridade: 'media', orcamento: 'R$ 2.8k - R$ 3.5k/mês' },
  { nome: 'Henrique Castelo',      email: 'hcastelo@construtora.com',     telefone: '(27) 98321-6640', interesse: 'Terreno — Condomínio Golf Lake',          status: 'fechado',  data: '2026-03-01', corretor: 'Ana Paula',     origem: 'Site',       notas: 'Compra finalizada com sucesso! Construtora adquirindo terreno para projeto residencial premium. Escritura assinada em cartório. Cliente muito satisfeito com o atendimento.', prioridade: 'baixa', orcamento: 'R$ 400k - R$ 500k' },
  { nome: 'Beatriz Lima',          email: 'beatriz.lima@gmail.com',        telefone: '(27) 99876-2210', interesse: 'Casa Geminada — Jardim Camburi',         status: 'proposta', data: '2026-03-13', corretor: 'Carlos Neves', origem: 'Instagram',  notas: 'Primeiro imóvel próprio. Casal jovem com FGTS disponível. Proposta enviada ontem, aguardando retorno do banco para confirmar crédito imobiliário. Muito animados.', prioridade: 'media', orcamento: 'R$ 500k - R$ 600k' },
  { nome: 'Rafael Monteiro',       email: 'rafael.mont@empresa.net',       telefone: '(27) 99543-8801', interesse: 'Sala Comercial — Praia do Canto',        status: 'visita',   data: '2026-03-19', corretor: 'Roberto Silva', origem: 'Google',      notas: 'Empresário expandindo o escritório de advocacia. Precisa de pelo menos 80m² em local de fácil acesso. Visitará amanhã com a sócia. Alta probabilidade de fechar.', prioridade: 'alta',  orcamento: 'R$ 5k - R$ 7k/mês' },
];

const { data: insertedLeads, error: leadsErr } = await supabase
  .from('leads').insert(leadsData).select();
if (leadsErr) { console.error('Leads:', leadsErr.message); process.exit(1); }
console.log(`✅ ${insertedLeads.length} leads inseridos`);

// Mapeia nome → id para usar nas tasks/comments
const leadMap = {};
insertedLeads.forEach(l => { leadMap[l.nome] = l.id; });

// ── TASKS ────────────────────────────────────────────────────
const tasksData = [
  { tipo: 'ligacao',   titulo: 'Ligar para Carlos Eduardo Mendonça',   descricao: 'Não fala há 3 dias. Confirmar interesse no apartamento e visita de sábado.',         lead_id: leadMap['Carlos Eduardo Mendonça'], data: '2026-03-20', hora: '10:00', concluida: false, prioridade: 'alta'  },
  { tipo: 'mensagem',  titulo: 'Enviar WhatsApp para Thiago Barcelos',  descricao: 'Novo lead pelo Google. Primeiro contato — apresentar a VilaVix e agendar visita.',   lead_id: leadMap['Thiago Barcelos'],          data: '2026-03-20', hora: '11:00', concluida: false, prioridade: 'alta'  },
  { tipo: 'instagram', titulo: 'Postar stories no Instagram',           descricao: 'Publicar apartamento de Jardim da Penha. Usar as fotos da galeria com preço.',       lead_id: null,                                data: '2026-03-20', hora: '09:00', concluida: false, prioridade: 'media' },
  { tipo: 'ligacao',   titulo: 'Retornar ligação — Fernanda Oliveira',  descricao: 'Ela ligou ontem mas não conseguiu falar. Verificar interesse no studio.',            lead_id: leadMap['Fernanda Oliveira'],         data: '2026-03-20', hora: '14:00', concluida: false, prioridade: 'media' },
  { tipo: 'geral',     titulo: 'Atualizar proposta — Marcela Rodrigues', descricao: 'Enviar nova proposta com condições revisadas de financiamento para a cobertura.',   lead_id: leadMap['Marcela Rodrigues'],         data: '2026-03-20', hora: '15:00', concluida: false, prioridade: 'alta'  },
  { tipo: 'email',     titulo: 'Follow-up por e-mail — Rafael Monteiro', descricao: 'Confirmar visita à sala comercial para amanhã com ele e a sócia.',                  lead_id: leadMap['Rafael Monteiro'],           data: '2026-03-20', hora: '16:00', concluida: false, prioridade: 'media' },
  { tipo: 'instagram', titulo: 'Postar reels — Cobertura Praia do Canto', descricao: 'Gravar vídeo de tour e publicar no Instagram com legenda atrativa.',              lead_id: null,                                data: '2026-03-21', hora: '10:00', concluida: false, prioridade: 'baixa' },
  { tipo: 'visita',    titulo: 'Visita — Apartamento Jardim da Penha',  descricao: 'Carlos Eduardo Mendonça. Chegou confirmada.',                                        lead_id: leadMap['Carlos Eduardo Mendonça'], data: '2026-03-22', hora: '10:00', concluida: false, prioridade: 'alta'  },
  { tipo: 'visita',    titulo: 'Visita — Cobertura Duplex Vista Mar',   descricao: 'Marcela Rodrigues. Confirmada.',                                                      lead_id: leadMap['Marcela Rodrigues'],         data: '2026-03-22', hora: '14:30', concluida: false, prioridade: 'alta'  },
  { tipo: 'ligacao',   titulo: 'Ligar para Priscila Santos',            descricao: 'Indicação da Dra. Renata. Verificar disponibilidade para visita no apartamento.',    lead_id: leadMap['Priscila Santos'],           data: '2026-03-21', hora: '19:00', concluida: false, prioridade: 'media' },
  { tipo: 'geral',     titulo: 'Atualizar cadastros no CRM',            descricao: 'Revisar e atualizar status dos leads que tiveram contato esta semana.',              lead_id: null,                                data: '2026-03-20', hora: '17:00', concluida: false, prioridade: 'baixa' },
  { tipo: 'mensagem',  titulo: 'Enviar proposta para Beatriz Lima',     descricao: 'Casal aguarda confirmação do banco. Reenviar proposta atualizada por WhatsApp.',     lead_id: leadMap['Beatriz Lima'],              data: '2026-03-21', hora: '09:30', concluida: false, prioridade: 'alta'  },
];

const { data: insertedTasks, error: tasksErr } = await supabase
  .from('tasks').insert(tasksData).select();
if (tasksErr) { console.error('Tasks:', tasksErr.message); process.exit(1); }
console.log(`✅ ${insertedTasks.length} tasks inseridas`);

// ── COMMENTS ────────────────────────────────────────────────
const commentsData = [
  { lead_id: leadMap['Marcela Rodrigues'],     autor: 'Ana Paula',     texto: 'Cliente muito animada. Visitou o imóvel pela segunda vez hoje. Proposta em andamento.' },
  { lead_id: leadMap['Marcela Rodrigues'],     autor: 'Ana Paula',     texto: 'Banco solicitou mais um documento. Aguardando carta de aprovação.' },
  { lead_id: leadMap['Carlos Eduardo Mendonça'], autor: 'Roberto Silva', texto: 'Primeiro contato pelo Instagram. Muito interessado, buscando imóvel para a família.' },
  { lead_id: leadMap['Fernanda Oliveira'],     autor: 'Ana Paula',     texto: 'Orçamento levemente abaixo. Verificar outros studios ou negociar valor.' },
  { lead_id: leadMap['Priscila Santos'],       autor: 'Carlos Neves',  texto: 'Indicação da Dra. Renata. Prefere ser contatada após 19h.' },
  { lead_id: leadMap['Henrique Castelo'],      autor: 'Ana Paula',     texto: 'Negócio fechado com sucesso! Cliente muito satisfeito.' },
  { lead_id: leadMap['Beatriz Lima'],          autor: 'Carlos Neves',  texto: 'Casal jovem, primeiro imóvel. FGTS disponível. Proposta enviada, aguardando banco.' },
  { lead_id: leadMap['Rafael Monteiro'],       autor: 'Roberto Silva', texto: 'Empresário de advocacia. Alta probabilidade de fechar. Visita confirmada para amanhã.' },
];

const { data: insertedComments, error: commentsErr } = await supabase
  .from('comments').insert(commentsData).select();
if (commentsErr) { console.error('Comments:', commentsErr.message); process.exit(1); }
console.log(`✅ ${insertedComments.length} comentários inseridos`);

console.log('\n🎉 Seed concluído! Banco populado com sucesso.');
