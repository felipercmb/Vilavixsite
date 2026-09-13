# Operação VilaVix

## Produção verificada em 12/09/2026

- Domínio: https://vilavix.com (e www.vilavix.com).
- Vercel: equipe `vila-vix`, projeto `vilavixsite`.
- Supabase: `xrbegboejhaumwbtpuej`.
- Versão publicada: `dpl_HRaiEPdAY2Yd1h33PAEqUbqW7qQW`, código `f249c99`.
- Seis migrações aplicadas; 599 imóveis, com códigos únicos e origem verificada.
- Carteira privada liberada somente para Weder, Wellington e Felipe. Nove tabelas com RLS e documentos em bucket privado.
- Antes e depois da migração: 2.201 leads, 18.026 tarefas, 473 comentários e 10 perfis. Nenhum lead ou registro financeiro de teste foi criado.

A publicação usa o projeto original e seus domínios. Não transferir o domínio nem conectar o banco provisório `zinayjqfgvywlmybhvvy` à produção. O projeto provisório não é o destino operacional.

## Desenvolvimento e configuração

Use Node.js 22 ou superior, `npm ci`, `npm run dev`, `npm test` e `npm run build`.

O catálogo público funciona sem login. Fotos continuam no CDN de origem. O modo `/crm/dashboard?demo=true` só existe no desenvolvimento; a publicação exige login mesmo com esse parâmetro.

Configure os nomes de `.env.example` no ambiente correto. Apenas URL e chave pública do Supabase usam prefixo `VITE_`. O build recusa configuração pública incompleta. Chaves de servidor e Zernio ficam protegidas; nunca devem estar no código público. A conexão CLI da VilaVix usa configuração privada separada da conta pessoal.

O Supabase Auth usa Site URL `https://vilavix.com` e retorno exato autorizado `https://vilavix.com/redefinir-senha`. Nenhum e-mail de redefinição foi enviado na validação.

## Campanhas e distribuição

A sincronização consulta todas as páginas da Zernio e recupera também IDs presentes nos registros de entrada recentes ou em campanhas já ativas/habilitadas. Cada campanha descoberta é consultada individualmente e sua conta de anúncios é validada antes da gravação. Isso corrige a listagem geral que omitia campanhas que estavam recebendo leads.

A validação final encontrou 45 campanhas, três ativas. Os participantes foram preservados conforme regras e atribuições existentes:

| Campanha ativa | Distribuição |
| --- | --- |
| Vivenda Coqueiral Nacional | Os sete corretores da regra Coqueiral |
| Vivenda Coqueiral EUA | Wellington |
| Captação Locação Proprietários | Wellington, responsável fixo existente |

A regra legada Aluguel permanece destinada a Weder. Captação de proprietários não foi confundida com essa regra.

Salvar uma regra marca a campanha como configurada. A partir daí, a distribuição exige status ativo, sincronização de até 30 minutos, participantes ativos, pesos positivos e capacidade diária disponível. Desligar uma regra já configurada bloqueia a distribuição dessa campanha. Campanhas ainda não configuradas e entradas não identificadas mantêm o fluxo anterior, com motivo registrado. Nenhum anúncio foi ativado ou alterado na Meta.

A seleção é transacional, ponderada e usa o dia de São Paulo. Uma atribuição repetida devolve a existente. Corretores não podem alterar responsáveis ou os campos usados para calcular a roleta; mantêm a edição normal de seus atendimentos.

O job `vilavix-zernio-campaign-sync` está ativo a cada dez minutos. A função exige uma chave dedicada, guardada também no Vault. Verificar o HTTP final e `campaigns.synced_at`, pois o sucesso do Cron sozinho indica apenas enfileiramento. Consulte [Sincronização](SINCRONIZACAO-DE-CAMPANHAS.md).

## Entrada de leads

`lead-webhook`, `meta-webhook` e `zernio-lead` continuam sendo as entradas da produção. A função `zernio-lead` resolve o identificador canônico da campanha antes de inserir o lead. Formulário universal, deduplicação por `external_id`, logs e fluxo de notificações foram preservados.

A atribuição ocorre antes de `leads_notify_whatsapp`. As funções legadas de distribuição e notificação foram preservadas; a ponte controla qual distribuição usar. Não enviar leads de teste à produção: os gatilhos disparam notificações reais. Consulte [Entrada de leads](ENTRADA-DE-LEADS.md).

## Novas instalações e manutenção

Aplicar as migrações na ordem dos nomes, após inspecionar o esquema existente. Não substituir um banco em uso pelo esquema base. A importação preserva o status de imóveis já cadastrados; ver [Catálogo](catalog-import.md).

Permissões da carteira devem usar contas exatas autorizadas; não são derivadas do papel de administrador. Ver [Gestão de aluguéis](rental-management.md). Contratos, valores, recebimentos e documentos reais devem ser cadastrados pela equipe; a carteira começa sem lançamentos financeiros artificiais.

## Validação

63 testes automatizados passaram, além de oito cenários isolados da função de entrada e verificação Deno. O build de produção concluiu. As rotas públicas responderam HTTP 200 e a API de campanhas recusou visitantes com HTTP 401. O navegador confirmou a nova página inicial e a exigência de login da carteira. As permissões foram verificadas no banco real, incluindo negação para visitantes e para corretor fora dos três autorizados.
