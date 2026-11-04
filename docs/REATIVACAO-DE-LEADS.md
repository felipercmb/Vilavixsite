# Reativação de leads

A área `/crm/reativacao` mantém uma fila de recuperação separada da captura inicial. É visível aos administradores ativos e à conta escolhida como funcionária de reativação. A instalação começa com `enabled=false` e sem funcionária vinculada: nenhum lead é transferido apenas ao aplicar a migração.

## Ativação

1. Cadastrar a funcionária pela entrada normal de contas e ativar seu perfil no CRM.
2. Abrir **Reativação de leads → Configuração do fluxo**, escolher a conta exata e conferir os participantes.
3. Conferir o total de contatos elegíveis, marcar **Ativar entrada automática após 14 dias** e salvar.

A roleta dos reativados tem ordem e cursor próprios. A lista inicial sugerida usa quem recebe leads nas regras ativas de campanha, regras legadas e destino geral. A funcionária não participa. Antes de cada entrega o banco volta a consultar essas regras: remover ou pausar alguém ali o retira da elegibilidade desta roleta, mesmo que sua seleção anterior ainda exista. A sincronização de anúncios não reinsere participantes removidos. Não há data de retorno para corretores pausados.

## Critério de entrada

O job `vilavix-lead-reactivation` verifica a fila a cada hora, em lotes de até 500. Também repara eventual falta de tarefa em acompanhamentos abertos. Só entram leads atribuídos, abertos (`novo`, `contato`, `atendimento`, `visita`, `proposta`), com pelo menos 14 dias completos desde `last_activity_at` e sem outro acompanhamento ativo. Fechados, descartados, contatos sem responsável e contatos já pertencentes à funcionária ficam fora.

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
