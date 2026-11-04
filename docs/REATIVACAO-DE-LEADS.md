# Reativação de leads

A área `/crm/reativacao` mantém uma fila de recuperação separada da captura inicial. É visível aos administradores ativos e à conta escolhida como funcionária de reativação. A instalação começa com `enabled=false` e sem funcionária vinculada: nenhum lead é transferido apenas ao aplicar a migração.

## Ativação

1. Cadastrar a funcionária pela entrada normal de contas e ativar seu perfil no CRM.
2. Abrir **Reativação de leads → Configuração do fluxo**, escolher a conta exata e conferir os participantes.
3. Conferir o total de contatos elegíveis, marcar **Ativar entrada automática após 14 dias** e salvar.

A roleta dos reativados tem ordem e cursor próprios. A lista inicial sugerida usa quem recebe leads nas regras ativas de campanha, regras legadas e destino geral. A funcionária não participa. Antes de cada entrega o banco volta a consultar essas regras: remover ou pausar alguém ali o retira da elegibilidade desta roleta, mesmo que sua seleção anterior ainda exista. A sincronização de anúncios não reinsere participantes removidos. Não há data de retorno para corretores pausados.

## Critério de entrada

O job `vilavix-lead-reactivation` verifica a fila a cada hora, em lotes de até 500. Também repara eventual falta de tarefa em acompanhamentos abertos. Na captura automática por inatividade, só entram leads atribuídos, abertos (`novo`, `contato`, `atendimento`, `visita`, `proposta`), com pelo menos 14 dias completos desde `last_activity_at` e sem outro acompanhamento ativo. Fechados, descartados, contatos sem responsável e contatos já pertencentes à funcionária ficam fora dessa captura automática.

O relógio registra alterações de cadastro/etapa/responsável, comentários autenticados e criação manual ou alterações efetivas de tarefas por integrantes ativos. A simples geração automática de lembretes e a mudança de carteira entre novos/prospecção não simulam atendimento. Corretores não podem forjar `last_activity_at` pelo cliente. Não existe um histórico completo das edições anteriores à instalação: o preenchimento inicial usa criação, última mudança de etapa e comentários humanos disponíveis. Esse limite é explicado na configuração antes da ativação.

## Trabalho diário

Ao entrar, o contato passa para a funcionária e recebe um acompanhamento com responsável anterior, interesse, última atividade conhecida e próxima data. O banco cria uma tarefa real em `tasks`, identificada por `reactivation_case_id` e `tipo_auto=reativacao`. Há no máximo uma tarefa pendente por acompanhamento; dias sem tentativa mantêm a pendência em atraso em vez de multiplicar lembretes.

**Salvar comentário e próxima tarefa** grava uma tentativa, acrescenta o texto ao histórico normal do lead, conclui a tarefa anterior e cria a próxima na data informada (hoje até 30 dias). O padrão é amanhã, no calendário de São Paulo. As gravações fazem parte da mesma transação. A agenda encaminha essas tarefas para a área de reativação; não permite marcar como concluídas sem registrar o contato.

**Reativar e distribuir** exige um resumo, escolhe o próximo corretor elegível na roleta própria e transfere o lead na mesma transação. O lead volta à etapa Novo e o novo corretor recebe uma tarefa de primeiro contato. Campanha, carteira e observações originais são preservadas. As tentativas permanecem no histórico do lead e na trilha do acompanhamento. A entrega não reutiliza nem substitui o registro único da distribuição original da campanha.

Sem corretor elegível, a operação é recusada por inteiro e o lead continua com a funcionária. Tentativas de registro e entrega usam UUID de idempotência: repetir a mesma requisição não cria outro comentário, tarefa ou avanço na roleta. O formulário preserva o texto em falhas. Não há envio adicional de WhatsApp nesta entrega; a nova atividade aparece no CRM.

**Encerrar sem interesse** exige comentário e confirmação na interface. Marca o lead como descartado, encerra a pendência e conserva todos os registros.

## Acesso e operação

As tabelas `reactivation_settings`, `reactivation_cases` e `reactivation_notes` usam RLS. Configuração é exclusiva do administrador. A funcionária lê seus acompanhamentos; o corretor que recebe um lead pode ler o histórico relacionado. Gravações passam por RPCs com validação do chamador. Funções auxiliares não têm execução pública. Tarefas e responsabilidade de um caso ativo não podem ser alteradas por edição comum para contornar o fluxo.

O job funciona no próprio banco, sem novas chaves ou serviço externo. O perfil da funcionária deve permanecer ativo. A troca da conta responsável é bloqueada enquanto existirem acompanhamentos abertos. Desativar a entrada automática interrompe novas entradas e preserva a operação da fila existente.

Os testes de banco usam dados fictícios e verificam limite de 14 dias, exclusões, permissões por conta, prioridade da pausa, idempotência, transações interrompidas, conclusão, datas e independência da roleta. A interface de demonstração só existe em desenvolvimento.

## Supervisão administrativa do remalho

Em **Gestão → Gestão do remalho** (`/crm/remalho`), administradores consultam resultados por período e responsável. O relatório `reactivation_admin_report` exige uma conta ativa com papel de administrador no próprio banco; esconder o menu não é a proteção de acesso. A consulta é somente leitura e não ativa o fluxo ou movimenta leads.

- Recebidos: acompanhamentos cuja entrada ocorreu no período.
- Tentativas da funcionária: registros no período cuja autora é a responsável pelo acompanhamento. Intervenções com outra autoria aparecem separadamente como supervisão.
- Contatos trabalhados: acompanhamentos distintos com ao menos um registro no período, incluindo supervisão. Duas tentativas no mesmo contato contam uma vez aqui.
- Reativados e sem interesse: acompanhamentos finalizados no período por resultado. A taxa é reativados divididos por todos os finalizados no período; sem finalizações, exibe um traço.
- Pendências agora: fila ativa da responsável selecionada, independente do período. Os atalhos mudam explicitamente o período para todo o histórico e abrem a lista de contatos correspondente.
- Depois da reativação: encaminhamentos realizados no período por corretor destinatário, confrontados com a etapa atual do lead. Sinaliza mudança posterior de responsável. Não representa uma conversão histórica na data da entrega.

Dias e limites de período usam America/Sao_Paulo, incluindo a data inicial e excluindo a meia-noite seguinte à data final. O gráfico mostra até os 14 últimos dias do período e distingue funcionária e supervisão. As listas são paginadas no servidor, com contagens integrais (incluindo mais de mil registros); busca e situação afetam somente as listas, não os indicadores. O histórico individual carrega todas as páginas. Exportar resumo gera CSV dos indicadores, sem confundir a página atual com uma exportação integral de contatos. O painel atualiza a cada minuto quando visível e oferece atualização manual.

Os indicadores de atendimento permanecem vazios enquanto a funcionária não for cadastrada e vinculada. Leads descartados incluídos pontualmente podem aparecer antes disso na fila **Aguardando atendente**. Dados fictícios são exclusivos da revisão em desenvolvimento; não há registros simulados em produção.

## Organização das telas

A atendente pode priorizar atrasados, retornos de hoje ou agendados, navegar entre contatos mantendo os rascunhos nesta tela e consultar o último registro antes de escrever. Os atalhos de data apenas preenchem o formulário: a tarefa só muda após salvar com confirmação do banco. O histórico e as datas com hora usam Brasília.

A gestão oferece **Visão geral**, **Atividades**, **Contatos** e **Aguardando atendente**. O diário agrupa as atividades por data na página consultada; comentários extensos podem ser expandidos. No celular, contatos e resultados dos corretores usam listas com os mesmos campos das tabelas. O acesso às configurações permanece exclusivo do administrador, e a publicação desses refinamentos não ativa a reativação.

## Inclusão pontual de descartados

Descartados selecionados para uma nova tentativa entram em uma fila de espera administrativa, separada dos acompanhamentos ativos. **Aguardando atendente** mostra nome, imóvel/interesse, corretor anterior e data da inclusão, com busca e paginação. Essa lista considera todas as pendências e não usa os filtros de período ou responsável do relatório. Também não soma tentativas ou produtividade antes do início do acompanhamento.

O lote guarda o retrato da inclusão e evita duplicação. Enquanto não houver atendente vinculada com o fluxo ativo, o lead mantém seu status e responsável. No processamento, o banco confirma novamente se o lead continua descartado e sem acompanhamento ativo; só então transfere à atendente e cria a tarefa. Contatos que mudaram de situação enquanto aguardavam são ignorados, com registro do motivo. Os históricos anteriores permanecem preservados.

Essa inclusão é pontual: a regra recorrente de 14 dias continua restrita aos leads abertos. Encerrar um acompanhamento sem interesse não reinclui automaticamente o lead na espera. A fila de entrada e sua consulta permanecem restritas aos administradores.
