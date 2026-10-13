# Entrada direta da campanha Coqueiral EUA

O endpoint `/api/meta-leads` recebe o evento `leadgen` da Página VilaVix (ID `426258463900482`) para o formulário `2037322303564878`, consulta os dados do lead na Graph API da Meta e o insere no CRM. Ele associa a campanha `meta-act_862381142187343-120247776821100289` e o Wellington como responsável. A notificação ao corretor continua sendo feita pelo gatilho existente do banco via Z-API. Outros formulários e páginas são ignorados. O `external_id` original da Meta impede duplicidade em reentregas.

Esta integração ainda depende de ativação na Meta. O código e os testes locais, por si só, não provam recebimento em produção. Não desligue outra entrada antes de confirmar um lead de teste até a notificação ao Wellington.

## Configuração de produção

1. Concluir a confirmação de identidade da conta responsável no Meta for Developers e criar um aplicativo controlado pela VilaVix. Associar a Página e obter acesso a leads do formulário, incluindo `leads_retrieval` e as permissões de Página exigidas pela Meta. Confirmar também o acesso do aplicativo à Página em Lead Access Manager.
2. Configurar no projeto Vercel `vilavixsite`, ambiente **production**, os segredos de servidor `META_WEBHOOK_VERIFY_TOKEN`, `META_APP_SECRET` e `META_PAGE_ACCESS_TOKEN`. `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já são usados pelo servidor; conferir sua presença sem expor os valores. Nenhum segredo deve ter prefixo `VITE_`.
3. Publicar o endpoint. Na configuração do produto Webhooks da Meta, selecionar objeto **Page**, callback `https://vilavix.com/api/meta-leads`, informar o mesmo token de verificação e assinar o campo `leadgen`. A Página também precisa estar inscrita no aplicativo; a assinatura do campo no aplicativo, isoladamente, não entrega os eventos.
4. Conferir a resposta 200 do desafio de verificação e a assinatura da Página. Usar a ferramenta oficial de teste de Lead Ads para criar um lead de teste no formulário correto. Conferir a entrada única no CRM, `corretor_id` do Wellington e o registro de notificação em `wa_notify_log`; confirmar o recebimento da mensagem no aparelho antes de considerar o fluxo operacional.
5. Monitorar expiração/revogação do token de Página e respostas 5xx. Uma falha temporária devolve 503 para a Meta tentar novamente; reentregas não recriam o lead.

O webhook só aceita mensagens assinadas com `X-Hub-Signature-256`, compara a assinatura sobre o corpo original e não registra dados pessoais no log. O campo de formulário e o ID da Página são conferidos novamente nos dados buscados da Graph API. Um envio sem configuração retorna 503.
