# VilaVix: site e CRM

## Executar e revisar

Use Node.js 22 ou superior. Na pasta do projeto:

```
npm ci
npm run dev
```

O site funciona com o catálogo público importado, sem precisar entrar no CRM. Os anúncios mantêm código, URL de origem, data da coleta e galerias originais. Fotos são servidas pelo CDN de origem; não representam cópias locais.

A rota `/crm/dashboard?demo=true` existe apenas no servidor de desenvolvimento. Ela separa os dados de revisão dos registros reais. Campanhas consultadas pela Zernio são reais; a distribuição e as alterações nessa revisão ficam no navegador. Esse acesso não é incluído como opção operacional no build de produção.

```
npm test
npm run build
```

## Campanhas Meta pela Zernio

O servidor usa `ZERNIO_API_KEY` exclusivamente no cabeçalho Authorization das chamadas a `https://zernio.com/api/v1`. A chave não é enviada ao navegador. Configure `ZERNIO_ACCOUNT_ID` e `ZERNIO_AD_ACCOUNT_ID` para fixar a conta desejada. No ambiente local, Vite lê o arquivo `.env` do workspace pai e `.env.local` deste projeto. Nenhum desses arquivos entra no Git.

O botão de sincronização consulta todas as páginas de `/ads/campaigns`, com `source=all`, incluindo anúncios criados fora da Zernio. Um estado ativo depende da campanha e dos anúncios agregados; uma campanha pausada, encerrada, indisponível ou fora de período não participa da roleta. Falhas de sincronização e dados com atualização pendente são apresentados como erro, não como zero campanhas.

Campanhas candidatas à distribuição também têm seu estado confirmado por consulta individual na Zernio, evitando usar um agregado em cache depois de uma pausa na Meta.

A distribuição exige participantes selecionados, corretor ativo, peso positivo, limite diário disponível e sincronização recente (até 30 minutos). Usa o dia de São Paulo. A seleção ponderada ocorre numa transação no banco, serializada por campanha. Repetir a operação do mesmo lead retorna a atribuição existente; não substitui um corretor já responsável. A trilha de atribuição fica em `lead_assignments` e no histórico do lead.

## Situação dos ambientes em 12/09/2026

| Ambiente | Endereço | Projeto Supabase | Situação verificada |
| --- | --- | --- | --- |
| Produção real solicitada | https://vilavix.com | `xrbegboejhaumwbtpuej` | Acesso ao banco confirmado na organização correta pelo painel Supabase autenticado. Esquema, entradas existentes e contas solicitadas foram conferidos. Acesso Vercel confirmado na equipe VilaVix / projeto vilavixsite. Migrações, permissões da carteira e nova publicação ainda pendentes. |
| Publicação provisória deste repositório | https://vilavix-imoveis.vercel.app | `zinayjqfgvywlmybhvvy` | Build publicado e migrações aplicadas neste projeto separado. Não substitui a produção em `vilavix.com`. |

O projeto `zinayjqfgvywlmybhvvy` foi restaurado e recebeu as quatro migrações de catálogo, campanhas, acesso e carteira de aluguel pelo SQL Editor autenticado. Seus registros existentes foram preservados. Essas aplicações e verificações se referem exclusivamente ao ambiente provisório; nenhuma dessas migrações foi aplicada em `xrbegboejhaumwbtpuej`.

A organização correta do Supabase foi localizada e o banco real passou a ser acessível na sessão autenticada. A inspeção somente leitura anterior às migrações registrou **2.200 leads, 18.026 tarefas, 473 comentários, 10 perfis e nenhum imóvel** em `public.imoveis`. Esses totais servem de referência para conferir a preservação dos registros existentes durante a ativação; a importação do catálogo acrescentará imóveis. As contas de Felipe, Weder e Wellington foram identificadas de forma única, com correspondência entre perfil e usuário autenticável e perfis ativos. E-mails e UUIDs ficam apenas no material local de provisionamento, fora do repositório público. A conferência das contas ainda não concede acesso à carteira.

O acesso Vercel foi confirmado para a equipe **VilaVix** (`vila-vix`, `team_AEKV7YqahZWh6kHMZb3U4Bjr`), com o projeto **vilavixsite** (`prj_GqrVaqLnKfPJZZPYZFm47WCcRYyX`) selecionado. `.vercel/project.json` aponta para esse destino. O projeto já possui `vilavix.com` e `www.vilavix.com`; não é necessário transferir o domínio ao projeto provisório. A associação não verificada tentada no projeto provisório foi removida, sem alterar o DNS, o projeto original ou a versão ativa.

A publicação ainda ativa é `dpl_B2SJ3oRa3R9EKNeXLtZnjAe18zKu`, de 17/07/2026, em `vilavixsite-gcg8xcoc0-vila-vix.vercel.app`. Seus metadados citam a branch `feat/roleta-segmentada-e-crm-mobile`, SHA `11405b1e5f477e0889bda6e7ee2241e426687e42` e alterações locais não commitadas (`git_dirty: true`). Esse commit não está disponível no clone nem no GitHub atual. Nenhum novo deploy foi feito nesse projeto durante a conexão.

O acesso ao banco e a identidade dos usuários estão confirmados. A próxima etapa é concluir os testes de compatibilidade e aplicar as migrações no banco real, preservando os dados e os fluxos existentes, antes de publicar a nova versão. O destino de conexão permanece `xrbegboejhaumwbtpuej`; o banco provisório não substitui a produção.

## Preparar o banco para publicação

Para ativar no banco real já identificado, após concluir a validação de compatibilidade:

1. Conferir o esquema existente contra as migrações preparadas e `supabase_migration_automation.sql`, incluindo os gatilhos de distribuição e notificação. Preservar os dados da produção; não reaplicar o esquema base como substituição do banco em uso.
2. Aplicar `supabase/migrations/20260912180000_catalog.sql`.
3. Aplicar `supabase/migrations/20260912181000_campaign_routing.sql`.
4. Aplicar `supabase/migrations/20260912182000_access.sql` e depois `supabase/migrations/20260912190000_rental_management.sql`. Membros existentes são preservados; novos cadastros precisam ser ativados por um administrador. Liberar somente as três contas já conferidas para a carteira privada, usando os UUIDs do material local protegido, conforme `docs/rental-management.md`.
5. Configurar as variáveis de `.env.example` no provedor. Somente a URL e a chave pública/anon usam prefixo `VITE_`.
6. Executar `node --env-file=.env.production scripts/persist-catalog.mjs` em ambiente seguro.
7. Aplicar `supabase/migrations/20260912200000_inbound_campaign_bridge.sql` e validar a integração das entradas existentes conforme [Entrada de leads](ENTRADA-DE-LEADS.md). Antes de habilitar a distribuição, publicar a Edge Function e instalar o agendamento a cada dez minutos conforme [Sincronização automática das campanhas](SINCRONIZACAO-DE-CAMPANHAS.md). Entrar como administrador, conferir as campanhas da Zernio, selecionar os corretores por campanha e habilitar a distribuição desejada. Conferir a preservação dos registros, a ausência de atribuições duplicadas e o fluxo de notificação.

No Supabase Auth do projeto provisório `zinayjqfgvywlmybhvvy`, o Site URL está configurado como `https://vilavix-imoveis.vercel.app` e o retorno exato `https://vilavix-imoveis.vercel.app/redefinir-senha` foi salvo na lista autorizada em 12/09/2026. Embora os usuários do banco real tenham sido conferidos, a configuração dos retornos de autenticação de `xrbegboejhaumwbtpuej` ainda precisa ser validada para a nova publicação. Conferir o Site URL e a autorização de `https://vilavix.com/redefinir-senha` nesse banco. O código já calcula o retorno usando a origem da página. Nenhum e-mail foi enviado durante a publicação provisória.

A importação para o banco preserva o status de imóveis já cadastrados (por exemplo, vendido ou reservado). Metadados de campanhas são atualizados apenas pelo servidor; os usuários não podem falsificar o estado ativo da Meta editando uma regra.

### Entradas existentes na produção real

O banco real já recebe leads pelas Edge Functions `lead-webhook`, `meta-webhook` e `zernio-lead`. O gatilho `leads_roleta`, executado antes da inserção, chama `assign_corretor_roleta`; o gatilho `leads_notify_whatsapp` roda depois da inserção. A integração com as novas regras por campanha está em preparação e ainda não foi instalada no banco real. A ativação precisa preservar a ordem da atribuição e da notificação e evitar uma segunda distribuição do mesmo lead.

A função `zernio-lead` ignora o formulário universal porque essa entrada é atendida pelo fluxo da planilha. A deduplicação usa a restrição única de `external_id`. Preservar essa divisão de entradas e a restrição ao integrar as regras de campanha. O recebimento existente foi identificado; o funcionamento das novas regras sobre essas entradas ainda precisa ser verificado após a aplicação.

## Pendências de ativação em 12/09/2026

- Concluir os testes de compatibilidade e aplicar as migrações em `xrbegboejhaumwbtpuej`, cujo acesso já está confirmado. Integrar e validar a distribuição por campanha nas entradas existentes, preservando os registros e a deduplicação. Nenhuma dessas aplicações deve ser presumida concluída no banco real.
- A carteira privada foi criada sem membros somente em `zinayjqfgvywlmybhvvy`. As contas exatas e ativas de Weder, Wellington e Felipe já foram conferidas no banco real; falta conceder o acesso às três após a migração e verificar a restrição para os demais usuários.
- URL/chave pública do Supabase provisório e variáveis Zernio estão configuradas no projeto Vercel provisório. A chave privada `SUPABASE_SERVICE_ROLE_KEY` ainda precisa ser configurada para a sincronização de campanhas; sem ela, a API retorna 503 sem expor dados. Essa chave não é necessária para a carteira de aluguel, que usa a sessão do usuário e funções protegidas no banco. No projeto real, foram verificados somente os nomes `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, configurados para Production como segredos sem leitura posterior. Seus valores não foram alterados. As variáveis do servidor e da Zernio ainda precisam ser configuradas nessa publicação, usando o banco real.
- Os 599 imóveis importados estão no catálogo da publicação provisória. A persistência em lote pelo script `persist-catalog.mjs` ainda depende da chave privada de servidor; a estrutura e a função de importação foram aplicadas somente a `zinayjqfgvywlmybhvvy`.
- Concluir as conexões autenticadas das ferramentas de publicação e banco. As autorizações de CLI da Vercel e MCP do Supabase estão pendentes; o acesso confirmado pelos painéis não significa que essas conexões já estejam prontas.
- Publicar e verificar a nova versão no projeto Vercel `vila-vix/vilavixsite`, usando o banco real após as etapas acima. O DNS do domínio próprio não foi alterado e a associação não verificada ao projeto provisório já foi removida. A versão ativa de `vilavix.com` continua sendo a anterior.

## Fontes técnicas

- [Campanhas na API Zernio](https://docs.zernio.com/ad-campaigns/list-ad-campaigns)
- [Contas Meta Ads](https://docs.zernio.com/platforms/meta-ads)
- [Autenticação da Zernio](https://docs.zernio.com/)
