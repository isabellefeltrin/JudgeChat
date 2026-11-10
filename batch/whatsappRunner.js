const path = require("path");
const {
  connectToTarget,
  runConversation,
  evaluateAndReport,
} = require("../session");
const { sleep } = require("../lib/utils");
const { ansi, paint, divider } = require("../terminalUi");
const { printProgress, printScenarioTurn } = require("./progress");
const {
  latestEntry,
  isFinalVerdict,
  appendResult,
  appendErrorPayload,
  buildErrorPayload,
  relativeHref,
} = require("./resultsStore");

const WAIT_BETWEEN_SCENARIOS_MS = 5 * 60 * 1000;

const logStatus = (msg) => console.log(paint(ansi.yellow, msg));

async function tryConnect(targetNumber) {
  try {
    return await connectToTarget(targetNumber, { onStatus: logStatus });
  } catch {
    return null;
  }
}

async function runBatteryViaWhatsApp(ctx) {
  const {
    prepared,
    targetNumber,
    results,
    previousResults,
    forcedRerun,
    persistResults,
    batchLogsDir,
    reportsDir,
    abort,
  } = ctx;

  let target;
  try {
    target = await connectToTarget(targetNumber, { onStatus: logStatus });
  } catch (e) {
    console.error(
      paint(
        ansi.red + ansi.bold,
        `❌ Não foi possível conectar ao WhatsApp — abortando a bateria inteira: ${e.message}`,
      ),
    );
    process.exit(1);
  }

  console.log(`\n${divider}`);
  console.log(
    paint(
      ansi.bold + ansi.green,
      "  ✅  WhatsApp conectado! Rodando a bateria...",
    ),
  );
  console.log(divider);

  function fillRemaining(fromIndex, verdict, reason) {
    for (let j = fromIndex; j < prepared.length; j += 1) {
      const { scenario, scenarioSlug } = prepared[j];
      results.push({
        scenarioName: scenario.name,
        scenarioSlug,
        numero: targetNumber,
        verdict,
        reason,
        reportFile: null,
      });
      printProgress(j, prepared.length, scenario.name, verdict);
    }
  }

  async function runScenario({ scenario, scenarioSlug, persona }, tentativa) {
    const base = {
      scenarioName: scenario.name,
      scenarioSlug,
      numero: targetNumber,
      tentativa,
    };
    const turnLabel = `${scenarioSlug} · ${targetNumber}`;
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
          fatalSignal: Promise.race([target.whenFatal, abort.signal]),
        },
      });
      const { reportPath, evaluationResult } = await evaluateAndReport({
        persona,
        history,
        reportsDir,
        reportSlug: scenarioSlug,
        onStatus: (msg) => console.log(paint(ansi.dim, `    ${msg}`)),
      });
      return {
        ...base,
        verdict: evaluationResult?.verdict || null,
        reason: evaluationResult?.reason || null,
        reportFile: path.basename(reportPath),
      };
    } catch (e) {
      const entry = {
        ...base,
        verdict: abort.isAborted() ? "ABORTADO" : "ERRO_TECNICO",
        reason: e.message,
        reportFile: null,
      };
      if (entry.verdict === "ERRO_TECNICO") {
        const payloadPath = path.join(
          batchLogsDir,
          `${scenarioSlug}.erro-tecnico.json`,
        );
        appendErrorPayload(
          payloadPath,
          buildErrorPayload(e, {
            scenario: scenario.name,
            numero: targetNumber,
            tentativa,
          }),
        );
        entry.errorPayloadFile = relativeHref(reportsDir, payloadPath);
      }
      return entry;
    }
  }

  async function waitBeforeNextScenario() {
    console.log(
      paint(ansi.dim, "  Aguardando 5min antes do próximo cenário..."),
    );
    try {
      await Promise.race([sleep(WAIT_BETWEEN_SCENARIOS_MS), abort.signal]);
    } catch {}
  }

  for (let i = 0; i < prepared.length; i += 1) {
    const item = prepared[i];
    const { scenario, scenarioSlug } = item;

    const last = latestEntry(previousResults[scenarioSlug]);
    if (isFinalVerdict(last) && !forcedRerun.has(scenarioSlug)) {
      const numero = last.numero || targetNumber;
      results.push({
        scenarioName: scenario.name,
        scenarioSlug,
        numero,
        verdict: last.verdict,
        reason: last.reason,
        reportFile: last.reportFile,
      });
      printProgress(
        i,
        prepared.length,
        scenario.name,
        last.verdict,
        `(reaproveitado de execução anterior · ${numero})`,
      );
      continue;
    }

    const tentativa = (previousResults[scenarioSlug]?.length || 0) + 1;
    printProgress(
      i,
      prepared.length,
      scenario.name,
      "RODANDO",
      `(número: ${targetNumber}${tentativa > 1 ? ` · tentativa ${tentativa}` : ""})`,
    );

    const verdictEntry = await runScenario(item, tentativa);
    results.push(verdictEntry);

    if (isFinalVerdict(verdictEntry)) {
      appendResult(previousResults, scenarioSlug, verdictEntry);
      persistResults();
    }
    printProgress(i, prepared.length, scenario.name, verdictEntry.verdict);

    if (verdictEntry.verdict === "ABORTADO") {
      fillRemaining(
        i + 1,
        "ABORTADO",
        "bateria abortada pela usuária antes deste cenário rodar",
      );
      break;
    }

    if (verdictEntry.verdict === "ERRO_TECNICO") {
      console.log(paint(ansi.yellow, "  Tentando reconectar ao WhatsApp..."));
      const reconnected = await tryConnect(targetNumber);
      if (!reconnected) {
        fillRemaining(
          i + 1,
          "ERRO_TECNICO",
          "WhatsApp indisponível — bateria interrompida",
        );
        break;
      }
      target = reconnected;
      continue;
    }

    if (i < prepared.length - 1) {
      await waitBeforeNextScenario();
      if (abort.isAborted()) {
        fillRemaining(
          i + 1,
          "ABORTADO",
          "bateria abortada pela usuária durante a espera entre cenários",
        );
        break;
      }
    }
  }

  await target.disconnect();
}

module.exports = { runBatteryViaWhatsApp };
