#!/usr/bin/env node
// Runner de uma bateria de testes Gherkin: node batch-runner.js <pasta>
//
// Fluxo: descobre e faz o parse dos .feature da pasta (gherkinParser.js) →
// fase de preparação síncrona (gera e faz a usuária aprovar a personalidade e
// o critério de cada cenário, ainda sem tocar no WhatsApp) → pergunta a
// configuração da bateria (número alvo, WhatsApp real ou Debug API) → roda os
// cenários em sequência, um único client de WhatsApp pra bateria inteira,
// esperando 5min entre cenários bem-sucedidos → gera o relatório HTML
// consolidado + imprime o resumo no terminal.
process.noDeprecation = true;
const fs = require('fs');
const path = require('path');
const readline = require('readline/promises');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { parseBatteryFolder, formatScenarioGherkin } = require('./gherkinParser');
const { draftPersonaFromScenario, draftCriteriaFromScenario } = require('./batchDrafts');
const { reviewPersonaDraft, reviewCriteriaDraft } = require('./draftReview');
const { connectToTarget, runConversation, evaluateAndReport } = require('./session');
const { runConversationViaDebugApi, phoneForScenario } = require('./debugSession');
const { resolveCriteriaPath } = require('./judge');
const { resolveMassas } = require('./massas');
const { loadRuns, appendRun } = require('./batteryHistory');
const { generateBatchHtmlReport, generateBatteryHistoryIndex, computeVerdictCounts } = require('./report');
const { ansi, paint, divider, createAsk, createAskMultiline, openInBrowser } = require('./terminalUi');

const REPORTS_DIR = path.join(__dirname, 'reports');
const BATCH_LOGS_DIR = path.join(__dirname, 'logs', 'batch');
const WAIT_BETWEEN_SCENARIOS_MS = 5 * 60 * 1000; // janela de encerramento de sessão confirmada com a usuária
// Modo Debug API roda vários cenários em paralelo e, de vez em quando, isso
// sobrecarrega o Sandbox e derruba a conexão no meio de uma conversa (erro
// "fetch failed", sem status HTTP — falha de rede, não de negócio). Sem
// retry, isso virava ERRO_TECNICO na cara dura mesmo sendo transitório.
const DEBUG_API_RETRY_ATTEMPTS = 3; // tentativa original + 2 retentativas
const DEBUG_API_RETRY_DELAY_MS = 5000; // respiro pro Sandbox antes de tentar de novo

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const ACCENT_MAP = {
  á: 'a', à: 'a', â: 'a', ã: 'a', ä: 'a',
  é: 'e', è: 'e', ê: 'e', ë: 'e',
  í: 'i', ì: 'i', î: 'i', ï: 'i',
  ó: 'o', ò: 'o', ô: 'o', õ: 'o', ö: 'o',
  ú: 'u', ù: 'u', û: 'u', ü: 'u',
  ç: 'c', ñ: 'n', ý: 'y',
};

function slugify(text) {
  const withoutAccents = text
    .toLowerCase()
    .split('')
    .map((ch) => ACCENT_MAP[ch] || ch)
    .join('');
  return withoutAccents.replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '') || 'cenario';
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Interpreta a seleção manual de cenários (índices 1-based, da lista impressa
// na tela) — aceita números soltos ("1,3,5") e faixas ("1-4,8,10-12"),
// combinados. Devolve índices 0-based únicos e em ordem crescente (a ordem em
// que o cenário aparece no .feature, não a ordem em que foi digitado), ou
// null se algum token for inválido ou fora do intervalo [1, max].
function parseScenarioSelection(input, max) {
  const indices = new Set();
  for (const rawPart of input.split(',').map((s) => s.trim()).filter(Boolean)) {
    const rangeMatch = rawPart.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      if (start < 1 || end > max || start > end) return null;
      for (let n = start; n <= end; n++) indices.add(n - 1);
      continue;
    }
    if (!/^\d+$/.test(rawPart)) return null;
    const n = Number(rawPart);
    if (n < 1 || n > max) return null;
    indices.add(n - 1);
  }
  if (indices.size === 0) return null;
  return [...indices].sort((a, b) => a - b);
}

// results.json guarda, por cenário (chave = scenarioSlug), o HISTÓRICO de
// tentativas — um array, na ordem em que rodaram — nunca só o último
// veredito. Reexecutar um cenário que já passou/falhou ACRESCENTA uma nova
// entrada no fim do array; a primeira execução nunca é sobrescrita nem
// perdida. Arquivos gravados antes desta mudança guardavam um objeto único
// por cenário (sem histórico) — loadPreviousResults migra isso pra
// [aquele objeto] na leitura, sem precisar editar o arquivo na mão.
function loadPreviousResults(resultsPath) {
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
  } catch {
    return {}; // primeira vez que esta bateria roda até o fim, ou arquivo ainda não existe
  }
  const migrated = {};
  for (const [slug, value] of Object.entries(raw)) {
    migrated[slug] = Array.isArray(value) ? value : [value];
  }
  return migrated;
}

function latestEntry(history) {
  return Array.isArray(history) && history.length > 0 ? history[history.length - 1] : null;
}

function appendResult(store, slug, entry) {
  if (!Array.isArray(store[slug])) store[slug] = [];
  store[slug].push(entry);
}

// Payload técnica completa de um ERRO_TECNICO — a mensagem resumida
// (verdictEntry.reason) some no meio do terminal e não chega a virar
// relatório HTML; isto grava tudo que dá pra saber sobre a falha num arquivo
// à parte. Cada ocorrência é ACRESCENTADA (mesmo espírito do histórico de
// results.json) — reexecutar um cenário que falhou de novo não apaga a
// payload da tentativa anterior.
function appendErrorPayload(filePath, payload) {
  let existing = [];
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    existing = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    existing = []; // primeira falha registrada neste cenário, ou arquivo ainda não existe
  }
  existing.push(payload);
  try {
    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));
  } catch {
    // não bloqueia a bateria se a gravação falhar
  }
}

// Campos estruturados (httpStatus/requestBody/responseBody, modo Debug API;
// historySoFar/lastData, os dois modos) são anexados ao erro em
// debugSession.js/session.js quando disponíveis — aqui só reúne o que existir,
// sem quebrar se algum campo não vier (ex.: erro técnico que nunca chegou a
// fazer uma chamada HTTP).
function buildErrorPayload(e, extra) {
  return {
    timestamp: new Date().toISOString(),
    errorMessage: e.message,
    errorStack: e.stack || null,
    httpStatus: e.httpStatus ?? null,
    requestBody: e.requestBody ?? null,
    responseBody: e.responseBody ?? null,
    historySoFar: e.historySoFar ?? null,
    lastData: e.lastData ?? null,
    ...extra,
  };
}

// Caminho relativo a REPORTS_DIR (com "/" mesmo no Windows), pra poder virar
// href num relatório HTML consolidado que vive em reports/.
function relativeHref(fromDir, toPath) {
  return path.relative(fromDir, toPath).split(path.sep).join('/');
}

function printProgress(index, total, name, status, note) {
  const badges = {
    RODANDO: paint(ansi.cyan, 'RODANDO...'),
    PASSOU: paint(ansi.green, 'PASSOU'),
    FALHOU: paint(ansi.red, 'FALHOU'),
    ERRO_TECNICO: paint(ansi.yellow, 'ERRO TÉCNICO'),
    ABORTADO: paint(ansi.yellow, 'ABORTADO'),
  };
  const badge = badges[status] || paint(ansi.dim, status || 'INDETERMINADO');
  const suffix = note ? paint(ansi.dim, ` ${note}`) : '';
  console.log(`  [${index + 1}/${total}] ${name} — ${badge}${suffix}`);
}

function printScenarioTurn(scenarioLabel, role, text) {
  if (role === 'sistema') {
    console.log(paint(ansi.dim, `    (${scenarioLabel}) ${text}`));
    return;
  }
  const isCliente = role.startsWith('CLIENTE');
  const color = isCliente ? ansi.green : ansi.cyan;
  const icon = isCliente ? '👤' : '🤖';
  console.log(`    ${icon} ${paint(ansi.dim, `[${scenarioLabel}]`)} ${paint(color + ansi.bold, role)}: ${paint(color, text)}`);
}

// Loop de aprovação da personalidade rascunhada por IA — Enter aprova, "e"
// edita campo a campo, "r" pede um novo rascunho do zero.
//
// personaPath aponta pro .persona.json desta bateria+cenário (mesmo arquivo
// que já era gravado só pra auditoria) — se ele já existir de uma execução
// anterior desta mesma pasta (bateria interrompida e retomada, por exemplo),
// a persona aprovada/editada ali é reaproveitada em vez de redesenhada do
// zero, exatamente como já acontecia com os critérios.
//
// Com autoReview ligado, um revisor de IA (draftReview.js) confere o rascunho
// primeiro (só quando não veio de reaproveitamento): se aprovar, retorna
// direto sem perguntar nada; se apontar um problema, cai no mesmo fluxo
// manual de sempre — só que já mostrando o que o revisor encontrou.
async function approvePersonaDraft(ask, askMultiline, scenario, autoReview, personaPath, massaData) {
  let alreadyExists = false;
  let draft = null;

  if (fs.existsSync(personaPath)) {
    try {
      const saved = JSON.parse(fs.readFileSync(personaPath, 'utf-8'));
      if (saved?.persona?.name && saved?.persona?.opening && saved?.persona?.personality) {
        draft = {
          name: saved.persona.name,
          opening: saved.persona.opening,
          personality: saved.persona.personality,
        };
        alreadyExists = true;
      }
    } catch {
      // arquivo corrompido/incompleto — ignora e redesenha do zero
    }
  }
  if (!draft) draft = await draftPersonaFromScenario(scenario, massaData);

  if (alreadyExists) {
    console.log(paint(ansi.green, `  ✅ ${scenario.name} — persona já aprovada nesta bateria, reaproveitada de ${path.basename(personaPath)}`));
    return draft;
  }

  if (autoReview) {
    try {
      const review = await reviewPersonaDraft(scenario, draft, massaData);
      if (review.ok) {
        console.log(paint(ansi.green, `  ✅ ${scenario.name} — personalidade aprovada automaticamente (${review.reason})`));
        return draft;
      }
      console.log(paint(ansi.yellow, `  ⚠️  ${scenario.name} — revisor apontou um problema na personalidade: ${review.reason}`));
    } catch (e) {
      console.log(paint(ansi.yellow, `  ⚠️  ${scenario.name} — revisor de personalidade falhou (${e.message}), caindo pra revisão manual`));
    }
  }

  for (;;) {
    console.log(`\n${divider}`);
    console.log(paint(ansi.bold, `Rascunho de personalidade — ${scenario.name}`));
    console.log(divider);
    console.log(`${paint(ansi.cyan, 'NOME:')} ${draft.name}`);
    console.log(`${paint(ansi.cyan, 'ABERTURA:')} ${draft.opening}`);
    console.log(`${paint(ansi.cyan, 'PERSONALIDADE:')}\n${draft.personality}`);
    const choice = (await ask('Aprovar (Enter) / editar (e) / gerar novo rascunho (r)?', '')).trim().toLowerCase();
    if (choice === 'r') {
      draft = await draftPersonaFromScenario(scenario, massaData);
      continue;
    }
    if (choice === 'e') {
      draft = {
        name: await ask('Nome', draft.name),
        opening: await ask('Abertura', draft.opening),
        personality: await askMultiline('Personalidade', draft.personality),
      };
      continue;
    }
    return draft;
  }
}

// Loop de aprovação do critério (.md): se o arquivo já existe, mostra o
// conteúdo atual pra usar/editar/regenerar; se não existe, gera um rascunho
// e EXIGE que a usuária passe pelo prompt de revisão antes de gravar em disco
// — nunca escreve o arquivo sem mostrar o texto primeiro.
async function approveCriteriaDraft(ask, askMultiline, scenario, criteriaPath, autoReview, massaData) {
  let alreadyExists = fs.existsSync(criteriaPath);
  let text = alreadyExists ? fs.readFileSync(criteriaPath, 'utf-8') : await draftCriteriaFromScenario(scenario, massaData);

  if (autoReview) {
    // Arquivo já existente = já foi aprovado (manual ou automaticamente) em
    // alguma execução anterior — reusa sem gastar uma chamada de revisor nele.
    if (alreadyExists) {
      console.log(paint(ansi.green, `  ✅ ${scenario.name} — critério já existente (${path.basename(criteriaPath)}), reaproveitado automaticamente`));
      return criteriaPath;
    }
    try {
      const review = await reviewCriteriaDraft(scenario, text, massaData);
      if (review.ok) {
        console.log(paint(ansi.green, `  ✅ ${scenario.name} — critério aprovado automaticamente (${review.reason})`));
        fs.writeFileSync(criteriaPath, text.trim() + '\n');
        return criteriaPath;
      }
      console.log(paint(ansi.yellow, `  ⚠️  ${scenario.name} — revisor apontou um problema no critério: ${review.reason}`));
    } catch (e) {
      console.log(paint(ansi.yellow, `  ⚠️  ${scenario.name} — revisor de critério falhou (${e.message}), caindo pra revisão manual`));
    }
  }

  for (;;) {
    console.log(`\n${divider}`);
    console.log(paint(ansi.bold, `Critério — ${path.basename(criteriaPath)}${alreadyExists ? ' (já existe)' : ' (rascunho novo)'}`));
    console.log(divider);
    console.log(text);
    const prompt = alreadyExists
      ? 'Usar como está (Enter) / editar (e) / gerar novo rascunho (r)?'
      : 'Usar este rascunho (Enter) / editar (e) / gerar novo rascunho (r)?';
    const choice = (await ask(prompt, '')).trim().toLowerCase();
    if (choice === 'r') {
      text = await draftCriteriaFromScenario(scenario, massaData);
      alreadyExists = false;
      continue;
    }
    if (choice === 'e') {
      text = await askMultiline('Novo texto do critério', text);
      continue;
    }
    break;
  }

  fs.writeFileSync(criteriaPath, text.trim() + '\n');
  return criteriaPath;
}

async function main() {
  const folderArg = process.argv[2];
  if (!folderArg) {
    console.error(paint(ansi.red + ansi.bold, '❌ Uso: node batch-runner.js <pasta-com-.feature>'));
    process.exit(1);
  }
  const folderPath = path.resolve(process.cwd(), folderArg);
  if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
    console.error(paint(ansi.red + ansi.bold, `❌ Pasta não encontrada: ${folderPath}`));
    process.exit(1);
  }

  let scenarios;
  try {
    scenarios = parseBatteryFolder(folderPath);
  } catch (e) {
    console.error(paint(ansi.red + ansi.bold, `❌ ${e.message}`));
    process.exit(1);
  }

  const batterySlug = slugify(path.basename(folderPath));
  ensureDir(REPORTS_DIR);
  const batchLogsDir = path.join(BATCH_LOGS_DIR, batterySlug);
  ensureDir(batchLogsDir);

  console.log(`\n${divider}`);
  console.log(paint(ansi.bold + ansi.magenta, `  🧪  Bateria: ${path.basename(folderPath)}`));
  console.log(divider);
  console.log(`  ${scenarios.length} cenário(s) encontrado(s):`);
  scenarios.forEach((s, i) => console.log(`    ${i + 1}. ${s.name} ${paint(ansi.dim, `(${s.criteriaFile})`)}`));
  console.log(divider);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = createAsk(rl);
  const askMultiline = createAskMultiline(rl);

  // Seleção manual, opcional: Enter roda a pasta inteira (comportamento de
  // sempre); um ou mais números da lista acima restringe a bateria a só
  // esses cenários — a validação do @criterio ainda rodou pra pasta inteira
  // (parseBatteryFolder, acima), só a EXECUÇÃO fica menor.
  let selectedScenarios = scenarios;
  for (;;) {
    const selectionInput = (await ask(
      `Rodar todos os ${scenarios.length} cenários (Enter) ou só alguns (números da lista acima, ex.: 1,3,5 ou 1-4)?`,
      '',
    )).trim();
    if (!selectionInput) break;
    const indices = parseScenarioSelection(selectionInput, scenarios.length);
    if (!indices) {
      console.log(paint(ansi.red, `  ❌ Seleção inválida — use números de 1 a ${scenarios.length}, separados por vírgula (faixas tipo 1-4 também valem).`));
      continue;
    }
    selectedScenarios = indices.map((i) => scenarios[i]);
    console.log(paint(ansi.dim, `  Rodando ${selectedScenarios.length} de ${scenarios.length} cenário(s): ${selectedScenarios.map((s) => s.name).join(', ')}`));
    break;
  }

  // Perguntada uma vez, vale pra bateria inteira: com muitos cenários, aprovar
  // persona + critério um por um fica inviável — a revisão automática troca
  // isso por um terceiro papel de IA (draftReview.js) que só chama a usuária
  // quando encontra um problema real. Os arquivos de auditoria (.persona.json,
  // criteria/*.md) são gravados do mesmo jeito nos dois modos.
  const autoReview = /^s/i.test((await ask(
    'Revisar personalidade e critério de cada cenário automaticamente com uma IA revisora (só te chama se achar um problema)? (s/n)',
    'n',
  )).trim());

  // Fase 0.5 — resolve a tag @massa:<id> (opcional) de cada cenário
  // selecionado pra um telefone real já preparado manualmente antes (e
  // qualquer outro dado extra da massa — dia, modalidade etc.), lendo só de
  // massas.json (nunca pergunta no terminal — ver massas.js). Roda ANTES da
  // geração de rascunho (Fase 1, abaixo) pra que a persona e o critério de
  // cada cenário já nasçam usando os dados reais da massa, sem precisar de
  // placeholder no .feature nem de código novo quando surgir um campo novo —
  // o JSON inteiro da massa vira contexto extra pro mesmo agente de IA que já
  // gera o rascunho.
  const massaIdsUsed = [...new Set(selectedScenarios.map((s) => s.massaId).filter(Boolean))];
  let massas = {};
  if (massaIdsUsed.length) {
    console.log(`\n${divider}`);
    console.log(paint(ansi.bold, '  Massas de teste desta bateria'));
    console.log(divider);
    try {
      massas = resolveMassas(massaIdsUsed);
    } catch (e) {
      console.error(paint(ansi.red + ansi.bold, `❌ ${e.message}`));
      rl.close();
      process.exit(1);
    }
    massaIdsUsed.forEach((massaId) => {
      const { phone, description } = massas[massaId];
      console.log(paint(ansi.dim, `  ${massaId} → ${phone}${description ? ` (${description})` : ''}`));
    });
  }

  // Fase 1 — preparação síncrona (ainda sem WhatsApp): aprova personalidade e
  // critério de CADA cenário antes de qualquer sessão começar.
  const prepared = [];
  for (const scenario of selectedScenarios) {
    const scenarioSlug = slugify(scenario.name);
    const personaPath = path.join(batchLogsDir, `${scenarioSlug}.persona.json`);
    const massaData = scenario.massaId ? massas[scenario.massaId] : null;
    const draft = await approvePersonaDraft(ask, askMultiline, scenario, autoReview, personaPath, massaData);
    const criteriaPath = await approveCriteriaDraft(ask, askMultiline, scenario, resolveCriteriaPath(scenario.criteriaFile), autoReview, massaData);

    const persona = {
      name: draft.name,
      personality: draft.personality,
      opening: draft.opening,
      targetNumber: null, // preenchido na fase 1.5
      scriptOf: '',
      evaluate: true,
      criteriaFile: scenario.criteriaFile,
      // Texto do Cenário Gherkin que originou esta conversa — exibido no
      // relatório HTML individual (report.js) pra rastrear qual .feature/
      // Cenário gerou aquela conversa sem precisar abrir o arquivo original.
      gherkinScenario: formatScenarioGherkin(scenario),
    };

    try {
      fs.writeFileSync(personaPath, JSON.stringify({ scenario: scenario.name, persona, criteriaPath }, null, 2));
    } catch {
      // auditoria não-bloqueante: se falhar em gravar, a bateria segue normalmente
    }

    prepared.push({ scenario, scenarioSlug, persona });
  }

  // Fase 1.5 — configuração de nível de bateria (não varia por cenário).
  console.log(`\n${divider}`);
  console.log(paint(ansi.bold, '  Configuração desta bateria'));
  console.log(divider);
  const modoInput = (await ask(
    'Executar via WhatsApp real (sequencial, 1 número, espera 5min entre cenários) ou via Debug API (paralelo, 1 sessão por cenário, sem WhatsApp)? (whatsapp/debug)',
    'whatsapp',
  )).trim().toLowerCase();
  const useDebugMode = modoInput.startsWith('d');

  let targetNumber = null;
  let concurrency = 1;
  let debugBaseUrl = null;
  let debugToken = null;
  let phoneCountry = 'BR';

  if (useDebugMode) {
    // Modo Debug API (ver docs/qa-debug-chat-playwright.md): não passa pelo
    // WhatsApp, então não precisa de número alvo nem de espera entre
    // cenários — só de um telefone fictício por cenário (debugSession.js
    // gera um determinístico) e do token do ambiente Sandbox.
    debugBaseUrl = process.env.NEXTIA_DEBUG_BASE_URL || 'https://nextaialuno-sandbox.appnext.fit';
    debugToken = process.env.NEXTIA_DEBUG_INSTANCIA_TOKEN;
    if (!debugToken) {
      console.error(paint(ansi.red + ansi.bold, '❌ Defina NEXTIA_DEBUG_INSTANCIA_TOKEN no .env pra usar o modo Debug API.'));
      rl.close();
      process.exit(1);
    }
    console.log(paint(ansi.dim, `  Base do Debug API: ${debugBaseUrl}`));
    const concurrencyInput = (await ask('Quantos cenários rodar em paralelo (recomendado: 3 a 5, pra não sobrecarregar o Sandbox)?', '5')).trim();
    concurrency = Math.max(1, parseInt(concurrencyInput, 10) || 5);
    // BR já foi testado batendo na API de verdade. US é experimental — não
    // confirmamos ainda se o backend testado aceita o formato de número dos EUA.
    const countryInput = (await ask('País do telefone fictício gerado por cenário — BR (testado) ou US (experimental)?', 'BR')).trim().toUpperCase();
    phoneCountry = countryInput.startsWith('U') ? 'US' : 'BR';
    if (phoneCountry === 'US') {
      console.log(paint(ansi.yellow, '  ⚠️  Formato US ainda não confirmado contra a API de verdade — acompanhe a "resposta bruta" dos primeiros cenários pra conferir se não quebra o login.'));
    }
  } else {
    // Modo WhatsApp real usa 1 único número pra bateria inteira — não dá pra
    // representar duas massas diferentes (cada uma precisa de um cadastro
    // próprio no backend testado) na mesma execução.
    if (massaIdsUsed.length > 1) {
      console.error(paint(
        ansi.red + ansi.bold,
        `❌ Esta bateria mistura as massas ${massaIdsUsed.join(', ')}, mas o modo WhatsApp real usa um único número pra bateria inteira. Rode cada massa numa bateria separada (ou selecione só os cenários de uma massa por vez), ou use o modo Debug API — nele cada cenário roda com seu próprio telefone.`,
      ));
      rl.close();
      process.exit(1);
    }

    if (massaIdsUsed.length === 1) {
      // Única massa da bateria: o telefone já é conhecido (massas.json) — usa
      // direto, sem perguntar.
      targetNumber = massas[massaIdsUsed[0]].phone;
      console.log(paint(ansi.dim, `  Número de WhatsApp alvo definido pela massa ${massaIdsUsed[0]}: ${targetNumber}`));
    } else {
      targetNumber = await ask('Número de WhatsApp alvo desta bateria (DDI+DDD+número)', process.env.TARGET_NUMBER || '');
      if (!targetNumber) {
        console.error(paint(ansi.red + ansi.bold, '❌ Número de WhatsApp alvo não informado.'));
        rl.close();
        process.exit(1);
      }
    }
    prepared.forEach((p) => { p.persona.targetNumber = targetNumber; });
  }

  // Retomada de bateria interrompida: results.json guarda o HISTÓRICO de
  // tentativas de cada cenário desta pasta (chave = scenarioSlug). Só
  // PASSOU/FALHOU do último veredito contam como "já rodou" pra fins de
  // reaproveitamento — ERRO_TECNICO/ABORTADO não tiveram uma chance justa e
  // são tentados de novo automaticamente, sem perguntar nada.
  const resultsPath = path.join(batchLogsDir, 'results.json');
  const previousResults = loadPreviousResults(resultsPath);
  function saveResults() {
    try {
      fs.writeFileSync(resultsPath, JSON.stringify(previousResults, null, 2));
    } catch {
      // não bloqueia a bateria se a gravação falhar
    }
  }

  // Cenários com PASSOU/FALHOU de uma execução anterior são reaproveitados
  // por padrão (Enter) — mas dá pra escolher reexecutar algum mesmo assim.
  // O resultado anterior NUNCA é sobrescrito: cada reexecução é acrescentada
  // ao histórico (appendResult), então a primeira tentativa continua no
  // results.json mesmo depois de rodar de novo.
  const reusable = prepared.filter((p) => {
    const last = latestEntry(previousResults[p.scenarioSlug]);
    return last && (last.verdict === 'PASSOU' || last.verdict === 'FALHOU');
  });
  const forcedRerun = new Set();
  if (reusable.length > 0) {
    console.log(`\n${divider}`);
    console.log(paint(ansi.bold, `  ${reusable.length} de ${prepared.length} cenário(s) já têm veredito de uma execução anterior desta pasta:`));
    reusable.forEach((p, i) => {
      const last = latestEntry(previousResults[p.scenarioSlug]);
      const tentativas = previousResults[p.scenarioSlug].length;
      const badge = last.verdict === 'PASSOU' ? paint(ansi.green, last.verdict) : paint(ansi.red, last.verdict);
      console.log(`    ${i + 1}. ${p.scenario.name} — ${badge}${tentativas > 1 ? paint(ansi.dim, ` (${tentativas} tentativas)`) : ''}`);
    });
    const rerunInput = (await ask(
      'Reexecutar algum desses agora (números da lista acima, ex.: 1,3 ou 1-2) ou manter todos reaproveitados (Enter)? O veredito anterior de cada um fica guardado no histórico, nada é perdido.',
      '',
    )).trim();
    if (rerunInput) {
      const indices = parseScenarioSelection(rerunInput, reusable.length);
      if (indices) {
        indices.forEach((i) => forcedRerun.add(reusable[i].scenarioSlug));
        console.log(paint(ansi.dim, `  Reexecutando: ${indices.map((i) => reusable[i].scenario.name).join(', ')}`));
      } else {
        console.log(paint(ansi.red, `  ❌ Seleção inválida — ignorando, nenhum cenário será reexecutado à força.`));
      }
    }
  }
  rl.close();

  // Ctrl+C: durante a fase 1/1.5 sai direto; durante a fase 2, a primeira vez
  // pede pra abortar (sem iniciar cenário/bloco novo) e gera o relatório com
  // o que já rodou; a segunda força saída imediata. No modo Debug API, um
  // bloco de cenários já em voo não é cancelado no meio (não há um
  // "fatalSignal" por chamada HTTP como no WhatsApp) — só evita começar o
  // próximo bloco.
  let phase2Started = false;
  let sigintReceived = false;
  let abortReject;
  const abortSignal = new Promise((_, reject) => { abortReject = reject; });
  abortSignal.catch(() => {});
  process.on('SIGINT', () => {
    if (!phase2Started) {
      console.log(paint(ansi.yellow, '\n👋 Cancelado.'));
      process.exit(0);
    }
    if (sigintReceived) {
      console.log(paint(ansi.red, '\n⏹  Forçando saída imediata.'));
      process.exit(1);
    }
    sigintReceived = true;
    console.log(paint(ansi.yellow, '\n⏹  Abortando a bateria (Ctrl+C de novo força saída imediata)...'));
    abortReject(new Error('bateria abortada pela usuária (Ctrl+C)'));
  });

  const results = [];

  // Fase 2 — execução. Um dos dois modos abaixo, nunca os dois.
  phase2Started = true;
  if (useDebugMode) {
    await runBatteryViaDebugApi();
  } else {
    await runBatteryViaWhatsApp();
  }

  const timestamp = new Date().toISOString();
  const stamp = timestamp.replace(/[:.]/g, '-');
  const batchReportFile = `bateria-${batterySlug}-${stamp}.html`;
  const batchReportPath = path.join(REPORTS_DIR, batchReportFile);
  const historyIndexFile = `historico-${batterySlug}.html`;
  const historyIndexPath = path.join(REPORTS_DIR, historyIndexFile);

  // Histórico de EXECUÇÕES desta bateria (runs.json — ver batteryHistory.js):
  // priorRuns é tudo que já rodou ANTES de agora (alimenta a tira do topo e a
  // linha do tempo de cada cenário no relatório desta execução); currentRun é
  // o retrato desta execução, gravado no fim pra virar "prior" na próxima vez.
  const priorRuns = loadRuns(batchLogsDir);
  const currentRun = {
    timestamp,
    reportFile: batchReportFile,
    counts: computeVerdictCounts(results),
    scenarios: results.map((r) => ({
      scenarioSlug: r.scenarioSlug,
      scenarioName: r.scenarioName,
      verdict: r.verdict,
      reason: r.reason,
      reportFile: r.reportFile,
      errorPayloadFile: r.errorPayloadFile,
      numero: r.numero,
    })),
  };

  generateBatchHtmlReport(batchReportPath, { name: path.basename(folderPath), timestamp, historyIndexFile }, results, priorRuns);
  const allRuns = appendRun(batchLogsDir, currentRun);
  generateBatteryHistoryIndex(historyIndexPath, { name: path.basename(folderPath) }, allRuns);

  console.log(`\n${divider}`);
  console.log(paint(ansi.bold, '  Resumo da bateria'));
  console.log(divider);
  results.forEach((r, i) => printProgress(i, results.length, r.scenarioName, r.verdict));
  console.log(divider);
  console.log(`  📄  Relatório consolidado: ${path.relative(__dirname, batchReportPath)}`);
  console.log(`  🗂️  Histórico de execuções: ${path.relative(__dirname, historyIndexPath)}`);
  openInBrowser(batchReportPath);
  process.exit(0);

  // --- Modo WhatsApp: sequencial, um único client pra bateria inteira,
  // espera de 5min entre cenários bem-sucedidos (janela real de fechamento
  // de sessão do agente). ---
  async function runBatteryViaWhatsApp() {
    let target;
    try {
      target = await connectToTarget(targetNumber, { onStatus: (msg) => console.log(paint(ansi.yellow, msg)) });
    } catch (e) {
      console.error(paint(ansi.red + ansi.bold, `❌ Não foi possível conectar ao WhatsApp — abortando a bateria inteira: ${e.message}`));
      process.exit(1);
    }

    console.log(`\n${divider}`);
    console.log(paint(ansi.bold + ansi.green, '  ✅  WhatsApp conectado! Rodando a bateria...'));
    console.log(divider);

    async function tryReconnect() {
      try {
        return await connectToTarget(targetNumber, { onStatus: (msg) => console.log(paint(ansi.yellow, msg)) });
      } catch {
        return null;
      }
    }

    function fillRemaining(fromIndex, verdict, reason) {
      for (let j = fromIndex; j < prepared.length; j++) {
        results.push({ scenarioName: prepared[j].scenario.name, scenarioSlug: prepared[j].scenarioSlug, numero: targetNumber, verdict, reason, reportFile: null });
        printProgress(j, prepared.length, prepared[j].scenario.name, verdict);
      }
    }

    for (let i = 0; i < prepared.length; i++) {
      const { scenario, scenarioSlug, persona } = prepared[i];

      const last = latestEntry(previousResults[scenarioSlug]);
      const reuse = last && (last.verdict === 'PASSOU' || last.verdict === 'FALHOU') && !forcedRerun.has(scenarioSlug);
      if (reuse) {
        results.push({ scenarioName: scenario.name, scenarioSlug, numero: last.numero || targetNumber, verdict: last.verdict, reason: last.reason, reportFile: last.reportFile });
        printProgress(i, prepared.length, scenario.name, last.verdict, `(reaproveitado de execução anterior · ${last.numero || targetNumber})`);
        continue; // não conecta, não espera — nada foi rodado agora
      }

      const tentativa = (previousResults[scenarioSlug]?.length || 0) + 1;
      printProgress(i, prepared.length, scenario.name, 'RODANDO', `(número: ${targetNumber}${tentativa > 1 ? ` · tentativa ${tentativa}` : ''})`);

      // Prefixo com o número em toda linha de turno da conversa — no modo
      // WhatsApp o número é o mesmo pra bateria inteira, mas continua valendo
      // mostrar (evita ter que rolar a tela até a "Configuração desta bateria"
      // pra saber qual número gerou aquele log).
      const turnLabel = `${scenarioSlug} · ${targetNumber}`;

      let verdictEntry;
      try {
        const { history } = await runConversation({
          client: target.client,
          targetChatId: target.targetChatId,
          targetLid: target.targetLid,
          persona,
          options: {
            logFile: path.join(batchLogsDir, `${scenarioSlug}.log`),
            enableResponseWatcher: false,
            onLog: (role, text) => printScenarioTurn(turnLabel, role, text),
            fatalSignal: Promise.race([target.whenFatal, abortSignal]),
          },
        });
        const { reportPath, evaluationResult } = await evaluateAndReport({
          persona,
          history,
          reportsDir: REPORTS_DIR,
          reportSlug: scenarioSlug,
          onStatus: (msg) => console.log(paint(ansi.dim, `    ${msg}`)),
        });
        verdictEntry = {
          scenarioName: scenario.name,
          scenarioSlug,
          numero: targetNumber,
          verdict: evaluationResult?.verdict || null,
          reason: evaluationResult?.reason || null,
          reportFile: path.basename(reportPath),
          tentativa,
        };
      } catch (e) {
        verdictEntry = {
          scenarioName: scenario.name,
          scenarioSlug,
          numero: targetNumber,
          verdict: sigintReceived ? 'ABORTADO' : 'ERRO_TECNICO',
          reason: e.message,
          reportFile: null,
          tentativa,
        };
        if (verdictEntry.verdict === 'ERRO_TECNICO') {
          const payloadPath = path.join(batchLogsDir, `${scenarioSlug}.erro-tecnico.json`);
          appendErrorPayload(payloadPath, buildErrorPayload(e, { scenario: scenario.name, numero: targetNumber, tentativa }));
          verdictEntry.errorPayloadFile = relativeHref(REPORTS_DIR, payloadPath);
        }
      }

      results.push(verdictEntry);
      // ERRO_TECNICO/ABORTADO não entram no histórico — não tiveram uma
      // chance justa de rodar, então não contam como "tentativa" pra fins de
      // reaproveitamento/numeração (mesma regra de sempre, agora explícita).
      if (verdictEntry.verdict === 'PASSOU' || verdictEntry.verdict === 'FALHOU') {
        appendResult(previousResults, scenarioSlug, verdictEntry);
        saveResults();
      }
      printProgress(i, prepared.length, scenario.name, verdictEntry.verdict);

      if (verdictEntry.verdict === 'ABORTADO') {
        fillRemaining(i + 1, 'ABORTADO', 'bateria abortada pela usuária antes deste cenário rodar');
        break;
      }
      if (verdictEntry.verdict === 'ERRO_TECNICO') {
        console.log(paint(ansi.yellow, '  Tentando reconectar ao WhatsApp...'));
        const reconnected = await tryReconnect();
        if (!reconnected) {
          fillRemaining(i + 1, 'ERRO_TECNICO', 'WhatsApp indisponível — bateria interrompida');
          break;
        }
        target = reconnected;
        continue; // erro técnico pula a espera de 5min (decisão da usuária)
      }

      if (i < prepared.length - 1) {
        console.log(paint(ansi.dim, `  Aguardando 5min antes do próximo cenário...`));
        try {
          await Promise.race([sleep(WAIT_BETWEEN_SCENARIOS_MS), abortSignal]);
        } catch {
          // abortSignal rejeitou durante a espera — tratado abaixo
        }
        if (sigintReceived) {
          fillRemaining(i + 1, 'ABORTADO', 'bateria abortada pela usuária durante a espera entre cenários');
          break;
        }
      }
    }

    await target.disconnect();
  }

  // --- Modo Debug API: sem WhatsApp, sem "número alvo" único — cada cenário
  // tem seu próprio telefone fictício e roda em blocos de até `concurrency`
  // cenários em paralelo de verdade (Promise.allSettled), sem espera entre
  // blocos. ---
  async function runBatteryViaDebugApi() {
    console.log(`\n${divider}`);
    console.log(paint(ansi.bold + ansi.green, `  ✅  Rodando a bateria via Debug API (até ${concurrency} em paralelo, sem WhatsApp)...`));
    console.log(divider);

    // Cenário com @massa:<id> usa o telefone real dessa massa (massas.json);
    // sem a tag, mantém o telefone fictício determinístico de sempre.
    function resolvePhone(p) {
      return p.scenario.massaId ? massas[p.scenario.massaId].phone : phoneForScenario(p.scenarioSlug, phoneCountry);
    }

    // Cenários reaproveitáveis são resolvidos aqui mesmo, sem entrar na fila
    // — nenhuma chamada de rede é feita por eles. O telefone (fictício e
    // determinístico, ou o real de uma massa) é sempre o mesmo pro mesmo
    // cenário, então mesmo num resultado antigo sem o campo "numero" salvo,
    // dá pra recalcular e mostrar corretamente.
    const toRun = [];
    prepared.forEach((p, i) => {
      const last = latestEntry(previousResults[p.scenarioSlug]);
      const phone = resolvePhone(p);
      const reuse = last && (last.verdict === 'PASSOU' || last.verdict === 'FALHOU') && !forcedRerun.has(p.scenarioSlug);
      if (reuse) {
        results[i] = { scenarioName: p.scenario.name, scenarioSlug: p.scenarioSlug, numero: phone, verdict: last.verdict, reason: last.reason, reportFile: last.reportFile };
        printProgress(i, prepared.length, p.scenario.name, last.verdict, `(reaproveitado de execução anterior · ${phone})`);
      } else {
        toRun.push(i);
      }
    });

    async function runOne(i) {
      const { scenario, scenarioSlug, persona } = prepared[i];
      const phone = resolvePhone(prepared[i]);
      const baseTentativa = previousResults[scenarioSlug]?.length || 0;

      // Registra o telefone na própria persona pra ele aparecer também no
      // relatório HTML individual daquele cenário, não só no consolidado.
      persona.targetNumber = phone;

      const turnLabel = `${scenarioSlug} · ${phone}`;

      let verdictEntry;
      for (let attempt = 1; attempt <= DEBUG_API_RETRY_ATTEMPTS; attempt++) {
        const tentativa = baseTentativa + attempt;
        printProgress(i, prepared.length, scenario.name, 'RODANDO', `(telefone de debug: ${phone}${tentativa > 1 ? ` · tentativa ${tentativa}` : ''})`);

        try {
          const { history } = await runConversationViaDebugApi({
            baseUrl: debugBaseUrl,
            token: debugToken,
            phone,
            persona,
            options: {
              onLog: (role, text) => printScenarioTurn(turnLabel, role, text),
            },
          });
          const { reportPath, evaluationResult } = await evaluateAndReport({
            persona,
            history,
            reportsDir: REPORTS_DIR,
            reportSlug: scenarioSlug,
            onStatus: (msg) => console.log(paint(ansi.dim, `    ${msg}`)),
          });
          verdictEntry = {
            scenarioName: scenario.name,
            scenarioSlug,
            numero: phone,
            verdict: evaluationResult?.verdict || null,
            reason: evaluationResult?.reason || null,
            reportFile: path.basename(reportPath),
            tentativa,
          };
          break; // sucesso (mesmo com veredito FALHOU — é avaliação real, não erro técnico)
        } catch (e) {
          verdictEntry = {
            scenarioName: scenario.name,
            scenarioSlug,
            numero: phone,
            verdict: sigintReceived ? 'ABORTADO' : 'ERRO_TECNICO',
            reason: e.message,
            reportFile: null,
            tentativa,
          };
          if (verdictEntry.verdict === 'ERRO_TECNICO') {
            const payloadPath = path.join(batchLogsDir, `${scenarioSlug}.erro-tecnico.json`);
            appendErrorPayload(payloadPath, buildErrorPayload(e, { scenario: scenario.name, numero: phone, tentativa }));
            verdictEntry.errorPayloadFile = relativeHref(REPORTS_DIR, payloadPath);
          }
          if (verdictEntry.verdict !== 'ERRO_TECNICO') break; // ABORTADO (Ctrl+C) não tenta de novo
          if (attempt < DEBUG_API_RETRY_ATTEMPTS) {
            console.log(paint(
              ansi.yellow,
              `    ⚠️  ${scenario.name}: erro técnico na tentativa ${tentativa} (${e.message}) — tentando de novo em ${DEBUG_API_RETRY_DELAY_MS / 1000}s...`,
            ));
            await sleep(DEBUG_API_RETRY_DELAY_MS);
          }
        }
      }

      results[i] = verdictEntry;
      // Mesma regra do modo WhatsApp: só PASSOU/FALHOU entram no histórico.
      if (verdictEntry.verdict === 'PASSOU' || verdictEntry.verdict === 'FALHOU') {
        appendResult(previousResults, scenarioSlug, verdictEntry);
        saveResults();
      }
      printProgress(i, prepared.length, scenario.name, verdictEntry.verdict, `(${phone})`);
    }

    for (let start = 0; start < toRun.length; start += concurrency) {
      if (sigintReceived) {
        for (const j of toRun.slice(start)) {
          const phone = phoneForScenario(prepared[j].scenarioSlug, phoneCountry);
          results[j] = { scenarioName: prepared[j].scenario.name, scenarioSlug: prepared[j].scenarioSlug, numero: phone, verdict: 'ABORTADO', reason: 'bateria abortada pela usuária antes deste bloco rodar', reportFile: null };
          printProgress(j, prepared.length, prepared[j].scenario.name, 'ABORTADO');
        }
        break;
      }
      const chunk = toRun.slice(start, start + concurrency);
      await Promise.allSettled(chunk.map(runOne));
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
