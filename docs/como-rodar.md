# Como rodar a JudgeChat — todas as formas

Referência rápida de tudo que dá pra disparar neste projeto. Pra uma visão geral do que cada arquivo faz, veja o [README](../README.md).

---

## 0. Pré-requisitos (valem pra tudo abaixo)

- `npm install` (uma vez).
- Um provedor de IA configurado (`AI_PROVIDER` no `.env` — padrão `claude`; ver seção "Provedor de IA" no README para as opções `claude`/`copilot`/`codex` e o que cada uma exige). Com o padrão `claude`, precisa do CLI do Claude Code instalado e autenticado no terminal — teste com `claude -p "oi"`.
- `.env` na raiz do projeto (copie de `.env.example` se existir). Variáveis usadas:
  - `TARGET_NUMBER` — número de WhatsApp alvo padrão (opcional; se não tiver, o programa pergunta toda vez).
- **Primeira execução**: aparece um QR Code no terminal pra parear com o WhatsApp. A sessão fica salva em `.wwebjs_auth/` — nas próximas vezes conecta direto, sem pedir QR de novo (a menos que a sessão expire ou seja invalidada).

---

## 1. `node cli.js` — uma conversa por vez (modo interativo)

```
node cli.js
```

Abre um menu com 3 opções:

### 1) Nova conversa personalizada

Pergunta, em ordem (Enter mantém o valor da última execução, salvo em `persona.json`):

1. Nome do cliente simulado
2. Personalidade/contexto (aceita colar texto com várias linhas — digite `FIM` sozinho numa linha pra terminar)
3. Mensagem de abertura
4. Número de WhatsApp alvo
5. Se aplica avaliação automática (s/n)
   - se sim: escolhe qual arquivo de `criteria/*.md` usar pra julgar a conversa

Depois conecta no WhatsApp, manda a abertura, e a conversa roda sozinha (IA gerando as falas do cliente) até terminar naturalmente, bater 60 turnos, ou você encerrar na mão.

**Durante a conversa**, duas formas de interação manual:

- Aperte **`q`** ou **Ctrl+C** — encerra a conversa ali, avalia (se configurado) e gera o relatório com o que rolou até então.
- Escreva um texto em **`logs/response.txt`** e salve — o programa lê esse arquivo a cada segundo e manda o conteúdo como se fosse a próxima mensagem do cliente (e limpa o arquivo depois), permitindo assumir a conversa manualmente no meio de um teste.

### 2) Reproduzir exatamente uma conversa anterior

Pede o nome exato de uma persona já usada antes (ex.: `abgail`, `renata`) e o número alvo. Reenvia, mensagem por mensagem e na mesma ordem, exatamente o que aquele "cliente" mandou da última vez (lido de `logs/conversation.log`) — sem gerar nada novo por IA, até o roteiro acabar (a partir daí volta a gerar por IA normalmente, se sobrar conversa).

### 3) Ver conversas anteriores

Lista os relatórios HTML já gerados em `reports/`, mais recente primeiro, e abre o escolhido direto no navegador.

---

## 2. `node batch-runner.js <pasta>` — bateria de testes em Gherkin/BDD

```
node batch-runner.js features/lead-novo-professor
node batch-runner.js features/cliente-existente-professor
```

Pra qualquer pasta que você criar com arquivos `.feature` seguindo o mesmo padrão (ver [features/](../features/) como exemplo e a seção "Bateria de testes em Gherkin" do [README](../README.md) pro formato exigido — cada `Scenario` precisa de uma tag `@criterio:<arquivo>.md`).

Fluxo, sem pular etapas:

1. **Massas de teste**: se algum cenário selecionado tem a tag `@massa:<id>` (ver seção "Massa de teste" do [README](../README.md)), lê o telefone real (e qualquer outro dado extra — dia, horário etc.) dela em `massas.json` — nunca pergunta no terminal. Se faltar telefone pra alguma massa usada, recusa a bateria com um erro listando exatamente o que adicionar ao arquivo.
2. **Preparação** (ainda sem WhatsApp): pra cada cenário da pasta, mostra um rascunho de personalidade gerado por IA — já usando os dados da massa, se houver — (aprova com Enter, edita com `e`, gera de novo com `r`) e o critério vinculado (se o `.md` já existe, pergunta se usa como está / edita / regenera; se não existe, gera um rascunho e exige revisão antes de salvar).
3. **Configuração da bateria** (uma vez, vale pra todos os cenários dela): número de WhatsApp alvo.
4. **Execução**:
   - Sequencial, um cenário por vez, no mesmo número, com 5 minutos de espera entre um e o próximo (a janela real até a sessão do agente fechar). Erro técnico (WhatsApp caiu etc.) tenta reconectar e pula a espera; se não reconectar, os cenários restantes ficam marcados como erro sem rodar.
5. **Relatório**: tabela ao vivo no terminal + HTML consolidado em `reports/bateria-<pasta>-<data>.html`, linkando pro relatório individual de cada cenário (ou a payload técnica, em `logs/batch/<bateria>/<cenário>.erro-tecnico.json`, se der erro técnico). Esse relatório também ganha, no topo, uma tira com as execuções anteriores desta bateria e, em cada linha da tabela, uma seta (▸) que abre o histórico de vereditos daquele cenário — ver seção "Histórico de baterias e comparação entre execuções" do [README](../README.md). O índice completo (com a comparação lado a lado entre duas execuções) fica em `reports/historico-<pasta>.html`.

**Durante a execução**: primeiro `Ctrl+C` aborta a bateria após o cenário atual (ou durante a espera entre cenários) e ainda gera o relatório consolidado com o que já rodou; segundo `Ctrl+C` força saída imediata sem gerar nada.

---

## 3. `node resetProjeto.js` — zerar tudo pra recomeçar de um novo PRD

```
node resetProjeto.js            # lista o que seria apagado e pede confirmação (s/n)
node resetProjeto.js --dry-run  # só lista, não apaga nada
node resetProjeto.js --yes      # apaga sem perguntar
```

Apaga `features/**`, `criteria/*.md` (exceto `default.md`, que é o critério manual reutilizável, não gerado a partir de um cenário), `logs/batch/**`, `logs/conversation.log`, `logs/response.txt`, `logs/bot.log`, `persona.json` (raiz) e `reports/*.html`. Não toca em `.env`, `.wwebjs_auth/`, `docs/`, `massas.json` (amarrado ao ambiente/tenant testado, não ao PRD) nem nos scripts do projeto.

`reports/`, `features/`, `logs/` e `criteria/*.md` não são versionados no git (estão no `.gitignore`) — exceto o critério manual reutilizável (`default.md`), que continua commitado. Apagar qualquer um desses **não é reversível** via git, nem mesmo `logs/batch/**` (deixou de ser commitado — ver `.gitignore`).

---

## 4. Onde cada coisa fica

| Caminho                                       | O que é                                                                                       |
| --------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `persona.json`                                | última configuração usada no modo interativo (`cli.js`)                                       |
| `logs/conversation.log`                       | histórico bruto de todas as conversas do modo interativo                                      |
| `logs/response.txt`                           | onde escrever pra injetar uma mensagem manual durante uma conversa do `cli.js`                |
| `logs/batch/<bateria>/<cenário>.log`          | histórico bruto de um cenário rodado via `batch-runner.js`                                    |
| `logs/batch/<bateria>/<cenário>.persona.json` | personalidade/critério aprovados pra aquele cenário (auditoria)                               |
| `logs/batch/<bateria>/runs.json`              | histórico de EXECUÇÕES inteiras da bateria (contagens + veredito por cenário), só pra exibição — nunca decide reaproveitamento (ver README) |
| `reports/<slug>-<data>.html`                  | relatório de uma conversa (individual, dos dois modos)                                        |
| `reports/bateria-<pasta>-<data>.html`         | relatório consolidado de uma bateria                                                          |
| `reports/historico-<pasta>.html`              | índice de todas as execuções já rodadas dessa bateria, com comparação lado a lado entre duas  |
| `criteria/*.md`                               | critérios de avaliação (usados por nome no `persona.json` ou via tag `@criterio:` no Gherkin) |
| `features/<bateria>/*.feature`                | cenários Gherkin de uma bateria                                                               |
| `massas.json`                                 | mapeamento massa de teste (`@massa:<id>`) → telefone real preparado manualmente no sistema testado (fora do git) |
| `.wwebjs_auth/`                               | sessão do WhatsApp Web salva (não precisa escanear QR toda vez)                               |

---

## 5. Coisas que existem mas ainda **não** fazem nada de verdade

- **Múltiplas instâncias/números em paralelo via WhatsApp real** — não implementado; nesse modo tudo roda sequencial, um número por vez.
