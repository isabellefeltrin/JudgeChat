# Formato exato das entregas

## Entrega 1 (padrão): Gherkin puro

Nome do arquivo: `CT_Gherkin_<Assunto>.md`.

Estrutura, sem nada além disto:

````markdown
# Cenários de Teste em Gherkin — <TÍTULO DO DOCUMENTO DE ORIGEM>

> Extração somente dos cenários em Gherkin (<N> cenários, CT001 a CT0<N>). Contexto, massa de dados, verificabilidade e handoff estão no documento completo.

```gherkin
# language: pt
Funcionalidade: <primeiro tema>
  Como <papel>
  Quero <objetivo>
  Para <benefício>
```

### CT001 - TÍTULO EM MAIÚSCULAS

```gherkin
Cenário: <frase curta em minúsculas, descritiva>
  Dado que <pré-condição>
  Quando <ação do executor>
  Então <asserção observável>
  E <asserção observável>
```

### CT002 - TÍTULO EM MAIÚSCULAS

```gherkin
Cenário: ...
```
````

Regras de forma:

- Uma linha em branco entre o título e o bloco, e entre blocos.
- Um bloco `Funcionalidade` por tema, imediatamente antes do primeiro CT daquele tema. Sem `Funcionalidade` repetida.
- Sem prioridade, sem tipo, sem massa, sem regra de origem, sem handoff. Esses campos vivem no documento completo.
- `Esquema do Cenário` + `Exemplos` quando a mesma asserção vale para várias entradas. Isso reduz repetição e deixa explícito que a variação é de dado, não de comportamento.
- Tabelas dentro do Gherkin apenas como `Exemplos` de `Esquema do Cenário`, ou como tabela de dados de um passo. Não use tabela para descrever leituras alternativas de resultado esperado quando puder usar um passo em linguagem natural.

## Entrega 2 (a pedido): documento completo

Nome do arquivo: `CT_<Assunto>.md`. Ordem das seções:

1. **Cabeçalho** — versão, fonte única de verdade (link/identificação do documento de origem), regra de elaboração (fidelidade ao documento).
2. **Objetivo do pacote** — o que as mudanças do documento entregam e onde está o risco.
3. **Restrição de execução** — o que o agente executor observa e o que não observa, com as consequências práticas. Se houver indício autorizado pelo próprio documento de origem, cite a frase.
4. **Instruções para o agente executor** — papel, uma conversa por cenário, proibição de induzir, o que conta como evidência, escala de veredito.
5. **Pré-condições e massa de dados** — tabela de ambiente com `<preencher>` para o que o documento não define, e tabela `M1..Mn` de estado prévio a ser preparado por quem tem acesso, com a coluna de quais CTs dependem de cada massa.
6. **Glossário e textos padrão** — termos do documento e strings a conferir literalmente.
7. **Matriz de regras → cenários** — `R1..Rn` com a frase-regra e os CTs que a cobrem. É o que prova cobertura e ausência de invenção.
8. **Cenários** — mesmo conteúdo Gherkin da entrega 1, cada um com: regra, prioridade, tipo, verificabilidade, massa, risco coberto, o bloco Gherkin e o bloco de conferência externa.
9. **Pendências** — `P1..Pn`, cada uma com a dúvida, o impacto e os CTs afetados.
10. **Cobertura e alcance** — contagem por grupo e por verificabilidade, com leitura honesta do que o pacote não valida.
11. **Modelo de relatório do executor** — o formato em que ele deve devolver o resultado.
12. **Fora de escopo** — copiado do documento de origem.

Gere as duas entregas a partir da mesma fonte na mesma execução, para que não divirjam. Use o script de extração para produzir a entrega 1 a partir da 2.
