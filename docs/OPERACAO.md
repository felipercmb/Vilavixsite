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

## Preparar o banco para produção

Em 12/09/2026, o projeto Supabase `zinayjqfgvywlmybhvvy` foi restaurado e as quatro migrações de catálogo, campanhas, acesso e carteira de aluguel foram aplicadas pelo SQL Editor autenticado. Os registros existentes foram preservados. A versão está publicada em https://vilavix-imoveis.vercel.app.

Para uma nova instalação:

1. Confirmar o schema base existente e `supabase_migration_automation.sql`.
2. Aplicar `supabase/migrations/20260912180000_catalog.sql`.
3. Aplicar `supabase/migrations/20260912181000_campaign_routing.sql`.
4. Aplicar `supabase/migrations/20260912182000_access.sql` e depois `supabase/migrations/20260912190000_rental_management.sql`. Membros existentes são preservados; novos cadastros precisam ser ativados por um administrador. A carteira privada exige uma liberação adicional por UUID, conforme `docs/rental-management.md`.
5. Configurar as variáveis de `.env.example` no provedor. Somente a URL e a chave pública/anon usam prefixo `VITE_`.
6. Executar `node --env-file=.env.production scripts/persist-catalog.mjs` em ambiente seguro.
7. Entrar como administrador, sincronizar Zernio, selecionar os corretores por campanha e habilitar a distribuição desejada.

No Supabase Auth, adicione a URL do site terminada em `/redefinir-senha` às URLs de redirecionamento autorizadas. O fluxo de recuperação envia o e-mail e oferece a tela para escolher e confirmar a nova senha.

A importação para o banco preserva o status de imóveis já cadastrados (por exemplo, vendido ou reservado). Metadados de campanhas são atualizados apenas pelo servidor; os usuários não podem falsificar o estado ativo da Meta editando uma regra.

O fluxo de receber automaticamente novos leads da Meta por webhook ainda depende de conectar o endpoint de entrada ao provedor. A roleta implementada distribui leads cadastrados/importados no CRM com campanha identificada; não afirma estar capturando mensagens ou formulários sem essa conexão.

## Pendências de ativação em 12/09/2026

- A carteira privada foi criada sem membros. Confirmar e provisionar as contas exatas de Weder, Wellington e Felipe antes de conceder acesso.
- URL/chave pública do Supabase e variáveis Zernio estão configuradas na Vercel. A chave privada `SUPABASE_SERVICE_ROLE_KEY` ainda precisa ser configurada para a sincronização de campanhas; sem ela, a API retorna 503 sem expor dados. Essa chave não é necessária para a carteira de aluguel, que usa a sessão do usuário e funções protegidas no banco.
- Os 599 imóveis importados estão no catálogo publicado. A persistência em lote pelo script `persist-catalog.mjs` ainda depende da chave privada de servidor; a estrutura e a função de importação já estão no banco.
- O domínio próprio não teve DNS alterado. A publicação usa o endereço da Vercel acima.

## Fontes técnicas

- [Campanhas na API Zernio](https://docs.zernio.com/ad-campaigns/list-ad-campaigns)
- [Contas Meta Ads](https://docs.zernio.com/platforms/meta-ads)
- [Autenticação da Zernio](https://docs.zernio.com/)
