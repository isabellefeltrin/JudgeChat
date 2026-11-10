# JudgeChat

Ferramenta que **testa agentes de IA de atendimento via WhatsApp**. A JudgeChat simula um cliente conversando, pelo WhatsApp, com o número real do chatbot que você quer testar, registra a conversa e usa uma IA como **juiz** para dizer se o atendimento seguiu o critério esperado: **PASSOU** ou **FALHOU**, com o motivo.

Duas formas de usar:

- **`cli.js`**: uma conversa por vez, definida de forma interativa.
- **`batch-runner.js`**: uma bateria inteira de casos de teste escritos em Gherkin (BDD), cada um rodando como sua própria conversa.

---

## Início rápido (do zero ao primeiro resultado)

### 1. Pré-requisitos

| Item | Para quê |
|---|---|
| **Node.js 18 ou superior** (`node -v`) | rodar o projeto |
| **Google Chrome** instalado | o WhatsApp Web roda por trás (`whatsapp-web.js`) |
| **Um WhatsApp real para ser o "cliente"** | ele será o **remetente** das mensagens de teste. Use uma **linha de testes**, não o seu número pessoal |
| **Uma IA configurada** | gera as falas do cliente simulado e o veredito (ver passo 3) |
| **O número de WhatsApp do agente a testar** | o destino das mensagens |

### 2. Instalar

```
npm install
```

### 3. Configurar o `.env`

Copie o modelo e edite:

```
# Windows (PowerShell)
Copy-Item .env.example .env
# Mac/Linux
cp .env.example .env
```

Depois escolha a IA em `AI_PROVIDER` (veja a seção [Provedor de IA](#provedor-de-ia-ai_provider)). O jeito mais simples:

- **`claude` (padrão):** instale o [Claude Code](https://claude.com/claude-code) e faça login. Teste com `claude -p "oi"`; se responder, está pronto.

Opcional: preencha `TARGET_NUMBER` com o número do agente testado (DDI+DDD+número, só dígitos, ex.: `5511999999999`). Se deixar vazio, o programa pergunta.

> O `.env` guarda chaves. Ele já está no `.gitignore`; nunca o envie para o git nem o cole em chats.

### 4. Rodar o primeiro teste

Use a bateria de exemplo que já vem no projeto:

```
node batch-runner.js features/exemplo-minimo
```

O que vai acontecer, em ordem:

1. **Pareamento do WhatsApp (só na 1ª vez).** Aparece um **QR Code** no terminal. No celular da linha de testes: WhatsApp → **Aparelhos conectados** → **Conectar um aparelho** → escaneie. O QR expira em cerca de 1 minuto; se expirar, o programa mostra outro. A sessão fica salva em `.wwebjs_auth/`, e nas próximas vezes conecta direto.
2. **Preparação.** Para cada cenário, a IA mostra um rascunho de personalidade do cliente e o critério. Você aprova com **Enter**, edita com **`e`** ou gera de novo com **`r`**.
3. **Número alvo.** Confirme (Enter aceita o `TARGET_NUMBER` do `.env`).
4. **Execução.** Os cenários rodam um de cada vez. Entre um e outro há **5 minutos** de espera, para a sessão do agente fechar de verdade.
5. **Resultado.** Uma tabela no terminal e um relatório HTML em `reports/bateria-<nome>-<data>.html`. Abra no navegador.

`Ctrl+C` uma vez aborta depois do cenário atual e ainda gera o relatório do que já rodou. Duas vezes força a saída sem relatório.

### 5. Criar a sua própria bateria

1. Copie `features/exemplo-minimo/` para `features/minha-bateria/` e edite o `.feature`.
2. Para cada cenário, crie o critério em `criteria/` (o runner também gera um rascunho se o arquivo não existir). Use `criteria/exemplo-*.md` como molde.
3. Rode `node batch-runner.js features/minha-bateria`.

---

## Como funciona uma conversa

O cliente simulado (IA) conversa com o agente testado até **uma** destas situações, e a sessão então encerra:

| Motivo | Quando acontece |
|---|---|
| `natural` | o cliente simulado conclui que o objetivo foi atendido e responde `[FIM]` |
| `no_answer` | o cliente perguntou a mesma coisa mais de 3 vezes e o agente não respondeu como esperado (`[FIM:SEM_RESPOSTA]`) |
| `short_turn_loop` | 4 mensagens curtas seguidas (loop de despedida) |
| `max_turns` | limite de 60 turnos |
| manual | você aperta `q` ou `Ctrl+C` |

Depois, se houver critério, o **juiz** lê o transcript e dá PASSOU ou FALHOU. Quem decide que a resposta "não foi conforme o esperado" é a IA, não o código, então vale conferir as primeiras execuções.

---

## Provedor de IA (`AI_PROVIDER`)

A JudgeChat usa uma IA para gerar a fala do cliente simulado, os rascunhos de persona/critério e o veredito do juiz. Qual IA responde é escolhido por uma única variável no `.env`:

```
AI_PROVIDER=claude   # claude (padrão) | copilot | codex
```

| Provedor | Como funciona | Variáveis necessárias |
|---|---|---|
| `claude` | CLI do Claude Code (`claude -p --agent <papel>`) já instalado e logado | nenhuma |
| `copilot` | CLI do GitHub Copilot (`copilot`) já instalado e logado | nenhuma (ver nota abaixo) |
| `codex` | API HTTP da OpenAI (Chat Completions) | `OPENAI_API_KEY` (opcional: `OPENAI_MODEL`, padrão `gpt-4.1`) |

Os papéis fixos (juiz, cliente simulado, rascunhadores, revisores) ficam definidos uma única vez em `.claude/agents/judgechat-*.md`, qualquer que seja a IA. Só muda como esse texto chega até ela.

**Copilot:** a CLI ainda não tem um jeito estável de definir o papel; as flags em `providers/copilot.js` são melhor esforço. Se precisar, ajuste com `COPILOT_CLI_ARGS` ou `COPILOT_CLI_COMMAND` no `.env`.

### Conectar uma IA que não está na lista

1. Crie `providers/<nome>.js` exportando `generate({ systemPrompt, userPrompt })`, que devolve o texto. Use `providers/codex.js` como molde (serve para APIs compatíveis com a da OpenAI, como Ollama ou Groq: troque a URL e a chave).
2. Registre o provedor no mapa `PROVIDERS` de `agent.js`.
3. Defina `AI_PROVIDER=<nome>` no `.env`.

Modelos menores costumam errar os marcadores `[FIM]` / `[FIM:SEM_RESPOSTA]` (acrescentam aspas ou texto) e o formato do veredito. Se a conversa não encerra, comece por aí.

### Definir variáveis no PowerShell

`AI_PROVIDER=codex node ...` só funciona em bash. No PowerShell:

```powershell
$env:AI_PROVIDER = "codex"
$env:OPENAI_API_KEY = "sua-chave"
```

Vale só para a janela atual. Para deixar fixo, use o `.env`.

---

## Modo interativo (`cli.js`)

```
node cli.js
```

Menu: nova conversa personalizada (nome, personalidade, mensagem de abertura, número alvo, avaliação opcional), reproduzir uma conversa anterior, ou abrir relatórios já gerados em `reports/`. `q` ou `Ctrl+C` encerra e gera o relatório do que já foi conversado. Mais detalhes em [docs/como-rodar.md](docs/como-rodar.md).

---

## Bateria de testes em Gherkin (`batch-runner.js`)

Fluxo pensado: um PRD vira casos de teste em Gherkin, e a JudgeChat roda cada `Cenário` como uma sessão de WhatsApp, em sequência, devolvendo um veredito por cenário.

```
node batch-runner.js <pasta-com-arquivos-.feature>
```

### Estrutura

- **Uma pasta = uma bateria.** Pode ter vários `.feature`, cada um com vários cenários.
- Cada cenário precisa de uma tag `@criterio:<arquivo>.md` apontando para o critério em `criteria/`. Sem ela, o runner recusa a bateria e lista os cenários sem critério.

```gherkin
Funcionalidade: O Agente responde dúvidas básicas

  @criterio:exemplo-ct001-horario-de-funcionamento.md
  Cenário: CT001 - Agente informa o horário de funcionamento
    Dado que sou um cliente que nunca foi à loja
    Quando eu pergunto até que horas vocês funcionam hoje
    Então o Agente deve informar o horário ou indicar onde consultá-lo
```

- **Dado/Quando** descrevem quem é o cliente e o que ele pede (viram a personalidade do cliente simulado).
- **Então/E/Mas** descrevem o resultado esperado (viram o critério do juiz).

Exemplo completo: [features/exemplo-minimo/](features/exemplo-minimo/).

### Como é um critério

Um arquivo `.md` em `criteria/`, escrito só em termos do que se vê no chat:

```
Avalie, usando apenas o transcript da conversa de WhatsApp:

- O Agente informou o horário de funcionamento ou indicou onde consultá-lo.
- O Agente não se recusou a responder.

Considere PASSOU se ... Considere FALHOU se ...
```

O juiz só enxerga o **transcript**. Ele nunca vê o banco de dados ou o back-office do agente. Se algo só existe no backend, precisa de conferência manual.

### Fluxo do runner

1. **Preparação** (sem WhatsApp): a IA gera um rascunho de personalidade e, se o `.md` não existir, de critério. Você aprova ou edita todos antes de seguir.
2. **Configuração:** número alvo, perguntado uma vez para a bateria toda.
3. **Execução sequencial:** um cenário por vez, com **5 minutos** de espera entre eles. Falha técnica (WhatsApp caiu) tenta reconectar e pula a espera; se não reconectar, os cenários restantes ficam como erro técnico.
4. **Relatório:** tabela no terminal e HTML consolidado em `reports/`, com link para a conversa de cada cenário.

### Gherkin suportado

Só `Funcionalidade`/`Feature`, `Cenário`/`Scenario`, tags, e os passos `Dado`, `Quando`, `Então`, `E`, `Mas` (e equivalentes em inglês). **Não** suporta `Contexto`/`Background`, `Esquema do Cenário`, `Exemplos`, tabelas nem doc strings; usar qualquer um gera erro explícito.

### Massa de teste (`@massa:<id>`) (opcional)

Quando um cenário só passa com um cliente específico já preparado no sistema do agente testado (ex.: "M1 = cliente novo, sem histórico"), marque `@massa:M1`. A JudgeChat **não prepara** esse estado (é manual); ela só associa a massa a um telefone, lido de `massas.json` (fora do git):

```json
{
  "M1": { "phone": "5548999990001", "description": "Cliente novo, sem histórico prévio" }
}
```

- O runner nunca pergunta o telefone da massa no terminal. Se faltar, recusa a bateria dizendo o que adicionar.
- Todos os cenários selecionados precisam usar a mesma massa (ou nenhuma).
- Campos extras na massa (`day`, `diaComVagaLivre`...) entram automaticamente como contexto nos rascunhos, mas **só quando o rascunho é gerado**. Para valer depois de aprovado, regenere com `r` ou apague o arquivo aprovado.

### Histórico e comparação entre execuções

Cada bateria concluída grava um retrato em `logs/batch/<bateria>/runs.json`. O relatório mostra os chips das execuções anteriores, a linha do tempo de vereditos por cenário (seta ▸) e, em `reports/historico-<nome>.html`, uma comparação lado a lado entre duas execuções. Serve para achar cenários instáveis (alternam PASSOU/FALHOU).

### Limitações

- Pré-condições do backend (campo obrigatório, massa M1/M2...) são responsabilidade de quem roda a bateria.
- Tudo roda em sequência, com um número por vez.

---

## Solução de problemas

| Sintoma | O que fazer |
|---|---|
| O QR aparece de novo mesmo já tendo escaneado | a sessão em `.wwebjs_auth/` expirou ou foi invalidada; escaneie de novo |
| QR expirou | espere o próximo QR aparecer no terminal e escaneie rápido |
| Erro de número não encontrado | o número alvo não tem WhatsApp (telefones fixos só funcionam se tiverem WhatsApp Business) ou está sem DDI/DDD |
| `AI_PROVIDER desconhecido` | valor fora da lista; confira a grafia no `.env` |
| `claude` não é reconhecido | instale o Claude Code e faça login (`claude -p "oi"` deve responder) |
| A conversa nunca termina | a IA não está devolvendo `[FIM]`; use `q`, e reveja o modelo escolhido |
| Bateria recusada por falta de `@criterio` ou massa | o erro lista exatamente o que falta |

---

## Estrutura do projeto

| Arquivo | Papel |
|---|---|
| `cli.js` | menu interativo (uma conversa por vez) |
| `batch-runner.js` | runner de uma bateria Gherkin |
| `session.js` | conecta ao WhatsApp, roda a conversa, avalia e gera relatório |
| `agent.js` | ponto único de chamada à IA; escolhe o provedor e gera a fala do cliente |
| `providers/*.js` | um adaptador por IA (`claude`, `copilot`, `codex`) |
| `judge.js` | avalia a conversa contra um critério (PASSOU/FALHOU + motivo) |
| `gherkinParser.js` | parser leve de `.feature` |
| `batchDrafts.js`, `draftReview.js` | rascunho e revisão de persona/critério |
| `massas.js` | mapeia `@massa:<id>` para telefone (`massas.json`) |
| `batteryHistory.js`, `report.js` | histórico de execuções e relatórios HTML |
| `resetProjeto.js` | zera features, critérios gerados, logs e relatórios (preserva `exemplo-minimo` e `default.md`) |
| `.claude/agents/judgechat-*.md` | papéis fixos da IA (juiz, cliente, rascunhadores, revisores) |
| `criteria/*.md` | critérios de avaliação |
| `features/*/*.feature` | baterias de teste |

Veja também [docs/como-rodar.md](docs/como-rodar.md) (todas as formas de rodar).
