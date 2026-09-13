# Entrada de leads e distribuição por campanha

A migração `20260912200000_inbound_campaign_bridge.sql` conecta a roleta por campanha ao `INSERT` que as integrações existentes já fazem em `leads`. Ela deve ser aplicada depois da migração de campanhas. A preparação e os testes foram locais; este arquivo não indica que a migração já foi aplicada em produção.

## Fluxo preservado

1. `leads_00_campaign_route` identifica a campanha pelo identificador interno, pelo ID externo da Meta ou pelo nome exato, sem diferença entre maiúsculas e minúsculas. A integração antiga também envia nomes de formulários em `campanha`: quando não houver correspondência direta, a ponte consulta o ID da mesma entrega em `zernio_inbound_log` ou a associação única do formulário nos últimos 30 dias. Um nome associado a IDs diferentes permanece sem identificação automática, inclusive se algum desses IDs ainda não estiver no catálogo.
2. A transição é individual: `routing_configured` começa como `false`. Enquanto o administrador não salvar as regras da campanha, continua a distribuição existente, incluindo regras específicas e responsável fixo. Campanhas desconhecidas ou ambíguas também preservam esse fluxo; `routing_reason` registra o motivo. Salvar por `save_campaign_rules` marca `routing_configured=true`, sem alterar anúncios.
3. Para uma campanha configurada, ativa, sincronizada nos últimos 30 minutos e com distribuição habilitada, escolhe um corretor ativo dentro dos participantes, pesos e limites diários. O nome e o ID do corretor entram no próprio registro antes do aviso. `leads_roleta` continua usando a função original `assign_corretor_roleta()` somente para entradas que permanecem na distribuição existente. Sua regra genérica não sobrescreve um bloqueio deliberado de uma campanha configurada.
4. `leads_campaign_audit` grava a atribuição e o comentário depois que o lead existe.
5. `leads_notify_whatsapp` permanece intacto. Recebe o registro com o corretor definido; quando ele está sem corretor, permanece o aviso à empresa previsto na função atual.

Um responsável informado explicitamente no cadastro continua sendo tratado como atribuição manual. A integração não redistribui os leads existentes, não altera campanhas na Meta e não cria disparos adicionais de WhatsApp.

## Leads aguardando revisão

Depois de configuradas, campanhas pausadas, desatualizadas, fora do período, desabilitadas ou sem participantes disponíveis não distribuem automaticamente. O contato é salvo com `routing_status='pending'` e a explicação em `routing_reason`, mantendo o nome recebido em `routing_campaign_reference`. Essas entradas não passam pelo fallback legado. Desabilitar uma regra já configurada é uma suspensão explícita; não volta à distribuição antiga.

Antes da configuração individual, os leads continuam atendidos pela função legada, com `routing_source='legacy'` e motivo registrado. A sincronização não escolhe participantes nem muda `routing_configured`: descobrir uma campanha ou vê-la ficar ativa não altera sozinho a equipe responsável. O primeiro lead de um formulário sem histórico ainda depende do ID enviado pela integração; a ponte nunca inventa essa associação.

A sincronização recorrente da Zernio deve estar configurada antes de habilitar a distribuição automática. A integração exige uma atualização a cada 30 minutos, no máximo. A sincronização de campanhas preserva as regras e não redistribui pendências; a distribuição posterior continua sendo uma ação explícita do administrador.

## Repetição e lotes

O índice único de produção `leads_external_id_uniq` permanece intacto. A integração existente trata o erro `23505` como entrega repetida; uma duplicata não chega ao trigger de notificação. O índice `leads_source_lead_unique` continua disponível para outras entradas que usem `source_lead_id`.

A seleção considera atribuições auditadas e os leads anteriores do mesmo `INSERT` que ainda aguardam os triggers de auditoria. Isso impede que uma inserção em lote exceda os limites ou entregue todos os contatos ao mesmo corretor. O bloqueio da campanha serializa seleções concorrentes. Operações que distribuam várias campanhas em ordens diferentes ainda devem tratar e repetir erros transitórios de transação, como deadlocks, conforme o comportamento normal do PostgreSQL.

O RPC `route_lead` usa a mesma seleção, continua restrito a administradores e retorna a atribuição existente nas repetições para a mesma campanha. Ele não cria outro aviso de WhatsApp: o aviso existente é específico de inserção.

## Verificação local

`tests/inbound-routing.test.mjs` aplica a migração duas vezes e testa uma entrada em lote, pesos, capacidade, identidade, campanhas bloqueadas, transição individual, suspensão explícita, preservação das regras na sincronização, nomes de formulário, históricos ambíguos e antigos, responsável manual, duplicatas, reexecução do RPC e permissões dos auxiliares. O teste substitui o transporte de WhatsApp por uma tabela local de observação; nenhuma mensagem é enviada.
