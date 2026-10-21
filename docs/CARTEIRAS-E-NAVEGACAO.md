# Carteiras e navegação entre contatos

As abas **Leads novos**, **Prospecção** e **Todos** estão disponíveis em Contatos e no Funil completo. A seleção acompanha a troca entre as duas telas. Cada aba mantém o acesso e os filtros de responsável existentes; a classificação não altera corretor, campanha, etapa nem a roleta.

Prospecção identifica a importação histórica distribuída em setembro, pelo registro de procedência `Importado da planilha de leads da VilaVix.` no início das observações. A conferência de 21/10/2026 encontrou 583 registros dessa importação ainda existentes e 2.467 demais entradas. A regra não usa idade, nome da campanha ou etapa: um lead de campanha continua em Leads novos ao avançar no atendimento, e um contato de prospecção continua na mesma carteira após atendimento ou fechamento. Preservar o registro de procedência nas observações; futuras importações para prospecção devem manter esse marcador. A implementação não faz migração nem gravação em massa no banco.

Meu dia mostra novas entradas aguardando atendimento sem somar a base de prospecção, que tem um atalho próprio com o total de atendimentos em aberto. A exportação da lista inclui a coluna Carteira e respeita a aba e os filtros selecionados.

Ao abrir uma ficha, Anterior e Próximo percorrem toda a lista filtrada, incluindo as páginas seguintes. A fila é capturada no momento da abertura, para novas entradas ou mudanças de etapa não deslocarem a posição do corretor. Registros removidos deixam de participar da navegação. Ao abrir um contato por um atalho externo aos filtros da lista, a fila usa os contatos autorizados da mesma carteira.

As setas ficam no cabeçalho fixo da ficha, mostram posição e total e são desativadas nos limites e durante uma gravação. Uma anotação não salva ou um retorno ainda não confirmado exige uma escolha explícita antes de avançar. A confirmação de descarte não apaga atendimentos já salvos.

Validação: 92 testes automatizados passaram em uma cópia local dos mesmos fontes, incluindo filtros por carteira/responsável, etapas encerradas, limites e paginação da navegação, exclusões e alterações de etapa. A interface foi exercitada com dados fictícios, incluindo passagem do 15º para o 16º contato e aviso de rascunho, sem inserir registros de teste em produção.
