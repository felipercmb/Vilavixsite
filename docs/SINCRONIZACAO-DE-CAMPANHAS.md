# Sincronização automática das campanhas

A função, os segredos, o Vault e o job `vilavix-zernio-campaign-sync` estão instalados no projeto real `xrbegboejhaumwbtpuej`, com atualização a cada dez minutos. A chamada autenticada da versão corrigida e a execução automática de 12/09/2026 às 22:30 (São Paulo) retornaram HTTP 200, 45 campanhas e três ativas. O agendamento é instalado separadamente das migrações da aplicação.

## Por que uma função separada

A roleta exige campanhas sincronizadas nos últimos 30 minutos. Uma rotina independente mantém essa atualização fora do horário de uso do CRM e preserva a resposta rápida das entradas `zernio-lead`, `lead-webhook` e `meta-webhook`.

A Edge Function `sync-zernio-campaigns` usa a mesma implementação da Zernio que `/api/campaigns`: `supabase/functions/_shared/zernio.js`. `server/zernio.js` apenas reexporta esse módulo. Todas as importações da Edge Function são relativas e ficam dentro de `supabase/functions`; não há dependência remota durante sua preparação.

Ela consulta todas as páginas e também recupera os IDs dos últimos 90 dias de entrada e das campanhas já ativas/habilitadas pelo RPC `discover_zernio_campaign_ids`, exclusivo do servidor. Consulta cada ID conhecido diretamente na Zernio, valida a conta e o estado atual e só então faz uma única chamada ao RPC `sync_zernio_campaigns`. Essa chamada atualiza metadados em transação e preserva participantes, pesos, limites, habilitação e `routing_configured`. A função não ativa anúncios, não distribui pendências e não envia mensagens.

Falhas de consulta não gravam uma lista parcial nem renovam a data de sincronização. Dados que completarem 30 minutos sem atualização deixam de autorizar a distribuição. Se a resposta da gravação no banco for interrompida, o resultado fica sem confirmação; consulte a última atualização no banco antes de concluir se a transação foi aplicada. O limite de execução da função é de 90 segundos; cada consulta ao provedor também mantém seu limite próprio.

## Segredos e publicação

1. Confirme o projeto de produção e aplique as migrações de campanhas e `20260912195000_campaign_discovery.sql` antes de instalar a rotina.
2. Gere uma chave aleatória dedicada com pelo menos 256 bits. Configure-a como `CAMPAIGN_SYNC_CRON_KEY` nas Edge Functions e salve o mesmo valor no Supabase Vault com um nome exclusivo, como `campaign_sync_cron_key`. Use os formulários de segredos ou um arquivo privado fora do repositório. Não coloque o valor em código, histórico de comandos, SQL salvo ou documentos.
3. Configure no ambiente da Edge Function `ZERNIO_API_KEY`, `ZERNIO_ACCOUNT_ID` e `ZERNIO_AD_ACCOUNT_ID` da conta verificada. Esses valores não são herdados automaticamente da Vercel. `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são fornecidos pelo ambiente das Edge Functions.
4. Publique apenas `sync-zernio-campaigns`, fornecendo o identificador verificado do projeto ao comando de publicação. `supabase/config.toml` configura `verify_jwt=false` somente para essa função. Ela exige `X-Campaign-Sync-Key`, compara hashes em um percurso fixo e rejeita chamadas sem a chave dedicada. Tokens anon, JWTs de usuários e o cabeçalho de autorização service role não autenticam essa função.
5. Confirme o endpoint publicado e faça uma chamada privada de verificação usando a chave dedicada, sem imprimir os cabeçalhos. A resposta deve ter `ok: true`; uma chamada sem a chave deve retornar 401. As contagens de campanhas podem ser zero, desde que correspondam à consulta real.

O transporte permitido é POST. As respostas de falha e os logs contêm somente a etapa e um código fixo; não incluem chaves, cabeçalhos, dados recebidos do provedor ou exceções completas.

## Instalação manual do agendamento

Habilite Supabase Cron, `pg_net` e Vault no projeto confirmado. Execute `scripts/install-campaign-sync-cron.sql` por uma conexão de administrador do banco. O arquivo somente define um instalador; não agenda nem chama a função por conta própria.

Depois da verificação do endpoint, chame `public.install_campaign_sync_schedule` com parâmetros vinculados:

| Parâmetro | Valor fornecido pelo operador |
| --- | --- |
| `p_deployed_endpoint` | URL exata da Edge Function publicada |
| `p_verified_project_ref` | Referência do projeto conferido |
| `p_vault_secret_name` | Nome do segredo no Vault, sem seu valor |
| `p_endpoint_verified` | `true`, depois da verificação da chamada |

O instalador exige que a URL seja `https://<referência-verificada>.supabase.co/functions/v1/sync-zernio-campaigns`. Ele cria ou atualiza o job nomeado `vilavix-zernio-campaign-sync` a cada dez minutos. O comando armazenado pelo Cron lê a chave do Vault durante a execução; a chave não fica na definição do job. Usuários da aplicação e service role não têm permissão de executar o instalador.

Confirme o retorno HTTP 200 da Edge Function e o avanço de `campaigns.synced_at`. Um status de sucesso no Cron significa que a requisição HTTP foi enfileirada; ele não comprova sozinho que a sincronização terminou. Antes de habilitar a distribuição, observe pelo menos uma execução agendada completa. Para girar a chave, atualize o ambiente da Edge Function e o valor correspondente no Vault; não crie um segundo segredo com o mesmo nome.

## Validação local

Os testes usam respostas simuladas e um banco local. Cobrem autenticação, paginação, confirmação de campanhas ativas, ausência de gravação parcial, tempo limite, mensagens sem segredos, chamadas simultâneas e as restrições do instalador. A entrada TypeScript também passa na checagem do Deno sem acesso remoto. Cron/pg_net/Vault foram instalados e a chamada autenticada publicada foi validada no banco real. Confirmar novamente a execução agendada após futuras alterações.

## Fontes

- [Agendamento de Edge Functions com Cron, pg_net e Vault](https://supabase.com/docs/guides/functions/schedule-functions).
- [Supabase Cron](https://supabase.com/docs/guides/cron).
- [Limites de Cron na Vercel](https://vercel.com/docs/cron-jobs/usage-and-pricing): o plano Hobby permite execução diária, insuficiente para a validade de 30 minutos desta roleta.
