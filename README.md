# VilaVix Imóveis

Site imobiliário e CRM com catálogo real da VilaVix, atendimento comercial e distribuição de leads por campanha Meta Ads consultada pela Zernio.

Publicação provisória para revisão: [vilavix-imoveis.vercel.app](https://vilavix-imoveis.vercel.app). O destino solicitado é [vilavix.com](https://vilavix.com), cuja versão ativa ainda não foi substituída por este projeto.

Em 12/09/2026, o site ativo em `vilavix.com` foi identificado usando o Supabase `xrbegboejhaumwbtpuej`. Este repositório e a publicação provisória estão configurados com outro projeto, `zinayjqfgvywlmybhvvy`. É necessário acessar as contas corretas da Vercel e do Supabase e verificar a compatibilidade do banco em uso antes de alterar a produção real.

## Começar

Requer Node.js 22 ou superior.

```sh
npm ci
npm run dev
```

O catálogo público funciona sem conexão com o banco. Para revisar o CRM com contatos fictícios, abra `/crm/dashboard?demo=true` no servidor local. As campanhas da Zernio são reais; ações na revisão ficam somente no navegador. O acesso de revisão é desabilitado em produção.

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

As quatro migrações foram aplicadas somente ao projeto Supabase da publicação provisória, `zinayjqfgvywlmybhvvy`, em 12/09/2026. Não foram aplicadas nem verificadas no banco `xrbegboejhaumwbtpuej` usado por `vilavix.com`. Consulte as pendências em [Operação](docs/OPERACAO.md), incluindo a identificação das contas corretas, os usuários autorizados para [gestão de aluguéis](docs/rental-management.md) e a chave de servidor da sincronização de campanhas. A recepção automática de formulários Meta por webhook ainda precisa de uma integração de entrada; a roleta atual atende leads cadastrados no CRM com campanha selecionada.
