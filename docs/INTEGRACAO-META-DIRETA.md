# Entrada direta da campanha Coqueiral EUA

O endpoint `/api/meta-leads` recebe o evento `leadgen` da Página VilaVix (ID `426258463900482`) para o formulário `2037322303564878`, consulta os dados do lead na Graph API da Meta e o insere no CRM. Ele associa a campanha `meta-act_862381142187343-120247776821100289` e o Wellington como responsável. A notificação ao corretor continua sendo feita pelo gatilho existente do banco via Z-API. Outros formulários e páginas são ignorados. O `external_id` original da Meta impede duplicidade em reentregas.

## Estado verificado em 14/10/2026

O aplicativo **VilaVix CRM**, ID `1852641782540598`, foi criado no portfólio `426604367199225` e publicado na Meta. O callback de produção foi verificado, o campo `Page.leadgen` v26.0 foi assinado no app e a inscrição da Página foi confirmada por `GET /426258463900482/subscribed_apps`. Os três segredos `META_*` estão configurados como sensíveis no ambiente de produção da Vercel. A política e as instruções de exclusão estão em `https://vilavix.com/privacidade`.

Um cadastro sintético criado pela API oficial `test_leads` às 19:05:27 UTC apareceu no CRM às 19:05:32 UTC, sem encaminhamento manual do evento. O responsável foi o Wellington e `wa_notify_log` registrou `enviado_corretor=true`, sem erro. Esse registro comprova o envio pela integração; não comprova sozinho recebimento ou leitura no aparelho. O telefone registrado no aviso corresponde ao perfil ativo do Wellington.

Os 49 cadastros reais disponíveis no formulário foram comparados por `external_id` com o CRM. Os seis ausentes de 13 e 14/10 foram recuperados pelo mesmo endpoint assinado de produção; todos ficaram com o Wellington e tiveram aviso ao corretor registrado sem erro. A recuperação não transferiu contatos que já tinham responsável.

O endpoint define explicitamente o Wellington, conforme a orientação atual para os EUA, sem depender da validade da sincronização de campanhas da Zernio. Por isso, o banco registra essas entradas como atribuições explícitas. Uma futura mudança do responsável desta entrada exige atualizar o endpoint, além de revisar a regra no CRM.

## Configuração de produção

1. Usar o aplicativo e a Página verificados acima. As permissões do token são `leads_retrieval`, `pages_manage_metadata`, `pages_manage_ads`, `pages_read_engagement` e `pages_show_list`, além de `public_profile` automático. O acesso à leitura dos cadastros reais do formulário foi confirmado pela Graph API. O token de Página derivado de um token de usuário de longa duração retornou `expires_at=0`; revogação de permissões ou mudanças na conta ainda podem interromper o acesso.
2. Configurar no projeto Vercel `vilavixsite`, ambiente **production**, os segredos de servidor `META_WEBHOOK_VERIFY_TOKEN`, `META_APP_SECRET` e `META_PAGE_ACCESS_TOKEN`. `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já são usados pelo servidor; conferir sua presença sem expor os valores. Nenhum segredo deve ter prefixo `VITE_`.
3. Publicar o endpoint. Na configuração do produto Webhooks da Meta, selecionar objeto **Page**, callback `https://vilavix.com/api/meta-leads`, informar o mesmo token de verificação e assinar o campo `leadgen`. A Página também precisa estar inscrita no aplicativo; a assinatura do campo no aplicativo, isoladamente, não entrega os eventos.
4. Conferir a resposta 200 do desafio de verificação e a assinatura da Página. Usar a ferramenta oficial de teste de Lead Ads para criar um lead de teste no formulário correto. Conferir a entrada única no CRM, `corretor_id` do Wellington e o registro de notificação em `wa_notify_log`; confirmar o recebimento da mensagem no aparelho antes de considerar o fluxo operacional.
5. Monitorar expiração/revogação do token de Página e respostas 5xx. Uma falha temporária devolve 503 para a Meta tentar novamente; reentregas não recriam o lead.

O webhook só aceita mensagens assinadas com `X-Hub-Signature-256`, compara a assinatura sobre o corpo original e não registra dados pessoais no log. O campo de formulário e o ID da Página são conferidos novamente nos dados buscados da Graph API. Um envio sem configuração retorna 503.
