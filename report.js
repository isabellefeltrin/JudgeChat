const fs = require('fs');
const path = require('path');

const escapeHtml = (text) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function initial(name) {
  const trimmed = (name || '?').trim();
  return trimmed ? trimmed[0].toUpperCase() : '?';
}

function renderMessage(turn, personaName, index) {
  const isCliente = turn.role === 'cliente';
  const author = isCliente ? personaName : 'Agentes de IA';
  const side = isCliente ? 'cliente' : 'agente';
  const avatarLabel = isCliente ? initial(author) : 'IA';
  const body = escapeHtml(turn.text).replace(/\n/g, '<br>');
  const tag = String(index + 1).padStart(3, '0');
  const avatar = `<div class="avatar ${side}">${escapeHtml(avatarLabel)}</div>`;
  const bubble = `<div class="bubble ${side}"><div class="meta"><span class="author">${escapeHtml(author)}</span><span class="tag">#${tag}</span></div><div class="text">${body}</div></div>`;
  return `<div class="row ${side}">${isCliente ? bubble + avatar : avatar + bubble}</div>`;
}

// verdict: 'PASSOU' | 'FALHOU' | null (indeterminado — o juiz não seguiu o
// formato pedido). 'ERRO_TECNICO' (usado só no relatório consolidado da
// bateria, quando o cenário nem chegou a ser avaliado) cai em 'unknown'.
function verdictClass(verdict) {
  if (verdict === 'PASSOU') return 'good';
  if (verdict === 'FALHOU') return 'bad';
  return 'unknown';
}

function computeVerdictCounts(results) {
  return results.reduce(
    (acc, r) => {
      const key = r.verdict === 'PASSOU' ? 'passou' : r.verdict === 'FALHOU' ? 'falhou' : SPECIAL_VERDICT_LABELS[r.verdict] ? 'erro' : 'indeterminado';
      acc[key] += 1;
      return acc;
    },
    { passou: 0, falhou: 0, erro: 0, indeterminado: 0 },
  );
}

function formatRunWhen(iso) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('pt-BR'),
    time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  };
}

// persona.gherkinScenario só existe pra conversas geradas por uma bateria
// (batch-runner.js) — ausente no modo interativo (cli.js), onde não há
// Cenário Gherkin nenhum por trás da conversa. <details> fica recolhido por
// padrão de propósito: é informação de rastreabilidade, não o foco do
// relatório (a conversa em si).
function renderGherkinScenario(gherkinScenario) {
  if (!gherkinScenario) return '';
  return `<details class="gherkin"><summary class="gherkin-summary">cenário testado (Gherkin)</summary><pre class="gherkin-text">${escapeHtml(gherkinScenario)}</pre></details>`;
}

function renderEvaluation(evaluation) {
  if (!evaluation) return '';
  const cls = verdictClass(evaluation.verdict);
  const label = evaluation.verdict || 'INDETERMINADO';
  const reason = escapeHtml(evaluation.reason || '(sem justificativa)');
  return `<div class="evaluation ${cls}"><p class="eval-eyebrow">avaliação automática</p><p class="eval-score">${escapeHtml(label)}</p><p class="eval-reason">${reason}</p></div>`;
}

const readStyles = (file) => fs.readFileSync(path.join(__dirname, 'report-styles', file), 'utf-8');
const sharedStyles = () => readStyles('shared.css');
const historyStyles = () => readStyles('history.css');
function generateHtmlReport(outputPath, persona, history, evaluation) {
  const messages = history.map((turn, i) => renderMessage(turn, persona.name, i)).join('');
  const generatedAt = new Date().toLocaleString('pt-BR');
  const count = String(history.length).padStart(3, '0');
  const evaluationHtml = renderEvaluation(evaluation);
  const gherkinHtml = renderGherkinScenario(persona.gherkinScenario);
  // targetNumber é o número de WhatsApp usado NESTA conversa — ausente só em execuções muito antigas
  // de antes desse campo existir.
  const numeroStat = persona.targetNumber ? `<span>número <strong>${escapeHtml(persona.targetNumber)}</strong></span>` : '';

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${escapeHtml(persona.name)} :: transcript_log</title>
<style>${sharedStyles()}</style>
</head>
<body><div class="header"><p class="eyebrow">transcript_log // sessão encerrada</p><h1 class="title">${escapeHtml(persona.name)}</h1><p class="brief">${escapeHtml(persona.personality || 'sem personalidade definida')}</p><div class="stats"><span>msgs <strong>${count}</strong></span>${numeroStat}<span>gerado <strong>${escapeHtml(generatedAt)}</strong></span></div>${gherkinHtml}${evaluationHtml}</div><div class="chat">${history.length ? messages : '<div class="empty">// nenhuma mensagem registrada nesta sessão</div>'}</div></body>
</html>
`;

  fs.writeFileSync(outputPath, html);
  return outputPath;
}

// verdict aqui também aceita 'ERRO_TECNICO' (falha técnica esgotou as
// tentativas de retry) e 'ABORTADO' (bateria interrompida pela usuária,
// Ctrl+C) — cenários que nem chegaram a ser avaliados, que caem visualmente
// na cor de alerta (âmbar), diferente de PASSOU/FALHOU/indeterminado.
const SPECIAL_VERDICT_LABELS = { ERRO_TECNICO: 'ERRO TÉCNICO', ABORTADO: 'ABORTADO' };

function verdictBadge(verdict, small) {
  const sizeClass = small ? 'badge sm' : 'badge';
  if (SPECIAL_VERDICT_LABELS[verdict]) {
    return `<span class="${sizeClass} erro">${escapeHtml(SPECIAL_VERDICT_LABELS[verdict])}</span>`;
  }
  const cls = verdictClass(verdict);
  const label = verdict || 'INDETERMINADO';
  return `<span class="${sizeClass} ${cls}">${escapeHtml(label)}</span>`;
}

function resultHref(entry) {
  if (!entry) return null;
  if (entry.reportFile) return `./${entry.reportFile}`;
  if (entry.errorPayloadFile) return entry.errorPayloadFile;
  return null;
}

function renderRunStrip(priorRuns, current, historyIndexFile) {
  const total = priorRuns.length + 1;
  const chipHtml = (run, isCurrent) => {
    const when = formatRunWhen(run.timestamp);
    const c = run.counts || { passou: 0, falhou: 0, erro: 0, indeterminado: 0 };
    const countsText = `${c.passou}✓ ${c.falhou}✗${c.erro ? ` ${c.erro}⚠` : ''}`;
    if (isCurrent) {
      return `<span class="strip-chip is-current" aria-current="page"><span class="strip-date">${escapeHtml(when.date)} · atual</span><span class="strip-counts">${escapeHtml(countsText)}</span></span>`;
    }
    return `<a class="strip-chip" href="./${escapeHtml(run.reportFile)}"><span class="strip-date">${escapeHtml(when.date)}</span><span class="strip-counts">${escapeHtml(countsText)}</span></a>`;
  };
  const chips = priorRuns.map((run) => chipHtml(run, false)).join('') + chipHtml(current, true);
  const historyLink = historyIndexFile
    ? `<a class="history-link" href="./${escapeHtml(historyIndexFile)}">ver histórico completo (${total} execuç${total === 1 ? 'ão' : 'ões'}) →</a>`
    : '';
  return `<div class="run-strip-wrap"><div class="strip-row"><div class="run-strip">${chips}</div>${historyLink}</div></div>`;
}

function renderScenarioTimeline(scenarioSlug, priorRuns, currentResult) {
  const chips = [];
  for (const run of priorRuns) {
    const entry = (run.scenarios || []).find((s) => s.scenarioSlug === scenarioSlug);
    if (!entry) continue;
    const href = resultHref(entry);
    const dateLabel = formatRunWhen(run.timestamp).date;
    const inner = `<span class="tl-date">${escapeHtml(dateLabel)}</span>${verdictBadge(entry.verdict, true)}`;
    chips.push(href ? `<a class="tl-chip" href="${escapeHtml(href)}">${inner}</a>` : `<div class="tl-chip">${inner}</div>`);
  }
  const currentInner = `<span class="tl-date">atual</span>${verdictBadge(currentResult.verdict, true)}`;
  chips.push(`<div class="tl-chip is-latest">${currentInner}</div>`);
  return chips.join('');
}

function renderScenarioRow(r, priorRuns) {
  const href = resultHref(r);
  const linkText = r.reportFile ? 'ver conversa →' : r.errorPayloadFile ? 'ver payload técnica →' : null;
  const linkHtml = href && linkText ? `<a href="${escapeHtml(href)}">${escapeHtml(linkText)}</a>` : '—';
  const timelineHtml = r.scenarioSlug ? renderScenarioTimeline(r.scenarioSlug, priorRuns, r) : '';
  return `<details class="scenario-card"><summary><div class="scen-main"><div class="scen-name">${escapeHtml(r.scenarioName)}</div>${
    r.reason ? `<div class="scen-reason">${escapeHtml(r.reason)}</div>` : ''
  }${r.numero ? `<div class="scen-numero">número/instância: ${escapeHtml(r.numero)}</div>` : ''}</div>${verdictBadge(r.verdict)}<span class="scen-link">${linkHtml}</span></summary><div class="timeline">${timelineHtml}</div></details>`;
}

// results: [{ scenarioName, scenarioSlug, numero, verdict: 'PASSOU'|'FALHOU'|null|'ERRO_TECNICO'|'ABORTADO', reason, reportFile, errorPayloadFile }]
// numero é o número de WhatsApp usado NAQUELE cenário (o da bateria inteira).
// reportFile é o nome do arquivo HTML individual, salvo na MESMA pasta reports/
// (link relativo) — null quando o cenário não chegou a gerar relatório.
// errorPayloadFile (só em ERRO_TECNICO) é o caminho relativo a reports/ do
// JSON com a payload técnica completa da falha (
// histórico parcial da conversa) — ver batch-runner.js (appendErrorPayload).
// batteryMeta: { name, timestamp (ISO desta execução), historyIndexFile
// (nome do arquivo gerado por generateBatteryHistoryIndex, opcional) }.
// priorRuns: execuções ANTERIORES desta bateria (batteryHistory.js,
// runs.json) — [] na primeira vez que ela roda. Alimenta a tira do topo e a
// linha do tempo de cada cenário; NUNCA inclui a execução atual (essa é
// `results`, ainda não gravada em runs.json quando o relatório é gerado).
function generateBatchHtmlReport(outputPath, batteryMeta, results, priorRuns = []) {
  const generatedAt = new Date().toLocaleString('pt-BR');
  const counts = computeVerdictCounts(results);
  const currentRunForStrip = { timestamp: batteryMeta.timestamp || new Date().toISOString(), counts };

  const stripHtml = renderRunStrip(priorRuns, currentRunForStrip, batteryMeta.historyIndexFile);
  const rows = results.map((r) => renderScenarioRow(r, priorRuns)).join('');

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${escapeHtml(batteryMeta.name)} :: bateria</title>
<style>${sharedStyles()}${historyStyles()}</style>
</head>
<body><div class="header"><p class="eyebrow">bateria de testes // relatório consolidado</p><h1 class="title">${escapeHtml(batteryMeta.name)}</h1><div class="stats"><span>gerado <strong>${escapeHtml(generatedAt)}</strong></span><span>passou <strong>${counts.passou}</strong></span><span>falhou <strong>${counts.falhou}</strong></span><span>erro técnico <strong>${counts.erro}</strong></span>${counts.indeterminado ? `<span>indeterminado <strong>${counts.indeterminado}</strong></span>` : ''}</div></div>${stripHtml}<div class="batch">${
    rows || '<div class="empty">// nenhum cenário rodado nesta bateria</div>'
  }</div></body>
</html>
`;

  fs.writeFileSync(outputPath, html);
  return outputPath;
}

// primeiro na tela. Cada run: { timestamp, reportFile, counts, scenarios:
// [{ scenarioSlug, scenarioName, verdict, reason, reportFile,
// errorPayloadFile, numero }] }.
//
// A comparação entre duas execuções roda inteiramente no navegador (os dados
// de `allRuns` vão embutidos na página) — não existe backend pra gerar uma
// página nova por par escolhido, então a tabela de comparação é montada via
// JS a partir do que já está na própria página.
function generateBatteryHistoryIndex(outputPath, batteryMeta, allRuns) {
  const generatedAt = new Date().toLocaleString('pt-BR');
  const displayRuns = [...allRuns].reverse(); // mais recente primeiro

  const runCardsHtml = displayRuns
    .map((run, i) => {
      const when = formatRunWhen(run.timestamp);
      const c = run.counts || { passou: 0, falhou: 0, erro: 0, indeterminado: 0 };
      const badges = [
        c.passou ? `<span class="badge sm good">passou ${c.passou}</span>` : '',
        c.falhou ? `<span class="badge sm bad">falhou ${c.falhou}</span>` : '',
        c.erro ? `<span class="badge sm erro">erro ${c.erro}</span>` : '',
        c.indeterminado ? `<span class="badge sm unknown">indeterminado ${c.indeterminado}</span>` : '',
      ].join('');
      return `<div class="run-card"><input type="checkbox" class="run-select" value="${i}" aria-label="selecionar execução de ${escapeHtml(when.date)} ${escapeHtml(
        when.time,
      )} para comparar"><div class="run-when"><span class="run-date">${escapeHtml(when.date)}</span><span class="run-time">${escapeHtml(
        when.time,
      )}</span></div><div class="run-stats">${badges}</div><a class="run-link" href="./${escapeHtml(run.reportFile)}">abrir relatório →</a></div>`;
    })
    .join('');

  // </script> dentro de um motivo/nome de cenário quebraria a página — a
  // troca abaixo evita fechar a tag sem alterar o JSON.parse do outro lado.
  const runsForJs = JSON.stringify(displayRuns).replace(/</g, '\\u003c');

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${escapeHtml(batteryMeta.name)} :: histórico</title>
<style>${sharedStyles()}${historyStyles()}</style>
</head>
<body>
<div class="header"><p class="eyebrow">bateria de testes // histórico de execuções</p><h1 class="title">${escapeHtml(batteryMeta.name)}</h1><p class="brief">Toda execução já rodada desta bateria, mais recente primeiro. Marque exatamente 2 pra comparar os vereditos lado a lado.</p><div class="stats"><span>execuções <strong>${displayRuns.length}</strong></span><span>gerado <strong>${escapeHtml(generatedAt)}</strong></span></div></div>
<div class="batch">
<div class="run-list">${runCardsHtml || '<div class="empty">// nenhuma execução registrada ainda</div>'}</div>
<div class="compare-bar"><button id="compare-btn" class="compare-btn" type="button" disabled>comparar 2 execuções selecionadas →</button><span id="compare-hint">selecione exatamente 2 execuções acima</span></div>
<div id="compare-result"></div>
</div>
<script>
(function () {
  var RUNS = ${runsForJs};
  var checkboxes = Array.prototype.slice.call(document.querySelectorAll('.run-select'));
  var btn = document.getElementById('compare-btn');
  var hint = document.getElementById('compare-hint');
  var resultEl = document.getElementById('compare-result');
  var SPECIAL = { ERRO_TECNICO: 'ERRO TÉCNICO', ABORTADO: 'ABORTADO' };

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function verdictBadgeHtml(verdict) {
    var cls = verdict === 'PASSOU' ? 'good' : verdict === 'FALHOU' ? 'bad' : SPECIAL[verdict] ? 'erro' : 'unknown';
    var label = SPECIAL[verdict] || verdict || 'INDETERMINADO';
    return '<span class="badge sm ' + cls + '">' + escapeHtml(label) + '</span>';
  }

  function formatWhen(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function cellLink(entry) {
    if (!entry) return '—';
    if (entry.reportFile) return '<a href="./' + escapeHtml(entry.reportFile) + '">ver →</a>';
    if (entry.errorPayloadFile) return '<a href="' + escapeHtml(entry.errorPayloadFile) + '">payload →</a>';
    return '—';
  }

  function selectedIndices() {
    return checkboxes.filter(function (cb) { return cb.checked; }).map(function (cb) { return Number(cb.value); });
  }

  function updateState() {
    var sel = selectedIndices();
    btn.disabled = sel.length !== 2;
    hint.textContent = sel.length === 2 ? 'pronto — clique em comparar' : sel.length === 0 ? 'selecione exatamente 2 execuções acima' : 'selecionada ' + sel.length + ' de 2';
  }

  checkboxes.forEach(function (cb) {
    cb.addEventListener('change', function () {
      if (selectedIndices().length > 2) {
        var toUncheck = checkboxes.find(function (other) { return other !== cb && other.checked; });
        if (toUncheck) toUncheck.checked = false;
      }
      updateState();
    });
  });

  btn.addEventListener('click', function () {
    var sel = selectedIndices();
    if (sel.length !== 2) return;
    // displayRuns (e portanto RUNS) vem mais recente primeiro — o menor
    // índice é sempre o mais novo dos dois selecionados.
    var ordered = sel[0] < sel[1] ? sel : [sel[1], sel[0]];
    var runNewer = RUNS[ordered[0]];
    var runOlder = RUNS[ordered[1]];

    var bySlugOlder = {};
    (runOlder.scenarios || []).forEach(function (s) { bySlugOlder[s.scenarioSlug] = s; });
    var bySlugNewer = {};
    (runNewer.scenarios || []).forEach(function (s) { bySlugNewer[s.scenarioSlug] = s; });
    var slugs = Object.keys(bySlugOlder).concat(Object.keys(bySlugNewer)).filter(function (v, i, arr) { return arr.indexOf(v) === i; }).sort();

    var rows = slugs.map(function (slug) {
      var a = bySlugOlder[slug];
      var b = bySlugNewer[slug];
      var changed = a && b && a.verdict !== b.verdict;
      var name = (a || b).scenarioName;
      return '<tr class="' + (changed ? 'diff-row' : '') + '"><td>' + escapeHtml(name) + '</td>' +
        '<td>' + (a ? verdictBadgeHtml(a.verdict) : '—') + '</td><td>' + cellLink(a) + '</td>' +
        '<td>' + (b ? verdictBadgeHtml(b.verdict) : '—') + '</td><td>' + cellLink(b) + '</td></tr>';
    }).join('');

    resultEl.innerHTML =
      '<div class="compare-table-wrap"><p class="compare-caption">comparando <strong>' + escapeHtml(formatWhen(runOlder.timestamp)) +
      '</strong> com <strong>' + escapeHtml(formatWhen(runNewer.timestamp)) + '</strong> — linhas marcadas mudaram de veredito</p>' +
      '<table><thead><tr><th>Cenário</th><th>' + escapeHtml(formatWhen(runOlder.timestamp)) + '</th><th></th><th>' +
      escapeHtml(formatWhen(runNewer.timestamp)) + '</th><th></th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="5"><div class="empty">// nenhum cenário em comum</div></td></tr>') +
      '</tbody></table></div>';
    resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  updateState();
})();
</script>
</body>
</html>
`;

  fs.writeFileSync(outputPath, html);
  return outputPath;
}

module.exports = { generateHtmlReport, generateBatchHtmlReport, generateBatteryHistoryIndex, computeVerdictCounts };
