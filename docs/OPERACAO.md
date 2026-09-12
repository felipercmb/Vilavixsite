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
| Produção real solicitada | https://vilavix.com | `xrbegboejhaumwbtpuej` | A versão ativa usa esse banco, identificado no bundle `assets/index-BOGP8JQA.js`. O acesso administrativo ao banco e à conta Vercel responsável ainda precisa ser obtido. |
| Publicação provisória deste repositório | https://vilavix-imoveis.vercel.app | `zinayjqfgvywlmybhvvy` | Build publicado e migrações aplicadas neste projeto separado. Não substitui a produção em `vilavix.com`. |

O projeto `zinayjqfgvywlmybhvvy` foi restaurado e recebeu as quatro migrações de catálogo, campanhas, acesso e carteira de aluguel pelo SQL Editor autenticado. Seus registros existentes foram preservados. Essas operações e verificações se referem exclusivamente ao ambiente provisório; nenhuma migração foi aplicada ou validada em `xrbegboejhaumwbtpuej`.

A sessão Supabase disponível redireciona a tentativa de abrir `xrbegboejhaumwbtpuej` para a organização VilaVix antiga. Na conta Vercel atual, Felipe Cristino's projects, a consulta ao domínio `vilavix.com` retornou 403. A associação ao projeto provisório foi tentada, ficou `verified: false` e foi removida com confirmação HTTP 200. Essa remoção atingiu somente a associação criada durante a tentativa; o domínio no projeto original, seu DNS e o banco ativo não foram alterados. Após a remoção, `vilavix.com` continuou respondendo HTTP 200 com a versão anterior.

Não alterar o banco, o DNS ou a versão ativa de `vilavix.com` antes de obter acesso às contas corretas e verificar o esquema, os usuários e a compatibilidade das migrações no banco realmente utilizado. Também não substituir a referência do banco ativo pela do ambiente provisório para contornar a falta de acesso.

## Preparar o banco para publicação

Para uma nova instalação, ou após confirmar acesso e compatibilidade no ambiente de destino:

1. Confirmar o schema base existente e `supabase_migration_automation.sql`.
2. Aplicar `supabase/migrations/20260912180000_catalog.sql`.
3. Aplicar `supabase/migrations/20260912181000_campaign_routing.sql`.
4. Aplicar `supabase/migrations/20260912182000_access.sql` e depois `supabase/migrations/20260912190000_rental_management.sql`. Membros existentes são preservados; novos cadastros precisam ser ativados por um administrador. A carteira privada exige uma liberação adicional por UUID, conforme `docs/rental-management.md`.
5. Configurar as variáveis de `.env.example` no provedor. Somente a URL e a chave pública/anon usam prefixo `VITE_`.
6. Executar `node --env-file=.env.production scripts/persist-catalog.mjs` em ambiente seguro.
7. Entrar como administrador, sincronizar Zernio, selecionar os corretores por campanha e habilitar a distribuição desejada.

No Supabase Auth do projeto provisório `zinayjqfgvywlmybhvvy`, o Site URL está configurado como `https://vilavix-imoveis.vercel.app` e o retorno exato `https://vilavix-imoveis.vercel.app/redefinir-senha` foi salvo na lista autorizada em 12/09/2026. A configuração Auth de `xrbegboejhaumwbtpuej` não foi acessada nem alterada. Quando a publicação em `vilavix.com` puder ser concluída no ambiente correto, conferir o Site URL e a autorização de `https://vilavix.com/redefinir-senha` nesse banco. O código já calcula o retorno usando a origem da página. Nenhum e-mail foi enviado durante a publicação provisória.

A importação para o banco preserva o status de imóveis já cadastrados (por exemplo, vendido ou reservado). Metadados de campanhas são atualizados apenas pelo servidor; os usuários não podem falsificar o estado ativo da Meta editando uma regra.

O fluxo de receber automaticamente novos leads da Meta por webhook ainda depende de conectar o endpoint de entrada ao provedor. A roleta implementada distribui leads cadastrados/importados no CRM com campanha identificada; não afirma estar capturando mensagens ou formulários sem essa conexão.

## Pendências de ativação em 12/09/2026

- Obter acesso à conta Vercel responsável por `vilavix.com` e ao Supabase `xrbegboejhaumwbtpuej`. A nova publicação no domínio solicitado permanece pendente; nenhuma migração ou troca de banco deve ser presumida concluída nesse ambiente.
- A carteira privada foi criada sem membros somente em `zinayjqfgvywlmybhvvy`. Confirmar as contas exatas de Weder, Wellington e Felipe no banco correto antes de provisionar UUIDs ou conceder acesso.
- URL/chave pública do Supabase provisório e variáveis Zernio estão configuradas no projeto Vercel provisório. A chave privada `SUPABASE_SERVICE_ROLE_KEY` ainda precisa ser configurada para a sincronização de campanhas; sem ela, a API retorna 503 sem expor dados. Essa chave não é necessária para a carteira de aluguel, que usa a sessão do usuário e funções protegidas no banco. As variáveis da produção real não foram verificadas nem alteradas.
- Os 599 imóveis importados estão no catálogo da publicação provisória. A persistência em lote pelo script `persist-catalog.mjs` ainda depende da chave privada de servidor; a estrutura e a função de importação foram aplicadas somente a `zinayjqfgvywlmybhvvy`.
- O DNS do domínio próprio não foi alterado. A associação não verificada ao projeto provisório foi removida e deve permanecer ausente até validar acesso, banco e publicação no ambiente correto. A versão ativa de `vilavix.com` continua sendo a anterior.

## Fontes técnicas

- [Campanhas na API Zernio](https://docs.zernio.com/ad-campaigns/list-ad-campaigns)
- [Contas Meta Ads](https://docs.zernio.com/platforms/meta-ads)
- [Autenticação da Zernio](https://docs.zernio.com/)
