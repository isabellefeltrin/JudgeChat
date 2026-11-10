process.noDeprecation = true;
const fs = require("fs");
const path = require("path");
const readline = require("readline/promises");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const {
  parseBatteryFolder,
  formatScenarioGherkin,
} = require("./gherkinParser");
const { resolveCriteriaPath } = require("./judge");
const { resolveMassas } = require("./massas");
const { loadRuns, appendRun } = require("./batteryHistory");
const {
  generateBatchHtmlReport,
  generateBatteryHistoryIndex,
  computeVerdictCounts,
} = require("./report");
const {
  ansi,
  paint,
  divider,
  createAsk,
  createAskMultiline,
  openInBrowser,
} = require("./terminalUi");
const { slugify, ensureDir } = require("./lib/utils");
const { parseSelection } = require("./batch/selection");
const {
  approvePersonaDraft,
  approveCriteriaDraft,
} = require("./batch/approvals");
const { printProgress } = require("./batch/progress");
const { createAbortController } = require("./batch/abort");
const { runBatteryViaWhatsApp } = require("./batch/whatsappRunner");
const {
  loadPreviousResults,
  saveResults,
  latestEntry,
  isFinalVerdict,
} = require("./batch/resultsStore");

const REPORTS_DIR = path.join(__dirname, "reports");
const BATCH_LOGS_DIR = path.join(__dirname, "logs", "batch");

function fatal(message, rl) {
  console.error(paint(ansi.red + ansi.bold, `❌ ${message}`));
  if (rl) rl.close();
  process.exit(1);
}

function printSection(title) {
  console.log(`\n${divider}`);
  console.log(paint(ansi.bold, `  ${title}`));
  console.log(divider);
}

async function chooseScenarios(ask, scenarios) {
  for (;;) {
    const input = await ask(
      `Rodar todos os ${scenarios.length} cenários (Enter) ou só alguns (números da lista acima, ex.: 1,3,5 ou 1-4)?`,
      "",
    );
    if (!input) return scenarios;
    const indices = parseSelection(input, scenarios.length);
    if (!indices) {
      console.log(
        paint(
          ansi.red,
          `  ❌ Seleção inválida — use números de 1 a ${scenarios.length}, separados por vírgula (faixas tipo 1-4 também valem).`,
        ),
      );
      continue;
    }
    const chosen = indices.map((i) => scenarios[i]);
    console.log(
      paint(
        ansi.dim,
        `  Rodando ${chosen.length} de ${scenarios.length} cenário(s): ${chosen.map((s) => s.name).join(", ")}`,
      ),
    );
    return chosen;
  }
}

function loadMassasFor(scenarios, rl) {
  const massaIds = [
    ...new Set(scenarios.map((s) => s.massaId).filter(Boolean)),
  ];
  if (massaIds.length === 0) return { massaIds, massas: {} };

  printSection("Massas de teste desta bateria");
  let massas;
  try {
    massas = resolveMassas(massaIds);
  } catch (e) {
    fatal(e.message, rl);
  }
  massaIds.forEach((massaId) => {
    const { phone, description } = massas[massaId];
    console.log(
      paint(
        ansi.dim,
        `  ${massaId} → ${phone}${description ? ` (${description})` : ""}`,
      ),
    );
  });
  return { massaIds, massas };
}

async function prepareScenarios({
  scenarios,
  massas,
  autoReview,
  io,
  batchLogsDir,
}) {
  const prepared = [];
  for (const scenario of scenarios) {
    const scenarioSlug = slugify(scenario.name);
    const personaPath = path.join(batchLogsDir, `${scenarioSlug}.persona.json`);
    const massaData = scenario.massaId ? massas[scenario.massaId] : null;

    const draft = await approvePersonaDraft(io, scenario, {
      autoReview,
      personaPath,
      massaData,
    });
    const criteriaPath = await approveCriteriaDraft(io, scenario, {
      criteriaPath: resolveCriteriaPath(scenario.criteriaFile),
      autoReview,
      massaData,
    });

    const persona = {
      ...draft,
      targetNumber: null,
      scriptOf: "",
      evaluate: true,
      criteriaFile: scenario.criteriaFile,
      gherkinScenario: formatScenarioGherkin(scenario),
    };

    try {
      fs.writeFileSync(
        personaPath,
        JSON.stringify(
          { scenario: scenario.name, persona, criteriaPath },
          null,
          2,
        ),
      );
    } catch (e) {
      console.warn(
        `Aviso: não foi possível gravar ${personaPath}: ${e.message}`,
      );
    }

    prepared.push({ scenario, scenarioSlug, persona });
  }
  return prepared;
}

async function chooseTargetNumber({ ask, rl, massaIds, massas }) {
  if (massaIds.length > 1) {
    fatal(
      `Esta bateria mistura as massas ${massaIds.join(", ")}, mas o WhatsApp usa um único número pra bateria inteira. Rode cada massa numa bateria separada (ou selecione só os cenários de uma massa por vez).`,
      rl,
    );
  }
  if (massaIds.length === 1) {
    const { phone } = massas[massaIds[0]];
    console.log(
      paint(
        ansi.dim,
        `  Número de WhatsApp alvo definido pela massa ${massaIds[0]}: ${phone}`,
      ),
    );
    return phone;
  }
  const number = await ask(
    "Número de WhatsApp alvo desta bateria (DDI+DDD+número)",
    process.env.TARGET_NUMBER || "",
  );
  if (!number) fatal("Número de WhatsApp alvo não informado.", rl);
  return number;
}

async function chooseForcedReruns(ask, prepared, previousResults) {
  const reusable = prepared.filter((p) =>
    isFinalVerdict(latestEntry(previousResults[p.scenarioSlug])),
  );
  if (reusable.length === 0) return new Set();

  printSection(
    `${reusable.length} de ${prepared.length} cenário(s) já têm veredito de uma execução anterior desta pasta:`,
  );
  reusable.forEach((p, i) => {
    const last = latestEntry(previousResults[p.scenarioSlug]);
    const tentativas = previousResults[p.scenarioSlug].length;
    const badge = paint(
      last.verdict === "PASSOU" ? ansi.green : ansi.red,
      last.verdict,
    );
    console.log(
      `    ${i + 1}. ${p.scenario.name} — ${badge}${tentativas > 1 ? paint(ansi.dim, ` (${tentativas} tentativas)`) : ""}`,
    );
  });

  const input = await ask(
    "Reexecutar algum desses agora (números da lista acima, ex.: 1,3 ou 1-2) ou manter todos reaproveitados (Enter)? O veredito anterior de cada um fica guardado no histórico, nada é perdido.",
    "",
  );
  if (!input) return new Set();

  const indices = parseSelection(input, reusable.length);
  if (!indices) {
    console.log(
      paint(
        ansi.red,
        "  ❌ Seleção inválida — ignorando, nenhum cenário será reexecutado à força.",
      ),
    );
    return new Set();
  }
  console.log(
    paint(
      ansi.dim,
      `  Reexecutando: ${indices.map((i) => reusable[i].scenario.name).join(", ")}`,
    ),
  );
  return new Set(indices.map((i) => reusable[i].scenarioSlug));
}

function publishReports({ batteryName, batterySlug, batchLogsDir, results }) {
  const timestamp = new Date().toISOString();
  const stamp = timestamp.replace(/[:.]/g, "-");
  const batchReportFile = `bateria-${batterySlug}-${stamp}.html`;
  const batchReportPath = path.join(REPORTS_DIR, batchReportFile);
  const historyIndexFile = `historico-${batterySlug}.html`;
  const historyIndexPath = path.join(REPORTS_DIR, historyIndexFile);

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

  generateBatchHtmlReport(
    batchReportPath,
    { name: batteryName, timestamp, historyIndexFile },
    results,
    priorRuns,
  );
  const allRuns = appendRun(batchLogsDir, currentRun);
  generateBatteryHistoryIndex(historyIndexPath, { name: batteryName }, allRuns);

  printSection("Resumo da bateria");
  results.forEach((r, i) =>
    printProgress(i, results.length, r.scenarioName, r.verdict),
  );
  console.log(divider);
  console.log(
    `  📄  Relatório consolidado: ${path.relative(__dirname, batchReportPath)}`,
  );
  console.log(
    `  🗂️  Histórico de execuções: ${path.relative(__dirname, historyIndexPath)}`,
  );
  openInBrowser(batchReportPath);
}

async function main() {
  const folderArg = process.argv[2];
  if (!folderArg) fatal("Uso: node batch-runner.js <pasta-com-.feature>");

  const folderPath = path.resolve(process.cwd(), folderArg);
  if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
    fatal(`Pasta não encontrada: ${folderPath}`);
  }

  let scenarios;
  try {
    scenarios = parseBatteryFolder(folderPath);
  } catch (e) {
    fatal(e.message);
  }

  const batteryName = path.basename(folderPath);
  const batterySlug = slugify(batteryName);
  const batchLogsDir = path.join(BATCH_LOGS_DIR, batterySlug);
  ensureDir(REPORTS_DIR);
  ensureDir(batchLogsDir);

  console.log(`\n${divider}`);
  console.log(paint(ansi.bold + ansi.magenta, `  🧪  Bateria: ${batteryName}`));
  console.log(divider);
  console.log(`  ${scenarios.length} cenário(s) encontrado(s):`);
  scenarios.forEach((s, i) =>
    console.log(
      `    ${i + 1}. ${s.name} ${paint(ansi.dim, `(${s.criteriaFile})`)}`,
    ),
  );
  console.log(divider);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const ask = createAsk(rl);
  const io = { ask, askMultiline: createAskMultiline(rl) };

  const selectedScenarios = await chooseScenarios(ask, scenarios);

  const autoReview = /^s/i.test(
    await ask(
      "Revisar personalidade e critério de cada cenário automaticamente com uma IA revisora (só te chama se achar um problema)? (s/n)",
      "n",
    ),
  );

  const { massaIds, massas } = loadMassasFor(selectedScenarios, rl);
  const prepared = await prepareScenarios({
    scenarios: selectedScenarios,
    massas,
    autoReview,
    io,
    batchLogsDir,
  });

  printSection("Configuração desta bateria");
  const targetNumber = await chooseTargetNumber({ ask, rl, massaIds, massas });
  prepared.forEach((p) => {
    p.persona.targetNumber = targetNumber;
  });

  const resultsPath = path.join(batchLogsDir, "results.json");
  const previousResults = loadPreviousResults(resultsPath);
  const forcedRerun = await chooseForcedReruns(ask, prepared, previousResults);
  rl.close();

  const abort = createAbortController();
  abort.markExecutionStarted();

  const results = [];
  await runBatteryViaWhatsApp({
    prepared,
    targetNumber,
    results,
    previousResults,
    forcedRerun,
    persistResults: () => saveResults(resultsPath, previousResults),
    batchLogsDir,
    reportsDir: REPORTS_DIR,
    abort,
  });

  publishReports({ batteryName, batterySlug, batchLogsDir, results });
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
