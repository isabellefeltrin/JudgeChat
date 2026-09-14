---
name: bdd-teste-agente-ia
description: Gera cenários de teste BDD em Gherkin (português) a partir de um PRD, spec ou documento de requisitos, no padrão de título "CT00X - TÍTULO DO CASO DE TESTE", pensados para um agente de IA testar outro agente de IA de atendimento conversacional. Use sempre que o usuário pedir casos de teste, cenários de teste, BDD, Gherkin, roteiro de teste, plano de teste ou massa de teste a partir de um documento (Notion, Confluence, Azure DevOps, Jira, PRD em PDF/docx/md), e especialmente quando o alvo do teste for um agente, bot, chatbot ou assistente de atendimento. Use também para extrair somente os blocos Gherkin de um documento de testes já existente, ou para revisar, ampliar ou reformatar cenários já escritos. Serve igualmente para pedidos em inglês como "write BDD test scenarios from this PRD" ou "generate Gherkin test cases for our AI agent".
---

# Cenários BDD para testar agentes de IA de atendimento

Este skill produz cenários de teste em Gherkin que serão **executados por um agente de IA** conversando com **outro agente de IA** (o agente de atendimento sob teste). Quem executa não é uma pessoa: é um agente que só tem a conversa como instrumento. Isso muda tudo na forma de escrever o `Então`, e é o ponto em que a maioria dos pacotes de teste falha.

## O contrato com o usuário

Duas entregas possíveis:

1. **Gherkin puro** (padrão) — arquivo `.md` com título + bloco Gherkin de cada cenário, nada mais. É o insumo que vai direto para o agente executor.
2. **Documento completo** — só quando o usuário pedir. Adiciona glossário, massa de dados, matriz de regras, verificabilidade, pendências e handoff.

Entregue sempre o Gherkin puro primeiro e ofereça o completo em uma linha. O motivo: metadado demais no arquivo que alimenta o agente executor compete com as instruções de execução e polui o contexto dele.

## Princípio que não se negocia: fidelidade ao documento

Cada cenário precisa ter origem rastreável em uma frase do documento. Não invente regra, campo, texto padrão, etapa de funil, nome de plano, canal ou comportamento que o documento não descreve. Isso não é preciosismo: um cenário inventado faz o agente executor reprovar comportamento correto, e um falso positivo de teste custa mais caro que um teste faltando — ele manda o time consertar o que não está quebrado.

Quando o documento é ambíguo ou silencioso, existem só dois caminhos legítimos:

- **Sessão interativa:** pergunte antes de escrever, usando `AskUserQuestion`, com as leituras possíveis como opções.
- **Sessão não interativa** (agendada, headless, usuário ausente): escreva o cenário registrando as leituras possíveis como evidência a coletar, marque-o como pendência e diga explicitamente que o resultado esperado está em aberto. Nunca escolha uma leitura silenciosamente.

Se o documento vier de uma página web (Notion, Confluence), verifique blocos recolhidos antes de concluir a leitura — toggle fechado é onde costuma estar a regra que muda o cenário.

## Fluxo

**1. Leia o documento inteiro.** Todo ele, incluindo tabelas de propriedades, seções de "fora de escopo" e blocos recolhidos. "Fora de escopo" vale ouro: é o que você não deve escrever.

**2. Extraia as regras testáveis** e numere-as (R1, R2, R3…). Uma regra é uma afirmação do documento que pode ser violada. "O lead nasce quando o nome é identificado" é regra; "seguimos as boas práticas de mercado" não é.

**3. Levante as ambiguidades** e resolva conforme o princípio acima. Priorize as que mudam o resultado esperado de algum cenário — essas são as que valem uma pergunta.

**4. Defina a superfície de validação.** Pergunte ao usuário o que o agente executor consegue observar: só a conversa? banco/CRM? logs de execução e chamadas de ferramenta? Essa resposta determina o que pode ir no `Então`. Se não houver resposta, assuma **só a conversa** — é a hipótese mais restritiva e a mais comum — e diga que assumiu.

**5. Escreva os cenários** seguindo as regras abaixo e a cobertura obrigatória.

**6. Entregue** o `.md` de Gherkin puro. Formato exato em `references/formato-saida.md`.

## Como escrever cada cenário

**Título:** `### CT00X - TÍTULO EM MAIÚSCULAS`, numeração sequencial de CT001 em diante, sem furos. Agrupe por tema na ordem em que o documento apresenta as regras, para que a leitura do pacote acompanhe a leitura do PRD.

**Idioma do Gherkin:** português, com `# language: pt` no bloco de `Funcionalidade`. Palavras-chave: `Funcionalidade`, `Cenário`, `Esquema do Cenário`, `Exemplos`, `Dado`, `Quando`, `Então`, `E`, `Mas`.

**Um cenário, uma regra.** Se o `Então` tem duas asserções que podem falhar por motivos independentes, provavelmente são dois cenários — exceto quando o valor do teste está justamente no acoplamento (por exemplo: cria o registro A **e** não cria o registro B).

**O `Então` só afirma o que o executor consegue observar.** Esta é a regra que mais é violada. Um `Então o lead deve ser criado no CRM` é inútil para um agente que só tem a conversa: ele não tem como aprovar nem reprovar, e vai inventar um veredito. Antes de escrever cada `Então`, pergunte: "o executor vê isso?" Se não vê, converta em indício conversacional ou mova para conferência externa. As heurísticas de conversão estão em `references/heuristicas-agente-conversacional.md` — leia esse arquivo antes de escrever cenários cujo efeito esperado é uma escrita em banco, um registro em CRM ou uma chamada de ferramenta.

**Não instrua o executor a induzir o comportamento.** O `Quando` contém apenas o que um cliente real diria. Um `Quando eu peço para o Agente criar a oportunidade` testa obediência, não o produto.

**Estado prévio é declarado, não construído.** Se o cenário precisa de um cadastro pré-existente, o `Dado` diz que o executor está usando um dado *declarado* como tal (`M3`), não que ele o criou. O executor não prepara massa.

## Cobertura obrigatória

Um pacote que só tem caminhos felizes não encontra nada. Cubra, para cada regra relevante:

- **Caminho positivo** — a regra funcionando.
- **Não-disparo / negativo** — o gatilho que **não** deve acontecer. Em regra semântica avaliada por LLM, o falso positivo é o defeito mais provável e mais caro; escreva mais cenários de não-disparo do que de disparo.
- **Guard-rails** — as proteções que o documento cita (duplicidade, registro já existente, ambiguidade de identificação).
- **Limites e ambiguidade** — a fronteira da régua. Interesse vago vs. intenção explícita, mensagem mista com duas intenções, resposta parcial.
- **Regressão** — o que o documento diz que **não** muda. Se o PRD afirma "sem alteração", há um cenário provando isso.
- **Falha oculta** — o caso em que o sistema parece funcionar. Ordem de eventos, dois gatilhos em sequência imediata (condição de corrida), estado que persiste entre sessões, etapa avançada de um fluxo que deveria contar igual à inicial, registro criado por outro ator que deveria ser ignorado.

Priorize por impacto do erro em produção cruzado com probabilidade de a falha passar despercebida — e diga qual critério usou, porque prioridade não vem do PRD e o usuário vai querer saber de onde saiu.

## Extrair Gherkin de um documento já existente

Quando o usuário já tem um documento de testes completo e quer só os blocos:

```bash
python3 scripts/extrair_gherkin.py <documento.md> -o <saida.md>
```

O script preserva títulos `### CT...` e blocos ```gherkin na ordem original, e descarta metadados. Use-o em vez de reescrever à mão: reescrever introduz divergência silenciosa entre as duas versões do mesmo cenário.

## Arquivos de apoio

- `references/formato-saida.md` — templates exatos das duas entregas. Leia antes de escrever o arquivo final.
- `references/heuristicas-agente-conversacional.md` — como converter efeito invisível em asserção observável, classificação de verificabilidade, escala de veredito, massa de dados e handoff. Leia quando o alvo do teste for um agente conversacional cujos efeitos vão para um sistema externo.
