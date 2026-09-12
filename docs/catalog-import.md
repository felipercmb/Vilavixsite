# Importação do catálogo VilaVix

Catálogo importado em 12 de setembro de 2026 de **https://vilaviximoveis.com.br**. O arquivo `data/catalog.json` contém um array com **599 imóveis públicos**, extraídos das páginas individuais do site, incluindo **598 para venda e 1 para aluguel**.

## Cobertura conferida

- Foram lidos o índice de sitemaps e seus dez sitemaps públicos.
- O sitemap de imóveis contém 601 URLs. Todas foram verificadas: 599 apresentam imóvel, e duas retornam imóvel não encontrado.
- A API pública que alimenta a busca do site (`/api/gql`) foi consultada em 50 páginas de 12 registros. Ela informa 599 imóveis, e seus 599 IDs coincidem exatamente com os 599 IDs importados. Não há imóveis ausentes nem extras.
- As ofertas dos três carrosséis da página inicial já estavam nesse conjunto.
- O contador geral da página inicial informa 610; a soma por cidade e a API informam 599. Foi usada a cobertura comprovada pelos registros individuais e pela API.
- Não houve falhas técnicas na leitura das páginas de imóveis.

| Cidade | Imóveis |
| --- | ---: |
| Vila Velha | 354 |
| Vitória | 149 |
| Serra | 78 |
| Guarapari | 16 |
| Ibiraçu | 1 |
| Domingos Martins | 1 |
| **Total** | **599** |

As URLs removidas na origem são os IDs legados `2895610` (OR71990:111754, Ilha de Okinawa) e `3096303` (OR74412:115563, Top Living — Residencial). Elas estão detalhadas em `data/import-report.json` e não foram publicadas como imóveis disponíveis.

## Dados e critérios

Cada registro preserva código de referência, ID original, título, tipo, finalidade, cidade, bairro, preços publicados, áreas, quartos, suítes, banheiros, vagas, descrição, características, fotos, empreendimento, categoria, URL da origem e horário de importação.

- IDs estáveis usam `legacy-<codigo>`. Códigos Orulo contêm dois-pontos, por exemplo `legacy-OR60471:92429`; devem ser tratados como strings e codificados nos links quando necessário.
- Quando a origem não fornece título, ele é composto com o nome real do empreendimento, tipo e bairro. Nenhum empreendimento ou atributo é inventado.
- Sete imóveis têm preço promocional publicado. `preco` contém o valor anunciado como **Por**, e `precoOriginal` preserva o valor anterior.
- Dois imóveis não publicam preço; `preco` permanece `null`. Dois não publicam área válida; `area` permanece `null`.
- Taxas, endereço ou preço configurados como não exibidos na origem não são republicados, mesmo quando aparecem nos dados técnicos da página.
- A área principal usa privativa, útil, construída ou total, nessa ordem. Terrenos e áreas de terra usam terreno/total primeiro. `areaFonte`, `areaPrivativa`, `areaTotal`, `areaTerreno` e `areaUnidade` preservam o contexto.
- A UF é preenchida apenas quando há relação entre o ID da cidade e o estado no próprio site. Dados ausentes continuam ausentes; o endereço da imobiliária não é aplicado aos imóveis.
- Foram preservadas **15.091 referências de fotos**, correspondentes a **6.111 URLs distintas**. Fotos comuns ao empreendimento podem aparecer em várias unidades. Galerias do empreendimento são incluídas quando a origem sinaliza `usa_fotos_empreendimento`.
- Todos os 599 imóveis têm fotos e descrição. Não foram usadas fotos de banco de imagens.
- Disponibilidade significa presença no catálogo público no horário da coleta; a confirmação comercial continua sendo feita pela imobiliária.

## Contatos verificados

Origem: dados públicos da página inicial e seu JSON-LD.

- Empresa: VILA VIX IMOVEIS LTDA.
- Telefone e WhatsApp: **+55 27 98136-0170**; link `https://wa.me/5527981360170`.
- E-mail: **atendimento@vilaviximoveis.com.br**.
- Endereço: **Rua Jair de Andrade, 1222, Itapuã, Vila Velha — ES**.
- CEP publicado: `29053-305`. Preservado no relatório como dado da origem, sem correção presumida.
- CRECI: não informado no site antigo; permanece `null`.
- Logo: `https://fotos2.fra1.cdn.digitaloceanspaces.com/sites/2169/logo.png`.

## Repetir a coleta

O script usa Python 3.10 ou superior e o cliente HTTP `curl`, ambos sem bibliotecas adicionais:

```sh
python3 scripts/import-catalog.py --refresh
```

A opção `--refresh` lê novamente a origem. Sem ela, o script reutiliza o cache local em `/tmp/vilavix-catalog-import`. O cache contém somente respostas de páginas públicas e consultas públicas, e não deve ser versionado junto ao site.

O catálogo é substituído atomicamente apenas quando a coleta termina sem falhas e o conjunto de IDs coincide com a API pública. O relatório sempre registra o resultado. `--incremental` permite explicitamente publicar resultados parciais durante uma primeira carga; não é recomendado para atualizar um catálogo em produção. `--workers` e `--delay` controlam o ritmo de leitura (padrão: 3 solicitações paralelas e intervalo de 0,2 s por resposta).

Nenhuma autenticação, rotação de proxy, falsificação de identidade de navegador ou contorno de bloqueio foi usado. A rota pública da API foi identificada no JavaScript entregue pelo próprio site, e somente consultas de leitura foram executadas. O `robots.txt` permite as páginas usadas; não foram consultadas as rotas internas `__sites` nem o caminho bloqueado `/imoveis?`.

## Verificação desta entrega

Foram validados IDs e slugs únicos, correspondência entre o ID e a URL original, números não negativos, URLs HTTP válidas de imagens, ausência de fotos duplicadas dentro de uma galeria e a existência de foto e descrição em todos os registros. Uma amostra de imagens de cada host foi verificada por HTTP; os resultados estão em `data/import-report.json`, juntamente com a cobertura, os contatos e as URLs removidas.
