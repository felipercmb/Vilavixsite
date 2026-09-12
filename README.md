# VilaVix Imóveis

Site imobiliário e CRM com catálogo real da VilaVix, atendimento comercial e distribuição de leads por campanha Meta Ads consultada pela Zernio.

Publicação provisória para revisão: [vilavix-imoveis.vercel.app](https://vilavix-imoveis.vercel.app). O destino solicitado é [vilavix.com](https://vilavix.com), cuja versão ativa ainda não foi substituída por este projeto.

Em 12/09/2026, o acesso ao Supabase da produção real, `xrbegboejhaumwbtpuej`, foi confirmado na organização correta, com conferência do esquema e dos usuários pelo painel autenticado. Este repositório e a publicação provisória estão configurados com outro projeto, `zinayjqfgvywlmybhvvy`. O acesso à Vercel foi confirmado na equipe **VilaVix**, projeto **vilavixsite**, e o vínculo local de publicação já aponta para esse destino. A aplicação das migrações no banco real, a liberação dos três usuários da carteira privada, a configuração das credenciais de conexão e a publicação em `vilavix.com` permanecem pendentes.

## Começar

Requer Node.js 22 ou superior.

```sh
npm ci
npm run dev
```

O catálogo público funciona sem conexão com o banco. Para revisar o CRM com contatos fictícios, abra `/crm/dashboard?demo=true` no servidor local. As campanhas da Zernio são reais; ações na revisão ficam somente no navegador. O acesso de revisão é desabilitado em produção.

Para gerar uma publicação, configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no ambiente de destino. O build recusa configuração incompleta, inclusive em previews, para evitar conectar o CRM ao banco provisório por padrão. O fallback existe somente no servidor de desenvolvimento.

## Estrutura

- `pages/public` e `components`: busca, favoritos, fichas, galerias e contato.
- `pages/crm`: contatos, funil, tarefas, visitas, catálogo, equipe, campanhas e carteira privada de aluguel.
- `lib`: acesso aos dados, conversores e regras compartilhadas.
- `server` e `api`: conexão protegida com a Zernio.
- `data/catalog.json`: 599 imóveis publicados, com origem e data de coleta.
- `scripts/import-catalog.py`: coleta verificável do site antigo, com relatório de cobertura.
- `supabase/migrations`: importação, distribuição transacional e controles de acesso.
- `tests`: verificação das permissões, API, pesos, cotas e histórico da roleta.

```sh
npm test
npm run build
npm run catalog:import
```

## Integração e publicação

Consulte [Operação](docs/OPERACAO.md) para configurar o banco, autenticação, campanhas e ambiente de produção. Consulte [Importação do catálogo](docs/catalog-import.md) para metodologia, fontes e execução da coleta.

As quatro migrações foram aplicadas somente ao projeto Supabase da publicação provisória, `zinayjqfgvywlmybhvvy`, em 12/09/2026. Ainda não foram aplicadas ao banco `xrbegboejhaumwbtpuej` usado por `vilavix.com`. As contas de Felipe, Weder e Wellington foram conferidas no banco real, mas o acesso à [gestão de aluguéis](docs/rental-management.md) ainda não foi concedido. A produção já recebe leads pelas funções `lead-webhook`, `meta-webhook` e `zernio-lead`, com distribuição e notificação existentes. A integração dessas entradas com as novas regras de campanha está em preparação e ainda precisa ser aplicada e validada. Consulte as pendências em [Operação](docs/OPERACAO.md).
