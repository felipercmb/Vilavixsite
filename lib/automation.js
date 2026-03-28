/**
 * VilaVix CRM — Motor de Automação de Jornada v2
 * Sistema completo de tarefas automáticas: ligações, WhatsApp, Instagram, e-mail, visitas.
 */

// ── Utilitários de data ───────────────────────────────────────
export const TODAY = () => new Date().toISOString().split('T')[0];

export const addDays = (dateStr, n) => {
  const d = new Date((dateStr || TODAY()) + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

export const daysBetween = (from, to = TODAY()) => {
  if (!from) return 0;
  return Math.max(0, Math.floor(
    (new Date(to + 'T12:00:00') - new Date(from + 'T12:00:00')) / 86400000
  ));
};

// ── Helpers internos ─────────────────────────────────────────
const hasTask = (tasks, leadId, marker) =>
  tasks.some(t => t.leadId === leadId && t.titulo?.includes(marker));

const makeTask = (leadId, tipo, titulo, descricao, data, hora, prioridade, extra = {}) => ({
  leadId, tipo, titulo, descricao, data, hora, prioridade,
  concluida: false, autoGerada: true, ...extra,
});

const firstName = (nome) => nome?.split(' ')[0] || nome;

// Temas rotativos para posts de Instagram (usados como guia para o corretor)
const IG_TEMAS_ATENDIMENTO = [
  'Destaque um imóvel compatível com o perfil do cliente',
  'Dica de corretor: como avaliar um bom imóvel',
  'Tour virtual: grave um vídeo rápido de 30s de um imóvel interessante',
  'Compartilhe um depoimento de cliente satisfeito',
  'Novidade VilaVix: mostre um lançamento ou oportunidade',
  'Conteúdo de mercado: valorização na região de interesse',
  'Antes & depois: imóvel reformado vs original',
  'Lifestyle: mostre o bairro, comércio, lazer próximo ao imóvel',
  'FAQ: responda uma dúvida comum de compradores',
  'Bastidores: um dia na vida do corretor VilaVix',
  'Comparativo: dois imóveis, qual vale mais?',
  'Financiamento: dicas rápidas para aprovação mais fácil',
  'Oportunidade relâmpago: imóvel com preço reduzido',
  'Checklist: tudo que você precisa ver numa visita',
  'Reels curto: imóvel dos sonhos em 15 segundos',
];

const IG_TEMAS_DESCARTADO = [
  'Oportunidades de mercado que você não pode perder',
  'Novos lançamentos disponíveis agora',
  'Condições especiais de financiamento este mês',
  'Imóvel dos sonhos pode estar mais acessível do que você pensa',
  'O mercado mudou: novas opções no seu orçamento',
  'Exclusividade: imóveis que acabaram de entrar no portfólio',
];

// ── REGRAS POR STATUS ─────────────────────────────────────────

const RULES = {

  /**
   * NOVO — 5 dias de tentativas intensivas (ligação + WhatsApp + Instagram)
   */
  novo: (lead, tasks) => {
    const out  = [];
    const base = lead.statusChangedAt || lead.data || TODAY();
    const days = daysBetween(base);
    const fn   = firstName(lead.nome);

    // Dia 0 — Primeiro contato: ligação + WhatsApp imediato
    if (!hasTask(tasks, lead.id, 'Primeiro contato — ligação')) {
      out.push(makeTask(
        lead.id, 'ligacao',
        `Primeiro contato — ligação — ${fn}`,
        `Apresentar-se como corretor VilaVix. Identificar necessidade (${lead.interesse || 'imóvel buscado'}), orçamento e urgência. Se não atender, deixar recado e enviar WhatsApp.`,
        addDays(base, 0), '09:00', 'alta',
        { tipoAuto: 'contato_inicial', diaSequencia: 1 },
      ));
    }

    if (!hasTask(tasks, lead.id, 'WhatsApp de apresentação')) {
      out.push(makeTask(
        lead.id, 'mensagem',
        `WhatsApp de apresentação — ${fn}`,
        `Enviar mensagem de apresentação logo após a ligação (ou como canal alternativo). Texto sugerido:\n"Olá ${fn}, tudo bem? Aqui é [nome], corretor da VilaVix Imóveis. Vi que você tem interesse em ${lead.interesse || 'um imóvel'} e adoraria ajudá-lo(a)! Pode falar? 😊"`,
        addDays(base, 0), '09:30', 'alta',
        { tipoAuto: 'contato_inicial' },
      ));
    }

    // Dia 1 — Segunda tentativa: horário alternativo + checar Instagram
    if (days >= 1 && !hasTask(tasks, lead.id, 'Tentativa 2 — tarde')) {
      out.push(makeTask(
        lead.id, 'ligacao',
        `Tentativa 2 — tarde — ${fn}`,
        'Ligar em horário diferente (tarde). Muitos clientes não atendem de manhã. Tentar entre 17h–19h.',
        addDays(base, 1), '17:30', 'alta',
        { tipoAuto: 'contato_inicial', diaSequencia: 2 },
      ));
    }

    if (days >= 1 && !hasTask(tasks, lead.id, 'Localizar lead no Instagram')) {
      out.push(makeTask(
        lead.id, 'instagram',
        `Localizar lead no Instagram — ${fn}`,
        `Buscar pelo nome ou telefone nas redes sociais. Curtir 2–3 posts recentes. Isso aumenta o reconhecimento antes do próximo contato. NÃO enviar DM ainda.`,
        addDays(base, 1), '10:00', 'baixa',
        { tipoAuto: 'contato_inicial' },
      ));
    }

    // Dia 2 — Material visual + WhatsApp com imóvel
    if (days >= 2 && !hasTask(tasks, lead.id, 'WhatsApp com imóvel destaque')) {
      out.push(makeTask(
        lead.id, 'mensagem',
        `WhatsApp com imóvel destaque — ${fn}`,
        `Enviar foto + vídeo de 1 imóvel compatível com o perfil (${lead.interesse || 'interesse do cliente'}). Mensagem curta e direta. Exemplo: "Achei esse imóvel que combina muito com o que você busca! 🏡 O que acha?"`,
        addDays(base, 2), '10:00', 'media',
        { tipoAuto: 'contato_inicial' },
      ));
    }

    // Dia 3 — DM no Instagram + terceira ligação
    if (days >= 3 && !hasTask(tasks, lead.id, 'Tentativa 3 — Instagram DM')) {
      out.push(makeTask(
        lead.id, 'instagram',
        `Tentativa 3 — Instagram DM — ${fn}`,
        `Enviar DM no Instagram (canal extra). Mensagem simples: "Oi ${fn}! Sou da VilaVix Imóveis, tentei entrar em contato por telefone. Tenho oportunidades que podem te interessar! Quando posso te mostrar? 😊"`,
        addDays(base, 3), '09:00', 'media',
        { tipoAuto: 'contato_inicial', diaSequencia: 3 },
      ));
    }

    if (days >= 3 && !hasTask(tasks, lead.id, 'Tentativa 3 — ligação manhã')) {
      out.push(makeTask(
        lead.id, 'ligacao',
        `Tentativa 3 — ligação manhã — ${fn}`,
        'Terceira tentativa. Se não atender, enviar áudio curto no WhatsApp (mais pessoal que texto).',
        addDays(base, 3), '11:00', 'alta',
        { tipoAuto: 'contato_inicial', diaSequencia: 3 },
      ));
    }

    // Dia 4 — E-mail + quinta ligação
    if (days >= 4 && !hasTask(tasks, lead.id, 'E-mail de apresentação VilaVix')) {
      out.push(makeTask(
        lead.id, 'email',
        `E-mail de apresentação VilaVix — ${fn}`,
        `Enviar e-mail para ${lead.email || 'e-mail do lead'} com portfólio em PDF, apresentação da VilaVix e imóveis sugeridos. Assunto: "Encontrei o imóvel ideal para você, ${fn}!"`,
        addDays(base, 4), '09:00', 'media',
        { tipoAuto: 'contato_inicial' },
      ));
    }

    if (days >= 4 && !hasTask(tasks, lead.id, 'Tentativa 4 — ligação final')) {
      out.push(makeTask(
        lead.id, 'ligacao',
        `Tentativa 4 — ligação final — ${fn}`,
        'Quarta tentativa. Última antes do ponto de decisão. Tentar diferentes horários.',
        addDays(base, 4), '18:00', 'alta',
        { tipoAuto: 'contato_inicial', diaSequencia: 4 },
      ));
    }

    // Dia 5 — Ponto de decisão obrigatório
    if (days >= 4 && !hasTask(tasks, lead.id, 'DECISÃO: Avaliação de contato')) {
      out.push(makeTask(
        lead.id, 'geral',
        `DECISÃO: Avaliação de contato — ${fn}`,
        '5 dias de tentativas concluídas. Registre o resultado:\n✅ Consegui contato → mover para "Em Atendimento"\n❌ Sem resposta em nenhum canal → mover para "Descartados" (campanha de reativação será iniciada automaticamente)',
        addDays(base, 5), '08:30', 'alta',
        { tipoAuto: 'decisao_contato', exigeDecisao: true },
      ));
    }

    return out;
  },

  /**
   * ATENDIMENTO — Sequência rica: portfólio + Instagram a cada 2 dias + follow-ups + visita
   */
  atendimento: (lead, tasks) => {
    const out  = [];
    const base = lead.statusChangedAt || lead.data || TODAY();
    const days = daysBetween(base);
    const fn   = firstName(lead.nome);

    // ── Dia 0 ── Portfólio personalizado imediato
    if (!hasTask(tasks, lead.id, 'Enviar portfólio personalizado')) {
      out.push(makeTask(
        lead.id, 'mensagem',
        `Enviar portfólio personalizado — ${fn}`,
        `Selecionar 3 imóveis alinhados ao perfil: ${lead.interesse || 'interesse informado'}, orçamento ${lead.orcamento || 'a confirmar'}. Enviar via WhatsApp com fotos de qualidade + vídeo de pelo menos 1 imóvel.`,
        addDays(base, 0), '10:00', 'alta',
        { tipoAuto: 'atendimento' },
      ));
    }

    // ── Dia 1 ── Curtir posts + seguir no Instagram
    if (days >= 1 && !hasTask(tasks, lead.id, 'Seguir e engajar no Instagram')) {
      out.push(makeTask(
        lead.id, 'instagram',
        `Seguir e engajar no Instagram — ${fn}`,
        `Seguir o perfil do cliente. Curtir e comentar 3–5 posts recentes com comentários genuínos. Isso constrói relacionamento antes da ligação de follow-up.`,
        addDays(base, 1), '09:00', 'baixa',
        { tipoAuto: 'atendimento' },
      ));
    }

    // ── Dia 2 ── Instagram post #1
    if (days >= 1 && !hasTask(tasks, lead.id, 'Instagram post #1')) {
      out.push(makeTask(
        lead.id, 'instagram',
        `Instagram post #1 — ${fn}`,
        `📸 Tema: "${IG_TEMAS_ATENDIMENTO[0]}"\nPublique nos stories ou feed e marque/mencione o cliente (se permitir). Isso mantém a VilaVix presente na mente do lead sem ser invasivo.`,
        addDays(base, 2), '12:00', 'baixa',
        { tipoAuto: 'atendimento_social', igPost: 1 },
      ));
    }

    // ── Dia 3 ── Follow-up ligação
    if (days >= 2 && !hasTask(tasks, lead.id, 'Follow-up pós-portfólio')) {
      out.push(makeTask(
        lead.id, 'ligacao',
        `Follow-up pós-portfólio — ${fn}`,
        'Ligar para saber a impressão sobre os imóveis enviados. Qual chamou mais atenção? O que precisa melhorar nas opções? Tentar agendar visita.',
        addDays(base, 3), '11:00', 'alta',
        { tipoAuto: 'atendimento' },
      ));
    }

    // ── Dia 4 ── Instagram post #2 + Vídeo tour
    if (days >= 3 && !hasTask(tasks, lead.id, 'Instagram post #2')) {
      out.push(makeTask(
        lead.id, 'instagram',
        `Instagram post #2 — ${fn}`,
        `🎥 Tema: "${IG_TEMAS_ATENDIMENTO[1]}"\nPrefira Reels ou vídeo curto — têm muito mais alcance que fotos estáticas no Instagram atual.`,
        addDays(base, 4), '12:00', 'baixa',
        { tipoAuto: 'atendimento_social', igPost: 2 },
      ));
    }

    if (days >= 4 && !hasTask(tasks, lead.id, 'Enviar vídeo tour WhatsApp')) {
      out.push(makeTask(
        lead.id, 'mensagem',
        `Enviar vídeo tour WhatsApp — ${fn}`,
        `Gravar ou selecionar um vídeo tour de 1–2 minutos do imóvel mais compatível com o cliente. Vídeo converte muito mais que fotos. Enviar com áudio de apresentação personalizado.`,
        addDays(base, 4), '10:00', 'media',
        { tipoAuto: 'atendimento' },
      ));
    }

    // ── Dia 6 ── Instagram post #3
    if (days >= 5 && !hasTask(tasks, lead.id, 'Instagram post #3')) {
      out.push(makeTask(
        lead.id, 'instagram',
        `Instagram post #3 — ${fn}`,
        `🏡 Tema: "${IG_TEMAS_ATENDIMENTO[2]}"\nConteúdo educativo performa bem. Pense em dicas de compra, financiamento ou o bairro de interesse do cliente.`,
        addDays(base, 6), '12:00', 'baixa',
        { tipoAuto: 'atendimento_social', igPost: 3 },
      ));
    }

    // ── Dia 7 ── Agendar visita (ponto crítico)
    if (days >= 6 && !hasTask(tasks, lead.id, 'Agendar visita presencial')) {
      out.push(makeTask(
        lead.id, 'visita',
        `Agendar visita presencial — ${fn}`,
        'Com o cliente aquecido após 1 semana de contatos, propor datas concretas para visita. Ter pelo menos 2 imóveis prontos para mostrar. Sucesso aqui move para status Visita.',
        addDays(base, 7), '10:00', 'alta',
        { tipoAuto: 'atendimento' },
      ));
    }

    // ── Dia 8 ── Instagram post #4
    if (days >= 7 && !hasTask(tasks, lead.id, 'Instagram post #4')) {
      out.push(makeTask(
        lead.id, 'instagram',
        `Instagram post #4 — ${fn}`,
        `💬 Tema: "${IG_TEMAS_ATENDIMENTO[3]}"\nDepoimentos e provas sociais aumentam muito a confiança do lead.`,
        addDays(base, 8), '12:00', 'baixa',
        { tipoAuto: 'atendimento_social', igPost: 4 },
      ));
    }

    // ── Dia 10 ── WhatsApp: novidade ou novo imóvel + Instagram post #5
    if (days >= 9 && !hasTask(tasks, lead.id, 'WhatsApp — novo imóvel compatível')) {
      out.push(makeTask(
        lead.id, 'mensagem',
        `WhatsApp — novo imóvel compatível — ${fn}`,
        `Enviar nova opção de imóvel (ou atualização de preço/condição de um já enviado). Mensagem: "Acabou de entrar no nosso portfólio algo que pode te interessar muito, ${fn}! 🏠"`,
        addDays(base, 10), '09:30', 'media',
        { tipoAuto: 'atendimento' },
      ));
    }

    if (days >= 9 && !hasTask(tasks, lead.id, 'Instagram post #5')) {
      out.push(makeTask(
        lead.id, 'instagram',
        `Instagram post #5 — ${fn}`,
        `🌟 Tema: "${IG_TEMAS_ATENDIMENTO[4]}"\nDestacar lançamento ou imóvel exclusivo cria senso de oportunidade.`,
        addDays(base, 10), '12:00', 'baixa',
        { tipoAuto: 'atendimento_social', igPost: 5 },
      ));
    }

    // ── Dia 12 ── Instagram post #6
    if (days >= 11 && !hasTask(tasks, lead.id, 'Instagram post #6')) {
      out.push(makeTask(
        lead.id, 'instagram',
        `Instagram post #6 — ${fn}`,
        `📍 Tema: "${IG_TEMAS_ATENDIMENTO[5]}"\nConteúdo sobre a região de interesse do cliente é altamente relevante e personalizado.`,
        addDays(base, 12), '12:00', 'baixa',
        { tipoAuto: 'atendimento_social', igPost: 6 },
      ));
    }

    // ── Dia 14 ── Revisão quinzenal + novo portfólio
    if (days >= 13 && !hasTask(tasks, lead.id, 'Revisão quinzenal')) {
      out.push(makeTask(
        lead.id, 'ligacao',
        `Revisão quinzenal — ${fn}`,
        `2 semanas em atendimento. Atualizar perfil: mudou o orçamento? O tipo de imóvel? O bairro de interesse? Montar novo portfólio com base no feedback acumulado.`,
        addDays(base, 14), '11:00', 'media',
        { tipoAuto: 'atendimento' },
      ));
    }

    // ── Dias 14, 16, 18, 20, 22, 24, 26, 28 ── Instagram posts #7 a #14
    const igPostsDias = [
      { dia: 14, num: 7,  tema: IG_TEMAS_ATENDIMENTO[6]  },
      { dia: 16, num: 8,  tema: IG_TEMAS_ATENDIMENTO[7]  },
      { dia: 18, num: 9,  tema: IG_TEMAS_ATENDIMENTO[8]  },
      { dia: 20, num: 10, tema: IG_TEMAS_ATENDIMENTO[9]  },
      { dia: 22, num: 11, tema: IG_TEMAS_ATENDIMENTO[10] },
      { dia: 24, num: 12, tema: IG_TEMAS_ATENDIMENTO[11] },
      { dia: 26, num: 13, tema: IG_TEMAS_ATENDIMENTO[12] },
      { dia: 28, num: 14, tema: IG_TEMAS_ATENDIMENTO[13] },
    ];

    igPostsDias.forEach(({ dia, num, tema }) => {
      if (days >= dia - 1 && !hasTask(tasks, lead.id, `Instagram post #${num}`)) {
        out.push(makeTask(
          lead.id, 'instagram',
          `Instagram post #${num} — ${fn}`,
          `📱 Tema: "${tema}"\nManter presença constante nas redes. Postar no horário de maior engajamento (12h–14h ou 19h–21h).`,
          addDays(base, dia), '12:00', 'baixa',
          { tipoAuto: 'atendimento_social', igPost: num },
        ));
      }
    });

    // ── Dia 20 ── E-mail com novidades do portfólio
    if (days >= 19 && !hasTask(tasks, lead.id, 'E-mail com novidades do portfólio')) {
      out.push(makeTask(
        lead.id, 'email',
        `E-mail com novidades do portfólio — ${fn}`,
        `Enviar e-mail com 4–5 imóveis novos ou com condições atualizadas. Incluir comparativo de preços na região. Assunto: "${fn}, separei novidades especiais para você!"`,
        addDays(base, 20), '09:00', 'media',
        { tipoAuto: 'atendimento' },
      ));
    }

    // ── Dia 30 ── Revisão mensal → decisão de estratégia
    if (days >= 29 && !hasTask(tasks, lead.id, 'Revisão mensal de atendimento')) {
      out.push(makeTask(
        lead.id, 'geral',
        `Revisão mensal de atendimento — ${fn}`,
        `Lead ativo há 1 mês. Avaliar:\n• Já visitou algum imóvel? → mover para Visita\n• Esfriou o interesse? → conversar e decidir\n• Interesse mantido mas sem avanço? → rever estratégia com gestor`,
        addDays(base, 30), '09:00', 'media',
        { tipoAuto: 'atendimento' },
      ));
    }

    // ── Alerta de inatividade: 7 dias sem tarefa concluída
    const leadTasksDone = tasks.filter(t => t.leadId === lead.id && t.concluida);
    const lastDone = leadTasksDone.length
      ? leadTasksDone.sort((a, b) => (b.data || '').localeCompare(a.data || ''))[0]?.data
      : base;
    if (daysBetween(lastDone) > 7 && !hasTask(tasks, lead.id, 'ALERTA: Lead parado há')) {
      out.push(makeTask(
        lead.id, 'ligacao',
        `ALERTA: Lead parado há ${daysBetween(lastDone)} dias — ${fn}`,
        '⚠️ Sem atividade recente neste lead. Retomar contato urgente. Lead em risco de esfriar definitivamente.',
        TODAY(), '08:00', 'alta',
        { tipoAuto: 'alerta_inatividade', urgente: true },
      ));
    }

    return out;
  },

  /**
   * VISITA — Confirmação + engajamento social + follow-up pós-visita
   */
  visita: (lead, tasks) => {
    const out  = [];
    const base = lead.statusChangedAt || lead.data || TODAY();
    const days = daysBetween(base);
    const fn   = firstName(lead.nome);

    // Dia 0 — Confirmar presença com mensagem detalhada
    if (!hasTask(tasks, lead.id, 'Confirmar presença na visita')) {
      out.push(makeTask(
        lead.id, 'mensagem',
        `Confirmar presença na visita — ${fn}`,
        `Enviar mensagem de confirmação com: endereço completo, horário, nome do corretor, dicas de como chegar e o que observar durante a visita. Exemplo: "Olá ${fn}! Confirmando nossa visita amanhã às [hora]. Endereço: [endereço]. Qualquer dúvida, me chame! 😊"`,
        addDays(base, 0), '09:00', 'alta',
        { tipoAuto: 'visita' },
      ));
    }

    // Dia 0 — Post Instagram do imóvel (sem marcar o cliente — discreta)
    if (!hasTask(tasks, lead.id, 'Instagram — post do imóvel em visita')) {
      out.push(makeTask(
        lead.id, 'instagram',
        `Instagram — post do imóvel em visita — ${fn}`,
        `Publicar stories ou post do imóvel que será visitado. NÃO revelar dados do cliente. Isso cria prova social e pode gerar outros interessados. Caption sugerida: "Outro imóvel especial saindo para visita hoje! 🔑✨"`,
        addDays(base, 0), '11:00', 'baixa',
        { tipoAuto: 'visita_social' },
      ));
    }

    // Dia 1 — Feedback pós-visita (crítico!)
    if (days >= 1 && !hasTask(tasks, lead.id, 'Feedback pós-visita')) {
      out.push(makeTask(
        lead.id, 'ligacao',
        `Feedback pós-visita — ${fn}`,
        'Ligar até 24h depois da visita. Perguntas-chave:\n• O que mais gostou?\n• O que não te agradou?\n• Notou algum ponto de melhoria?\n• Está considerando fazer proposta?\nEste feedback guia os próximos passos.',
        addDays(base, 1), '11:00', 'alta',
        { tipoAuto: 'visita' },
      ));
    }

    // Dia 2 — Compartilhar depoimento + reforçar no Instagram
    if (days >= 1 && !hasTask(tasks, lead.id, 'Instagram — prova social pós-visita')) {
      out.push(makeTask(
        lead.id, 'instagram',
        `Instagram — prova social pós-visita — ${fn}`,
        `Publicar depoimento de outro cliente satisfeito (com permissão) ou "bastidores de visita". Reforça confiança antes de fechar negócio.`,
        addDays(base, 2), '12:00', 'baixa',
        { tipoAuto: 'visita_social' },
      ));
    }

    // Dia 3 — Proposta ou imóveis alternativos
    if (days >= 2 && !hasTask(tasks, lead.id, 'Preparar proposta ou alternativas')) {
      out.push(makeTask(
        lead.id, 'geral',
        `Preparar proposta ou alternativas — ${fn}`,
        `Análise do feedback da visita:\n• Gostou → Enviar proposta formal com condições de pagamento, prazo e valores\n• Não gostou → Selecionar 2 imóveis alternativos compatíveis com o que o cliente comentou`,
        addDays(base, 3), '14:00', 'alta',
        { tipoAuto: 'visita' },
      ));
    }

    // Dia 5 — Instagram com benefícios do bairro/imóvel
    if (days >= 4 && !hasTask(tasks, lead.id, 'Instagram — reforço do imóvel visitado')) {
      out.push(makeTask(
        lead.id, 'instagram',
        `Instagram — reforço do imóvel visitado — ${fn}`,
        `Publicar conteúdo sobre o bairro/região do imóvel visitado: comércio local, escolas, lazer, valorização. Manda no DM para o cliente: "Lembrei de você ao postar isso!"`,
        addDays(base, 5), '12:00', 'baixa',
        { tipoAuto: 'visita_social' },
      ));
    }

    // Dia 7 — Verificar decisão + criar urgência
    if (days >= 6 && !hasTask(tasks, lead.id, 'Verificar decisão pós-visita')) {
      out.push(makeTask(
        lead.id, 'ligacao',
        `Verificar decisão pós-visita — ${fn}`,
        `7 dias após a visita. Verificar se há interesse em proposta. Criar urgência se possível: outros interessados no imóvel? Condição especial disponível por tempo limitado? Se sem interesse, avaliar segunda visita ou descarte.`,
        addDays(base, 7), '10:00', 'alta',
        { tipoAuto: 'visita', urgente: true },
      ));
    }

    return out;
  },

  /**
   * PROPOSTA — Acompanhamento até fechamento com documentação e urgência
   */
  proposta: (lead, tasks) => {
    const out  = [];
    const base = lead.statusChangedAt || lead.data || TODAY();
    const days = daysBetween(base);
    const fn   = firstName(lead.nome);

    // Dia 0 — Post Instagram comemorativo (proposta saiu!)
    if (!hasTask(tasks, lead.id, 'Instagram — proposta em andamento')) {
      out.push(makeTask(
        lead.id, 'instagram',
        `Instagram — proposta em andamento — ${fn}`,
        `Publicar stories com "Mais uma proposta em andamento! 📝✨" (sem identificar o cliente). Isso motiva a equipe e gera engajamento.`,
        addDays(base, 0), '11:00', 'baixa',
        { tipoAuto: 'proposta_social' },
      ));
    }

    // Dia 1 — Confirmar recebimento da proposta
    if (!hasTask(tasks, lead.id, 'Confirmar recebimento da proposta')) {
      out.push(makeTask(
        lead.id, 'mensagem',
        `Confirmar recebimento da proposta — ${fn}`,
        `Mensagem: "Olá ${fn}! Você recebeu a proposta que enviei? Fico à disposição para tirar qualquer dúvida! 😊" Confirmar que foi aberta e lida.`,
        addDays(base, 1), '10:00', 'alta',
        { tipoAuto: 'proposta' },
      ));
    }

    // Dia 3 — Checklist de documentação
    if (days >= 2 && !hasTask(tasks, lead.id, 'Enviar checklist de documentação')) {
      out.push(makeTask(
        lead.id, 'mensagem',
        `Enviar checklist de documentação — ${fn}`,
        `Enviar lista de documentos necessários para avançar:\n• RG e CPF\n• Comprovante de renda (3 últimos meses)\n• Comprovante de residência\n• Certidão de estado civil\n• Declaração de IR\nOferece ajuda para separar ou tirar dúvidas.`,
        addDays(base, 3), '10:00', 'media',
        { tipoAuto: 'proposta' },
      ));
    }

    // Dia 5 — Verificar financiamento/banco
    if (days >= 4 && !hasTask(tasks, lead.id, 'Verificar status do financiamento')) {
      out.push(makeTask(
        lead.id, 'ligacao',
        `Verificar status do financiamento — ${fn}`,
        `Proposta há 5 dias. Verificar:\n• Aprovação do banco\n• Documentação pendente\n• Valor do financiamento confirmado\nOferecemos apoio com simulações e contato com correspondente bancário se necessário.`,
        addDays(base, 5), '10:00', 'media',
        { tipoAuto: 'proposta' },
      ));
    }

    // Dia 7 — Instagram com dicas de financiamento
    if (days >= 6 && !hasTask(tasks, lead.id, 'Instagram — dicas de financiamento')) {
      out.push(makeTask(
        lead.id, 'instagram',
        `Instagram — dicas de financiamento — ${fn}`,
        `Publicar conteúdo: "5 dicas para aprovar seu financiamento mais rápido". Enviar no DM para o cliente com a mensagem: "Acho que isso pode te ajudar agora! 💡"`,
        addDays(base, 7), '12:00', 'baixa',
        { tipoAuto: 'proposta_social' },
      ));
    }

    // Dia 10 — Reunião de objeções
    if (days >= 9 && !hasTask(tasks, lead.id, 'Reunião para objeções')) {
      out.push(makeTask(
        lead.id, 'ligacao',
        `Reunião para objeções — ${fn}`,
        `10 dias na proposta. Identificar e tratar objeções:\n• Preço alto? → Negociar desconto ou parcelamento diferenciado\n• Localização? → Mostrar valorização histórica da região\n• Condição de pagamento? → Simular alternativas\nNão deixar o lead esfriar sem resposta.`,
        addDays(base, 10), '09:00', 'alta',
        { tipoAuto: 'proposta' },
      ));
    }

    // Dia 15 — Push de urgência + Instagram
    if (days >= 14 && !hasTask(tasks, lead.id, 'Push de urgência')) {
      out.push(makeTask(
        lead.id, 'ligacao',
        `Push de urgência — ${fn}`,
        `Criar senso de urgência real ou percebido:\n• "Proposta válida até [data]"\n• "Outro interessado pode fazer proposta"\n• "Condição especial expira este mês"\nSe não houver urgência real, enfatizar custo de oportunidade.`,
        addDays(base, 15), '09:00', 'alta',
        { tipoAuto: 'proposta', urgente: true },
      ));
    }

    if (days >= 14 && !hasTask(tasks, lead.id, 'Instagram — oportunidade exclusiva')) {
      out.push(makeTask(
        lead.id, 'instagram',
        `Instagram — oportunidade exclusiva — ${fn}`,
        `Publicar o imóvel como "Oportunidade exclusiva" ou "Últimas unidades". Enviar para o DM do lead. Reforça a urgência de forma orgânica.`,
        addDays(base, 15), '12:00', 'baixa',
        { tipoAuto: 'proposta_social' },
      ));
    }

    // Dia 30 — Decisão final
    if (days >= 28 && !hasTask(tasks, lead.id, 'Decisão final da proposta')) {
      out.push(makeTask(
        lead.id, 'geral',
        `Decisão final da proposta — ${fn}`,
        `Proposta há 30 dias. Definir caminho:\n✅ Fechamento confirmado → mover para "Fechado"\n🔄 Precisa de mais tempo → definir prazo concreto\n❌ Desistiu → mover para "Descartados" e iniciar campanha de reativação`,
        addDays(base, 30), '09:00', 'alta',
        { tipoAuto: 'proposta', exigeDecisao: true },
      ));
    }

    return out;
  },

  /**
   * FECHADO — Pós-venda, depoimentos, indicações e aniversários
   */
  fechado: (lead, tasks) => {
    const out  = [];
    const base = lead.statusChangedAt || lead.data || TODAY();
    const days = daysBetween(base);
    const fn   = firstName(lead.nome);

    // Dia 1 — Post comemorativo no Instagram (com permissão)
    if (days >= 0 && !hasTask(tasks, lead.id, 'Instagram — post de fechamento')) {
      out.push(makeTask(
        lead.id, 'instagram',
        `Instagram — post de fechamento — ${fn}`,
        `Pedir permissão ao cliente para postar uma foto comemorativa da entrega das chaves/contrato assinado. Caption: "Mais uma família feliz! 🏠🔑 Obrigado pela confiança, [nome]!"\nSe não autorizar, postar sem identificação.`,
        addDays(base, 1), '10:00', 'media',
        { tipoAuto: 'pos_venda_social' },
      ));
    }

    // Dia 3 — Mensagem de parabéns
    if (days >= 2 && !hasTask(tasks, lead.id, 'Mensagem de parabéns')) {
      out.push(makeTask(
        lead.id, 'mensagem',
        `Mensagem de parabéns — ${fn}`,
        `Parabenizar pelo fechamento. Mensagem: "Parabéns, ${fn}! Foi um prazer trabalhar com você. Qualquer coisa que precisar, pode contar comigo. Feliz no seu novo lar! 🏠🎉"`,
        addDays(base, 3), '10:00', 'media',
        { tipoAuto: 'pos_venda' },
      ));
    }

    // Dia 7 — Solicitar depoimento
    if (days >= 6 && !hasTask(tasks, lead.id, 'Solicitar depoimento')) {
      out.push(makeTask(
        lead.id, 'mensagem',
        `Solicitar depoimento — ${fn}`,
        `Pedir depoimento para Instagram/Google Meu Negócio:\n"${fn}, você ficou satisfeito(a) com o atendimento? Poderia escrever uma avaliação rápida? Ajuda muito outros clientes a nos conhecerem! 🙏"\nEnviar link direto do Google ou template de depoimento.`,
        addDays(base, 7), '10:00', 'media',
        { tipoAuto: 'pos_venda' },
      ));
    }

    // Dia 14 — Check de satisfação
    if (days >= 13 && !hasTask(tasks, lead.id, 'Check de satisfação 2 semanas')) {
      out.push(makeTask(
        lead.id, 'mensagem',
        `Check de satisfação 2 semanas — ${fn}`,
        `Mensagem rápida: "Oi ${fn}! Tudo bem no novo lar? Alguma coisa que posso ajudar?" Construção de relacionamento para indicações futuras.`,
        addDays(base, 14), '10:00', 'baixa',
        { tipoAuto: 'pos_venda' },
      ));
    }

    // Dia 30 — Pedir indicação
    if (days >= 28 && !hasTask(tasks, lead.id, 'Pedir indicação — 1 mês')) {
      out.push(makeTask(
        lead.id, 'mensagem',
        `Pedir indicação — 1 mês — ${fn}`,
        `Cliente satisfeito após 30 dias = momento ideal para indicação.\n"${fn}, você conhece alguém que está buscando imóvel? Indique para a VilaVix! Para cada indicação que fechar, você recebe [benefício/agradecimento]. 😊"`,
        addDays(base, 30), '11:00', 'media',
        { tipoAuto: 'pos_venda' },
      ));
    }

    // Dia 90 — Check-in trimestral
    if (days >= 88 && !hasTask(tasks, lead.id, 'Check-in 90 dias')) {
      out.push(makeTask(
        lead.id, 'mensagem',
        `Check-in 90 dias — ${fn}`,
        `3 meses no imóvel! Verificar satisfação e reforçar relacionamento. Boa hora para segunda indicação ou venda futura.`,
        addDays(base, 90), '10:00', 'baixa',
        { tipoAuto: 'pos_venda' },
      ));
    }

    // Dia 180 — Aniversário 6 meses + post Instagram
    if (days >= 178 && !hasTask(tasks, lead.id, 'Aniversário 6 meses')) {
      out.push(makeTask(
        lead.id, 'mensagem',
        `Aniversário 6 meses no imóvel — ${fn}`,
        `6 meses! Mensagem comemorativa e pedido de indicação renovado. Postar stories comemorativo se tiver foto.`,
        addDays(base, 180), '10:00', 'baixa',
        { tipoAuto: 'pos_venda' },
      ));
    }

    // Dia 365 — Aniversário 1 ano
    if (days >= 363 && !hasTask(tasks, lead.id, 'Aniversário 1 ano')) {
      out.push(makeTask(
        lead.id, 'mensagem',
        `Aniversário 1 ano no imóvel — ${fn}`,
        `1 ano! Mensagem especial de aniversário. Verificar interesse em upgrade, investimento adicional ou indicação de familiar/amigo.`,
        addDays(base, 365), '10:00', 'baixa',
        { tipoAuto: 'pos_venda' },
      ));
    }

    return out;
  },

  /**
   * DESCARTADO — Campanha de reativação: folders + Instagram + reativação direta
   * Primeiros 60 dias: folder + instagram a cada 15 dias
   * Após 60 dias: mensal
   */
  descartado: (lead, tasks) => {
    const out  = [];
    const base = lead.statusChangedAt || lead.data || TODAY();
    const days = daysBetween(base);
    const fn   = firstName(lead.nome);

    // Folders nos primeiros 60 dias (a cada 15 dias) + post Instagram junto
    const foldersIniciais = [
      { dia: 15, num: 1, tema: 'Novidades do mercado imobiliário — especial para você' },
      { dia: 30, num: 2, tema: 'Melhores oportunidades do mês com condições especiais' },
      { dia: 45, num: 3, tema: 'Imóveis com desconto exclusivo — selecionados para o seu perfil' },
      { dia: 60, num: 4, tema: 'Lançamentos exclusivos VilaVix — não fique de fora' },
    ];

    foldersIniciais.forEach(({ dia, num, tema }) => {
      if (days >= dia - 1 && !hasTask(tasks, lead.id, `Folder ${num}/4 de reativação`)) {
        out.push(makeTask(
          lead.id, 'email',
          `Folder ${num}/4 de reativação — ${fn}`,
          `📧 Tema: "${tema}"\nEnviar material visual de alto impacto por WhatsApp E e-mail. Incluir CTA claro: "Ainda está buscando seu imóvel? Posso te ajudar com novas opções!" ${num < 4 ? `Próximo folder em ${dia + 15} dias.` : 'Após este folder, envios mensais.'}`,
          addDays(base, dia), '09:00', 'baixa',
          { tipoAuto: 'reativacao', folder: true, folderNum: num },
        ));
      }

      // Instagram junto com cada folder
      if (days >= dia - 1 && !hasTask(tasks, lead.id, `Instagram reativação semana ${num}`)) {
        const igTema = IG_TEMAS_DESCARTADO[(num - 1) % IG_TEMAS_DESCARTADO.length];
        out.push(makeTask(
          lead.id, 'instagram',
          `Instagram reativação semana ${num} — ${fn}`,
          `📱 Tema: "${igTema}"\nPublicar no feed/stories. Enviar no DM do lead com: "Pensei em você ao ver essa oportunidade! 🏡 Ainda está buscando?" Abordagem suave, sem pressão.`,
          addDays(base, dia + 1), '12:00', 'baixa',
          { tipoAuto: 'reativacao_social' },
        ));
      }
    });

    // Após 60 dias: folder mensal + instagram mensal
    if (days >= 60) {
      const mesesExtra = Math.floor((days - 60) / 30) + 1;
      for (let m = 1; m <= mesesExtra; m++) {
        const temasMensais = [
          'Oportunidades imperdíveis deste mês',
          'Imóveis com redução de preço',
          'Financiamento facilitado — condições exclusivas',
          'Novos lançamentos em alta',
          'Tendências do mercado imobiliário',
          'Imóveis mais visitados da semana',
        ];
        const tema   = temasMensais[(m - 1) % temasMensais.length];
        const marker = `Folder mensal ${m} — reativação`;

        if (!hasTask(tasks, lead.id, marker)) {
          out.push(makeTask(
            lead.id, 'email',
            `${marker} — ${fn}`,
            `📧 Tema: "${tema}". Manter o lead aquecido com conteúdo relevante. Monitorar abertura e engajamento.`,
            addDays(base, 60 + m * 30), '09:00', 'baixa',
            { tipoAuto: 'reativacao_mensal', folder: true },
          ));
        }

        const markerIg = `Instagram mensal ${m} — reativação`;
        if (!hasTask(tasks, lead.id, markerIg)) {
          const igTema = IG_TEMAS_DESCARTADO[(m - 1) % IG_TEMAS_DESCARTADO.length];
          out.push(makeTask(
            lead.id, 'instagram',
            `${markerIg} — ${fn}`,
            `📱 Tema: "${igTema}"\nPost mensal + DM suave para o lead. Presença constante sem spam.`,
            addDays(base, 60 + m * 30 + 2), '12:00', 'baixa',
            { tipoAuto: 'reativacao_mensal_social' },
          ));
        }
      }
    }

    // Dia 90 — Tentativa de reativação direta por ligação
    if (days >= 89 && !hasTask(tasks, lead.id, 'Tentativa de reativação direta')) {
      out.push(makeTask(
        lead.id, 'ligacao',
        `Tentativa de reativação direta — ${fn}`,
        `90 dias descartado. Ligar diretamente:\n"Olá ${fn}, tudo bem? Faz um tempo que não nos falamos. Queria saber se ainda está buscando imóvel ou se a situação mudou. Tenho novidades interessantes!"\nSe positivo → mover para Atendimento.`,
        addDays(base, 90), '10:00', 'media',
        { tipoAuto: 'reativacao' },
      ));
    }

    // Dia 180 — Segunda tentativa de reativação
    if (days >= 178 && !hasTask(tasks, lead.id, 'Reativação 6 meses')) {
      out.push(makeTask(
        lead.id, 'ligacao',
        `Reativação 6 meses — ${fn}`,
        `6 meses descartado. Muita coisa pode ter mudado: renda, necessidade, mercado. Vale a tentativa. Se não responder desta vez, avaliar arquivar permanentemente.`,
        addDays(base, 180), '10:00', 'baixa',
        { tipoAuto: 'reativacao' },
      ));
    }

    return out;
  },

};

// ── API Pública ───────────────────────────────────────────────

/**
 * Roda a automação em todos os leads e retorna as novas tasks a criar.
 * É idempotente: não gera tarefas que já existem.
 */
export const runAutomation = (leads, tasks) => {
  const newTasks = [];
  leads.forEach(lead => {
    const rule = RULES[lead.status];
    if (rule) {
      const generated = rule(lead, tasks);
      newTasks.push(...generated);
    }
  });
  return newTasks;
};

/**
 * Gera tarefas para um único lead (usado quando o status muda).
 */
export const generateTasksForLead = (lead, tasks) => {
  const rule = RULES[lead.status];
  return rule ? rule(lead, tasks) : [];
};

/**
 * Informações do fluxo de automação ativo para um lead.
 */
export const AUTOMATION_INFO = {
  novo:        { label: '5 tentativas de contato',    color: '#3B82F6', bg: 'rgba(59,130,246,0.10)',  icon: 'phone',     descricao: 'Ligações + WhatsApp + Instagram DM por 5 dias' },
  atendimento: { label: 'Atendimento + Instagram',    color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)',  icon: 'users',     descricao: 'Posts a cada 2 dias + follow-ups + visita' },
  visita:      { label: 'Follow-up de visita',        color: '#F59E0B', bg: 'rgba(245,158,11,0.10)',  icon: 'calendar',  descricao: 'Confirmação, feedback e proposta' },
  proposta:    { label: 'Acompanhamento de proposta', color: '#EC4899', bg: 'rgba(236,72,153,0.10)',  icon: 'file',      descricao: 'Documentação + objeções + urgência' },
  fechado:     { label: 'Pós-venda ativo',            color: '#10B981', bg: 'rgba(16,185,129,0.10)',  icon: 'check',     descricao: 'Depoimento + indicações + aniversários' },
  descartado:  { label: 'Campanha de reativação',     color: '#6B7280', bg: 'rgba(107,114,128,0.10)', icon: 'refresh',   descricao: 'Folders + Instagram a cada 15 dias, depois mensais' },
};

/**
 * Linha do tempo da automação por status (para exibir no painel).
 */
export const AUTOMATION_TIMELINE = {
  novo: [
    { dia: 0, label: 'Ligação + WPP',  tipo: 'ligacao'   },
    { dia: 1, label: 'Tarde + IG',     tipo: 'instagram' },
    { dia: 2, label: 'WPP + foto',     tipo: 'mensagem'  },
    { dia: 3, label: 'IG DM + liga',   tipo: 'instagram' },
    { dia: 4, label: 'E-mail + liga',  tipo: 'email'     },
    { dia: 5, label: '⚖️ Decisão',    tipo: 'geral',  decisao: true },
  ],
  atendimento: [
    { dia: 0,  label: 'Portfólio',     tipo: 'mensagem'  },
    { dia: 1,  label: 'IG — seguir',   tipo: 'instagram' },
    { dia: 2,  label: '📸 IG post',    tipo: 'instagram' },
    { dia: 3,  label: 'Follow-up',     tipo: 'ligacao'   },
    { dia: 4,  label: '📸 IG + vídeo', tipo: 'instagram' },
    { dia: 6,  label: '📸 IG post',    tipo: 'instagram' },
    { dia: 7,  label: 'Agendar visita',tipo: 'visita'    },
    { dia: 8,  label: '📸 IG post',    tipo: 'instagram' },
    { dia: 10, label: 'WPP novo imóv', tipo: 'mensagem'  },
    { dia: 14, label: 'Revisão 2 sem', tipo: 'ligacao'   },
    { dia: 20, label: 'E-mail novid.', tipo: 'email'     },
    { dia: 30, label: 'Revisão mensal',tipo: 'geral'     },
  ],
  visita: [
    { dia: 0, label: 'Confirmar + IG', tipo: 'mensagem'  },
    { dia: 1, label: 'Feedback',       tipo: 'ligacao'   },
    { dia: 2, label: 'IG social',      tipo: 'instagram' },
    { dia: 3, label: 'Proposta',       tipo: 'geral'     },
    { dia: 5, label: 'IG reforço',     tipo: 'instagram' },
    { dia: 7, label: 'Decisão',        tipo: 'ligacao'   },
  ],
  proposta: [
    { dia: 0,  label: 'IG — proposta', tipo: 'instagram' },
    { dia: 1,  label: 'Confirmar',     tipo: 'mensagem'  },
    { dia: 3,  label: 'Documentação',  tipo: 'mensagem'  },
    { dia: 5,  label: 'Financ.',       tipo: 'ligacao'   },
    { dia: 7,  label: 'IG — dicas',    tipo: 'instagram' },
    { dia: 10, label: 'Objeções',      tipo: 'ligacao'   },
    { dia: 15, label: 'Urgência + IG', tipo: 'ligacao'   },
    { dia: 30, label: '⚖️ Decisão',   tipo: 'geral', decisao: true },
  ],
  fechado: [
    { dia: 1,   label: 'IG — parabéns',tipo: 'instagram' },
    { dia: 3,   label: 'Parabéns',     tipo: 'mensagem'  },
    { dia: 7,   label: 'Depoimento',   tipo: 'mensagem'  },
    { dia: 14,  label: 'Satisfação',   tipo: 'mensagem'  },
    { dia: 30,  label: 'Indicação',    tipo: 'mensagem'  },
    { dia: 90,  label: '90 dias',      tipo: 'mensagem'  },
    { dia: 180, label: '6 meses',      tipo: 'mensagem'  },
    { dia: 365, label: '1 ano',        tipo: 'mensagem'  },
  ],
  descartado: [
    { dia: 15,  label: 'Folder 1 + IG',  tipo: 'email'   },
    { dia: 30,  label: 'Folder 2 + IG',  tipo: 'email'   },
    { dia: 45,  label: 'Folder 3 + IG',  tipo: 'email'   },
    { dia: 60,  label: 'Folder 4 + IG',  tipo: 'email'   },
    { dia: 90,  label: 'Reativação',     tipo: 'ligacao' },
    { dia: 90,  label: 'Mensal + IG...', tipo: 'email'   },
    { dia: 180, label: 'Reativ. 6 meses',tipo: 'ligacao' },
  ],
};
