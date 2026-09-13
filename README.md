# VilaVix Imóveis

Site imobiliário e CRM com catálogo real da VilaVix, atendimento comercial e distribuição de leads por campanha Meta Ads consultada pela Zernio.

Produção: [vilavix.com](https://vilavix.com), na equipe Vercel **VilaVix**, projeto **vilavixsite**, conectado ao Supabase `xrbegboejhaumwbtpuej`.

O banco real recebeu as seis migrações, 599 imóveis e acesso à carteira privada somente para Weder, Wellington e Felipe. As campanhas são atualizadas automaticamente pela Zernio a cada dez minutos, com descoberta dos identificadores que a listagem geral pode omitir. A publicação foi verificada em 12/09/2026 (horário de São Paulo).

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

A produção preserva os fluxos existentes de leads e notificações. Três campanhas ativas foram configuradas com seus participantes anteriores; campanhas não configuradas mantêm a distribuição existente. Consulte [Entrada de leads](docs/ENTRADA-DE-LEADS.md), [Sincronização](docs/SINCRONIZACAO-DE-CAMPANHAS.md) e [Gestão de aluguéis](docs/rental-management.md).
