# Gestão privada de aluguéis

A carteira administrativa é separada do catálogo público. Proprietários, contatos de locatários, contratos, recebimentos, repasses, documentos e histórico nunca são consultados pelas páginas públicas.

## Publicação e liberação

A carteira foi publicada em https://vilavix.com no projeto Vercel `vila-vix/vilavixsite`, usando o Supabase `xrbegboejhaumwbtpuej`. A migração e as permissões estão aplicadas no banco real.

Somente **Weder, Wellington e Felipe** estão habilitados. As três contas foram conferidas entre perfil e usuário autenticável, com perfis ativos. E-mails e UUIDs permanecem apenas no material local protegido. A validação confirmou acesso dos três, negação para outro corretor e visitantes, nove tabelas protegidas e bucket privado. A carteira começa sem contratos ou lançamentos financeiros artificiais.

Para novas instalações ou liberações futuras:

1. Após confirmar o projeto de destino e a compatibilidade com seu esquema existente, aplicar as migrações necessárias na ordem indicada pelos nomes, incluindo `supabase/migrations/20260912190000_rental_management.sql` após as migrações de catálogo, campanhas e acesso. Não substituir o esquema de um banco em uso pelo esquema base sem revisão. A migração é repetível e não semeia contratos, valores ou permissões reais.
2. Usar exclusivamente os UUIDs das três contas já conferidas no banco real, registrados no material local protegido. A conferência incluiu os e-mails de login exatos e os perfis ativos. Não conceder acesso por semelhança de nome nem a todos os administradores. Para futuras liberações, conferir a identidade exata antes de provisionar.
3. O SQL editor autenticado do projeto ou uma operação protegida de servidor pode inserir os UUIDs aprovados em `public.rental_members`. A aplicação cliente não tem permissão de inclusão, alteração ou exclusão nesta tabela. Não colocar uma chave `service_role` no navegador ou em variável `VITE_*`.

Exemplo para um UUID já conferido (substituir o marcador):

```sql
INSERT INTO public.rental_members(profile_id, enabled)
VALUES ('UUID_EXATO_JA_CONFERIDO'::uuid, true)
ON CONFLICT(profile_id) DO UPDATE SET enabled = true;
```

O perfil também precisa de `profiles.ativo = true`. O papel `admin`, o nome visível ou parâmetros de URL não substituem essa exigência. Para revogar somente a carteira:

```sql
UPDATE public.rental_members SET enabled = false
WHERE profile_id = 'UUID_EXATO_JA_CONFERIDO'::uuid;
```

Em uma instalação nova, a lista começa vazia: sem UUIDs explicitamente aprovados, nenhum usuário real entra. `has_rental_access()` é usado para a navegação; todas as tabelas, operações de escrita e o armazenamento verificam a mesma permissão novamente. Mudanças na própria lista também ficam na auditoria.

## Registros e fluxo

- **Imóveis administrados:** dados privados do proprietário, endereço, observações e código opcional do anúncio público. Arquivar exige encerrar os contratos ativos.
- **Contratos:** imóvel, locatário, datas, aluguel, taxa administrativa, vencimento, dia previsto do repasse, próximo reajuste, índice e observações. Contratos sobrepostos no mesmo imóvel são recusados. Rascunhos não geram cobrança.
- **Cobranças:** uma por contrato e competência, com aluguel, taxa e datas congelados no momento da geração. A operação pode ser repetida sem duplicar. Meses posteriores ao atual ou fora do período contratual não são gerados. Dias 29–31 são limitados ao último dia válido do mês.
- **Meses parciais e descontos:** a geração usa o aluguel mensal integral; não presume regra de proporcionalidade. Antes de qualquer recebimento, conferir o valor combinado e usar o ajuste com motivo obrigatório. O valor anterior, novo e o motivo ficam no histórico. Após receber qualquer valor, a cobrança não pode mais ser alterada.
- **Recebimentos:** baixas manuais, totais ou parciais, com data efetiva, forma de pagamento e observação. Não representam confirmação bancária automática.
- **Repasses:** registros de transferências já realizadas, com data efetiva e observação. A ferramenta não movimenta dinheiro.
- **Pendências:** prazo, prioridade e situação para manutenção, documentos e outros acompanhamentos.
- **Documentos:** PDF, JPG ou PNG de até 10 MB, ligados a um contrato. O navegador verifica o formato do conteúdo; o bucket privado reforça tamanho e MIME. Links assinados duram 60 segundos e não são salvos no banco. Um link já emitido pode funcionar até expirar mesmo após revogação de acesso.

## Regras financeiras

Todos os valores são inteiros em **centavos**. A taxa é um inteiro em **pontos-base**: `1000` equivale a 10%. A taxa apurada sobre o total recebido é arredondada ao centavo mais próximo, com meio centavo arredondado para cima. Não se somam arredondamentos independentes de cada parcela.

```text
saldo a receber = valor da cobrança − total recebido
saldo para repasse = total recebido − taxa apurada − total repassado
```

Recebimentos acima do saldo da cobrança, repasses acima do disponível e datas futuras são recusados. O banco bloqueia a cobrança durante cada gravação, calcula seus totais e grava o histórico na mesma transação. Uma chave de tentativa evita duplicar recebimentos e repasses após falhas de conexão; o navegador guarda apenas a chave e um identificador criptográfico da solicitação na sessão, sem salvar o conteúdo financeiro nessa chave.

Recebimentos, repasses e auditoria são imutáveis, inclusive por atualização direta. Não há exclusão silenciosa de histórico. Esta versão não inclui fluxo de estorno, integração bancária, emissão de boletos, assinatura eletrônica ou geração jurídica de contratos. Erros já confirmados em lançamentos devem ser conferidos antes de qualquer correção operacional; não apagar dados financeiros pelo painel do banco.

## Demonstração local

`createRentalRepository({demo: true, userId})` só funciona em desenvolvimento. Dados iniciais são identificados como fictícios e ficam no armazenamento deste navegador, separados por usuário. Documentos de teste também ficam locais. A publicação provisória deste repositório recusa essa opção; nunca substitui falha de acesso ou de conexão por dados de demonstração. Isso não constitui verificação do código anterior ainda ativo em `vilavix.com`.

## Verificação

`node --test tests/rentals-*.test.mjs` executa testes de calendário e valores exatos, contratos, restrição de arquivos e uma instância PostgreSQL PGlite com RLS e papéis distintos. Cobre negação para administrador não selecionado e perfil inativo, revogação, escrita direta negada, isolamento dos documentos, repetições sem duplicata, limites do saldo, ajustes e auditoria imutável.
