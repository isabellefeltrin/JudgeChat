# JudgeChat

Ferramenta de teste de agentes de IA de atendimento via WhatsApp: a JudgeChat simula um cliente conversando pelo WhatsApp com o número real do chatbot/agente que você quiser testar, registra a conversa e (opcionalmente) usa uma IA como juiz pra avaliar se o atendimento seguiu um critério esperado.

Duas formas de rodar:

- **`cli.js`** — uma conversa por vez, definida interativamente (ou reproduzindo uma conversa anterior).
- **`batch-runner.js`** — uma bateria inteira de casos de teste em Gherkin/BDD, cada um rodando como sua própria sessão de WhatsApp, em sequência.

## Instalação

```
npm install
```

Configure o `.env` (veja a seção "Provedor de IA" abaixo).

## Provedor de IA (`AI_PROVIDER`)

A JudgeChat usa uma IA pra gerar a fala do cliente simulado, os rascunhos de persona/critério e o veredito do juiz (`agent.js`). Qual IA responde é escolhido por uma única variável no `.env`:

```
AI_PROVIDER=claude   # claude (padrão) | copilot | gemini | codex
```

Os papéis fixos (juiz, cliente simulado, rascunhador, revisor) continuam definidos uma única vez em `.claude/agents/*.md`, não importa o provedor — o que muda é só como esse texto chega até a IA:

| Provedor | Como funciona | Variáveis necessárias |
|---|---|---|
| `claude` | CLI do Claude Code (`claude -p --agent <papel>`) já instalado/logado na máquina — usa suporte nativo a subagentes. | nenhuma (só o CLI instalado) |
| `copilot` | CLI agentic do GitHub Copilot (`copilot`) já instalado/logado — sem subagente nativo, o `.md` do papel é colado no prompt. | nenhuma (só o CLI instalado) |
| `gemini` | API HTTP do Gemini (Google AI Studio), chamada direto — não precisa de CLI instalado. | `GEMINI_API_KEY` (e opcionalmente `GEMINI_MODEL`, padrão `gemini-2.5-flash`) |
| `codex` | API HTTP da OpenAI (Chat Completions), chamada direto — não precisa de CLI instalado. | `OPENAI_API_KEY` (e opcionalmente `OPENAI_MODEL`, padrão `gpt-4.1`) |

`claude` e `copilot` dependem do respectivo CLI estar instalado e autenticado na máquina; `gemini` e `codex` só precisam da chave de API no `.env`, sem instalar nada extra.

**Sobre o `copilot`:** ao contrário do Claude Code, a CLI do Copilot ainda não tem um jeito nativo e estável de definir o papel/subagente, então as flags usadas (`providers/copilot.js`) são um melhor esforço com base na versão disponível quando isto foi escrito — confira `copilot --help` na sua instalação e, se precisar, ajuste via `COPILOT_CLI_ARGS` (string com as flags separadas por espaço) ou `COPILOT_CLI_COMMAND` no `.env`, sem tocar em código.

## Modo interativo (`cli.js`)

```
node cli.js
```

O menu permite: definir uma persona (nome, personalidade, mensagem de abertura, número alvo), reproduzir exatamente uma conversa anterior, ou navegar pelos relatórios HTML já gerados em `reports/`. Se a avaliação automática for ativada, o resultado é um veredito **PASSOU** ou **FALHOU** com o motivo — não uma nota numérica.

`Ctrl+C` (ou `q`) encerra a conversa a qualquer momento e ainda gera o relatório com o que já foi conversado até ali.

## Bateria de testes em Gherkin (`batch-runner.js`)

Pensado pro fluxo: um PM escreve um PRD → você gera casos de teste em Gherkin/BDD a partir dele → a JudgeChat roda cada `Scenario` como sua própria sessão de WhatsApp, sequencialmente, e devolve um veredito por cenário.

```
node batch-runner.js <pasta-com-arquivos-.feature>
```

### Estrutura esperada

- Uma **pasta = uma bateria**. Ela pode conter um ou vários arquivos `.feature`; cada `.feature` pode ter vários `Scenario`s.
- Cada `Scenario` precisa de uma tag `@criterio:<arquivo>.md` apontando pro arquivo de critério (em `criteria/`) que o juiz vai usar pra avaliar aquele cenário especificamente. Sem essa tag, o runner recusa a bateria inteira listando quais cenários estão sem critério.

```gherkin
Funcionalidade: Alteração de cliente ignorando campos obrigatórios não essenciais à venda

  @criterio:ct001-alterar-cliente-sem-professor.md
  Cenário: CT001 - Alterar cliente sem informar o campo Professor deve ser concluída com sucesso
    Dado que existe um cliente cadastrado no sistema
    Quando o Agente realiza a alteração do cliente sem informar o campo "Professor"
    Então a alteração do cliente deve ser concluída com sucesso
```

Exemplos reais: [features/cliente-existente-professor/](features/cliente-existente-professor/) e [features/lead-novo-professor/](features/lead-novo-professor/).

### Massa de teste (`@massa:<id>`)

Quando um cenário só passa com um cliente/cadastro específico já preparado manualmente no sistema por trás do agente testado (ex.: "M1 — cliente sem contrato ativo, sem compra prévia"), marque-o com `@massa:M1` (junto do `@criterio:`, na mesma linha ou em linhas separadas). Isso é **opcional** — só use em cenários que realmente dependem de uma massa; sem a tag, o cenário roda com o telefone padrão de sempre.

```gherkin
  @criterio:agendamento-servico-ct001-agendamento-automatico-grade-elegivel.md
  @massa:M1
  Cenário: CT001 - Serviço com grade elegível é agendado automaticamente dentro da própria conversa
    Dado que estou usando a massa de teste M1 e acabei de comprar o serviço "Avaliação física" nesta conversa
    ...
```

A JudgeChat **não prepara o estado da massa** — isso continua manual, feito por quem tem acesso ao sistema por trás do agente testado (ver limitação abaixo). O que a tag resolve é só o "cansaço" de amarrar cada massa a um telefone real toda vez: o mapeamento fica em `massas.json`, na raiz do projeto e fora do git (são telefones de clientes reais de um ambiente específico), no formato:

```json
{
  "M1": { "phone": "5548999990001", "description": "Cliente sem contrato ativo, sem compra prévia" }
}
```

O runner **só lê esse arquivo — nunca pergunta o telefone no terminal**. Se uma bateria usa `@massa:M1` e o arquivo não tem (ou ainda não existe), ela é recusada com um erro listando exatamente as massas faltantes e o trecho JSON pra adicionar.

- **Modo Debug API**: cada cenário com `@massa:<id>` roda no telefone real daquela massa em vez do telefone fictício de sempre; sem a tag, nada muda.
- **Modo WhatsApp real**: como a bateria inteira usa 1 único número, todos os cenários selecionados precisam pedir a **mesma** massa (ou nenhuma) — se a seleção misturar massas diferentes, o runner recusa a bateria e pede pra rodar cada massa separadamente.
- **Pendência de confirmação**: o modo Debug API reseta a sessão de debug daquele telefone antes e depois de cada conversa (`DELETE /api/debug/chat/{phone}`, ver `debugSession.js`) — não confirmamos ainda se isso afeta só o estado de conversa do agente ou também o cadastro/contrato por trás do telefone no sistema testado. Enquanto isso não for confirmado, rodar um cenário `@massa:` pelo modo WhatsApp real é a opção mais segura.

#### Dado extra por massa (dia, modalidade, o que precisar)

Além de `phone` e `description`, qualquer outro campo colocado direto na entrada da massa entra automaticamente como contexto na geração de personalidade/critério daquele cenário (via IA — `JudgeChat-rascunhador-persona`/`JudgeChat-rascunhador-criterio`, e os revisores) — não precisa mexer em código pra um campo novo valer, nem aninhar embaixo de uma chave especial:

```json
{
  "M3": {
    "phone": "5548999990003",
    "description": "Grade com todos os horários lotados no dia pedido",
    "day": "quinta-feira, 04/09/2026",
    "diaComVagaLivre": "sexta-feira, 05/09/2026"
  }
}
```

Isso alimenta o rascunho de personalidade (pra o cliente simulado pedir o dia/modalidade certos) e o de critério — mas só no **momento em que o rascunho é gerado**. Se você mudar um valor depois que a persona/critério daquele cenário já foi aprovada (`.persona.json` em `logs/batch/<bateria>/`, ou o `.md` em `criteria/`), o valor novo só entra regenerando o rascunho (`r` no prompt de aprovação, ou apagando o arquivo aprovado) — não é lido de novo em toda execução.

### Subconjunto de Gherkin suportado

O parser (`gherkinParser.js`) é deliberadamente simples: só `Feature`/`Funcionalidade`, `Scenario`/`Cenário`, tags (`@algo`) e os steps `Given`/`Dado`, `When`/`Quando`, `Then`/`Então`, `And`/`E`, `But`/`Mas`. **Não suporta** `Background`/`Contexto`, `Scenario Outline`/`Esquema do Cenário`, `Examples`/`Exemplos`, tabelas de dados (`|...|`) nem doc strings (`"""`) — usar qualquer um desses gera um erro explícito em vez de ser interpretado errado.

### O que o critério do juiz pode (e não pode) verificar

O juiz só enxerga o **transcript da conversa de WhatsApp** — nunca o banco de dados ou o back-office por trás do agente. Escreva os critérios em termos do que é observável no chat (o agente confirmou algo? mencionou algum erro?). Se um caso de teste depende de checar algo que só existe no banco/backend (não aparece na conversa), a JudgeChat não consegue validar isso sozinha — precisa de uma inspeção manual complementar.

### Fluxo do runner

1. **Preparação** (sem WhatsApp ainda): pra cada cenário, a IA gera um rascunho de personalidade de cliente (a partir do Dado/Quando) e um rascunho de critério (a partir do Então, só se o arquivo `.md` ainda não existir) — você aprova ou edita os dois antes de continuar. Só depois de aprovar **todos** os cenários da bateria é que a fase seguinte começa.
2. **Configuração da bateria**: número de WhatsApp alvo (ou, no modo Debug API, um telefone por cenário) — perguntado uma vez, vale pra bateria inteira.
3. **Execução sequencial**: um cenário de cada vez, no mesmo número de WhatsApp. Entre um cenário bem-sucedido e o próximo, o runner espera **5 minutos** — a janela real até a sessão do agente fechar de fato. Falhas técnicas (WhatsApp caiu, etc.) tentam reconectar e pulam essa espera; se a reconexão falhar, os cenários restantes são marcados como erro técnico sem rodar.
4. **Relatório**: uma tabela ao vivo no terminal, mais um HTML consolidado em `reports/` (`bateria-<nome>-<data>.html`) linkando pro relatório individual de cada cenário.

`Ctrl+C` durante a execução aborta a bateria após o cenário atual (ou durante a espera entre cenários) e ainda gera o relatório consolidado com o que já rodou; um segundo `Ctrl+C` força saída imediata.

### Histórico de baterias e comparação entre execuções

Toda vez que uma bateria roda até o fim, `batch-runner.js` grava um retrato daquela execução (contagens + veredito de cada cenário) em `logs/batch/<bateria>/runs.json` (`batteryHistory.js`) — nunca sobrescreve, só acrescenta. Isso alimenta três coisas no relatório, sem precisar reabrir/comparar arquivo por arquivo na mão:

- **Tira de execuções** no topo do `bateria-<nome>-<data>.html` de sempre: um chip por execução anterior (data + passou/falhou/erro), a atual em destaque por último, e um link "ver histórico completo →".
- **Linha do tempo por cenário**: cada linha da tabela de sempre virou um `<details>` — clicando na seta (▸), abre a sequência de vereditos daquele cenário nas execuções anteriores, cada chip linkando pra conversa daquele dia. Ótimo pra notar de cara um cenário instável (alterna PASSOU/FALHOU) de um que está sempre quebrado.
- **Índice de baterias** (`reports/historico-<nome>.html`, gerado/regravado a cada execução): lista toda execução já rodada, mais recente primeiro. Marcando exatamente 2 (checkbox) e clicando em "comparar", monta na hora (JS no navegador, sem precisar de servidor) uma tabela lado a lado com o veredito de cada cenário nas duas execuções, destacando as linhas que mudaram.

`runs.json` é só pra exibição — nunca é lido pra decidir reaproveitamento entre execuções (isso continua sendo `results.json`, ver `batch-runner.js`). Ele não é versionado no git (está dentro de `logs/`, ver `.gitignore`) e é apagado por `resetProjeto.js` junto com o resto de `logs/batch/**`.

### Limitações conhecidas

- **Pré-condições de configuração do backend** (ex.: um campo obrigatório no sistema testado, ou uma massa de teste M1/M2/... com contrato/compra/cadastro específicos) são responsabilidade manual de quem roda a bateria — o runner não prepara esse estado, só ajuda a amarrar cada massa a um telefone real (`@massa:<id>` + `massas.json`, ver acima) e documenta o pré-requisito no cabeçalho do `.feature`/`criteria/*.md` quando relevante.

## Estrutura do projeto

| Arquivo | Papel |
|---|---|
| `cli.js` | menu interativo (uma conversa por vez) |
| `batch-runner.js` | runner de uma bateria de testes Gherkin |
| `session.js` | conectar ao WhatsApp + rodar uma conversa + avaliar/gerar relatório (usado pelos dois acima) |
| `terminalUi.js` | helpers de terminal (cores, prompts) |
| `agent.js` | ponto único de chamada à IA (`callAI`): escolhe o provedor via `AI_PROVIDER` e gera a fala do cliente simulado |
| `providers/*.js` | um adaptador por provedor de IA (`claude`, `copilot`, `gemini`, `codex`) — ver seção "Provedor de IA" acima |
| `judge.js` | avalia uma conversa contra um critério, devolve PASSOU/FALHOU + motivo |
| `gherkinParser.js` | parser leve de `.feature` |
| `batchDrafts.js` | prompts de rascunho de personalidade/critério a partir de um Gherkin Scenario |
| `massas.js` | mapeamento massa de teste (`@massa:<id>`) → telefone real, persistido em `massas.json` |
| `batteryHistory.js` | grava/lê `runs.json` — histórico de execuções inteiras de uma bateria (ver seção acima) |
| `report.js` | gera os relatórios HTML (individual, consolidado de bateria e o índice de histórico) |
| `resetProjeto.js` | zera features/critérios gerados/logs/reports/persona pra recomeçar de um novo PRD |
| `criteria/*.md` | critérios de avaliação, um por persona/cenário |
| `features/*/*.feature` | baterias de teste em Gherkin |

Veja também:
- [docs/como-rodar.md](docs/como-rodar.md) — referência de todas as formas de rodar o programa (menus, flags, onde cada arquivo fica).
- [docs/ideias-robustez.md](docs/ideias-robustez.md) — ideias de evolução ainda não implementadas.
