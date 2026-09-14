const fs = require('fs');

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

// Contagem de vereditos de uma lista de resultados — usada tanto pro
// cabeçalho do relatório consolidado de uma bateria quanto pros badges da
// tira de execuções e do índice de histórico (ver generateBatteryHistoryIndex
// e batch-runner.js, que grava essa mesma contagem em runs.json pra não
// precisar reabrir/recalcular a partir dos relatórios HTML depois).
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

// dd/mm/yyyy e HH:mm no fuso local de quem gera o relatório — mesmo padrão
// pt-BR já usado em "gerado em" (generatedAt), só quebrado em partes pra
// caber nos chips compactos da tira de execuções e da linha do tempo.
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

// CSS compartilhado entre o relatório de uma conversa (generateHtmlReport) e
// o relatório consolidado de uma bateria (generateBatchHtmlReport), pra não
// duplicar o tema "terminal cyberpunk" nos dois templates.
function sharedStyles() {
  return `
  :root {
    --bg: #060812;
    --surface: #0d1120;
    --surface-alt: #10162b;
    --line: #202a4a;
    --cyan: #2fd8ff;
    --magenta: #ff4fb0;
    --amber: #ffcf5c;
    --text: #e7ecf9;
    --muted: #6b7699;
    --mono: "JetBrains Mono", "Cascadia Code", "SF Mono", Consolas, ui-monospace, monospace;
    --sans: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }

  * { box-sizing: border-box; }
  html, body { margin: 0; }

  body {
    min-height: 100vh;
    background: var(--bg);
    background-image:
      radial-gradient(ellipse 70% 40% at 50% 0%, rgba(47, 216, 255, 0.12), transparent 70%),
      repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.02) 0px, rgba(255, 255, 255, 0.02) 1px, transparent 1px, transparent 3px);
    color: var(--text);
    font-family: var(--sans);
  }

  [tabindex]:focus-visible { outline: 2px solid var(--cyan); outline-offset: 2px; }

  .header {
    padding: 26px clamp(16px, 5vw, 48px) 20px;
    border-bottom: 1px solid var(--line);
  }
  .eyebrow {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--amber);
    margin: 0 0 8px;
  }
  .title {
    display: inline-block;
    font-family: var(--mono);
    font-size: clamp(22px, 3.6vw, 32px);
    font-weight: 700;
    letter-spacing: 0.01em;
    color: var(--text);
    text-shadow: 0 0 16px rgba(47, 216, 255, 0.6), 0 0 40px rgba(47, 216, 255, 0.25);
    margin: 0 0 6px;
    text-wrap: balance;
    border-bottom: 2px solid var(--cyan);
    box-shadow: 0 8px 12px -8px rgba(47, 216, 255, 0.7);
    padding-bottom: 4px;
  }
  .brief {
    font-size: 13.5px;
    color: var(--muted);
    max-width: 60ch;
    line-height: 1.5;
    margin: 8px 0 14px;
  }
  .stats {
    display: flex;
    gap: 20px;
    font-family: var(--mono);
    font-size: 11.5px;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
  .stats strong { color: var(--text); font-weight: 600; }

  .chat {
    max-width: 1080px;
    margin: 0 auto;
    padding: clamp(18px, 4vw, 32px) clamp(16px, 4vw, 40px) 48px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .row { display: flex; align-items: flex-end; gap: 8px; }
  .row.cliente { justify-content: flex-end; }
  .row.agente { justify-content: flex-start; }

  .avatar {
    flex: none;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--mono);
    font-size: 11px;
    font-weight: 700;
    background: var(--surface);
    clip-path: polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%);
  }
  .avatar.cliente { color: var(--cyan); box-shadow: inset 0 0 0 1px rgba(47, 216, 255, 0.6), 0 0 10px rgba(47, 216, 255, 0.45); }
  .avatar.agente { color: var(--magenta); box-shadow: inset 0 0 0 1px rgba(255, 79, 176, 0.6), 0 0 10px rgba(255, 79, 176, 0.45); }

  .bubble {
    max-width: 82%;
    min-width: 0;
    padding: 9px 14px;
    background: var(--surface);
  }
  .bubble.cliente {
    background: var(--surface);
    box-shadow: inset 0 0 0 1px rgba(47, 216, 255, 0.45), 0 0 16px rgba(47, 216, 255, 0.15);
    clip-path: polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%);
  }
  .bubble.agente {
    background: var(--surface-alt);
    box-shadow: inset 0 0 0 1px rgba(255, 79, 176, 0.45), 0 0 16px rgba(255, 79, 176, 0.15);
    clip-path: polygon(0 0, 100% 0, 100% 100%, 8px 100%, 0 calc(100% - 8px));
  }

  .meta { display: flex; align-items: baseline; gap: 8px; margin: 0 0 3px; }
  .meta .author {
    font-family: var(--mono);
    font-size: 10.5px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    font-weight: 700;
  }
  .cliente .author { color: var(--cyan); }
  .agente .author { color: var(--magenta); }
  .meta .tag { font-family: var(--mono); font-size: 10px; color: var(--muted); font-variant-numeric: tabular-nums; }

  .text {
    font-size: 14px;
    line-height: 1.4;
    color: var(--text);
    word-break: break-word;
  }

  .empty {
    text-align: center;
    font-family: var(--mono);
    color: var(--muted);
    padding: 56px 16px;
    border: 1px dashed var(--line);
  }

  .evaluation {
    margin-top: 16px;
    padding: 12px 16px;
    max-width: 60ch;
    background: var(--surface);
    border-left: 3px solid var(--muted);
  }
  .evaluation.good { border-left-color: #4ade80; }
  .evaluation.bad { border-left-color: #f87171; }
  .eval-eyebrow {
    font-family: var(--mono);
    font-size: 10.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    margin: 0 0 4px;
  }
  .eval-score {
    font-family: var(--mono);
    font-size: 16px;
    font-weight: 700;
    margin: 0 0 4px;
  }
  .good .eval-score { color: #4ade80; }
  .bad .eval-score { color: #f87171; }
  .unknown .eval-score { color: var(--muted); }
  .eval-reason {
    font-size: 13px;
    color: var(--text);
    line-height: 1.4;
    margin: 0;
  }

  .gherkin { margin: 14px 0 0; max-width: 70ch; }
  .gherkin-summary {
    cursor: pointer;
    font-family: var(--mono);
    font-size: 10.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    padding: 4px 0;
  }
  .gherkin-summary:hover { color: var(--cyan); }
  .gherkin-text {
    margin: 8px 0 0;
    padding: 12px 14px;
    background: var(--surface);
    border-left: 3px solid var(--cyan);
    font-family: var(--mono);
    font-size: 12.5px;
    line-height: 1.5;
    color: var(--text);
    white-space: pre-wrap;
    word-break: break-word;
  }

  .batch { max-width: 1080px; margin: 0 auto; padding: clamp(18px, 4vw, 32px) clamp(16px, 4vw, 40px) 48px; }
  .batch table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
  .batch th, .batch td { text-align: left; padding: 10px 14px; border-bottom: 1px solid var(--line); vertical-align: top; }
  .batch th { font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
  .batch td.reason { color: var(--text); max-width: 44ch; }
  .batch td.numero { font-family: var(--mono); font-size: 12px; color: var(--muted); white-space: nowrap; }
  .batch td a { color: var(--cyan); text-decoration: none; }
  .batch td a:hover { text-decoration: underline; }
  .badge {
    display: inline-block;
    font-family: var(--mono);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.05em;
    padding: 3px 10px;
    border-radius: 2px;
  }
  .badge.good { color: #4ade80; box-shadow: inset 0 0 0 1px rgba(74, 222, 128, 0.5); }
  .badge.bad { color: #f87171; box-shadow: inset 0 0 0 1px rgba(248, 113, 113, 0.5); }
  .badge.unknown { color: var(--muted); box-shadow: inset 0 0 0 1px rgba(107, 118, 153, 0.5); }
  .badge.erro { color: var(--amber); box-shadow: inset 0 0 0 1px rgba(255, 207, 92, 0.5); }
  .badge.sm { font-size: 10px; padding: 2px 7px; }`;
}

// CSS extra, só usado pelo relatório consolidado de bateria (tira de
// execuções + linha do tempo por cenário) e pelo índice de histórico — fica
// separado de sharedStyles() pra não inchar o relatório individual de
// conversa (generateHtmlReport), que nunca usa nada disto.
function historyStyles() {
  return `
  .run-strip-wrap { max-width: 1080px; margin: 0 auto; padding: 4px clamp(16px, 4vw, 40px) 0; }
  .strip-row { display: flex; align-items: center; gap: 10px; }
  .run-strip { flex: 1; display: flex; gap: 6px; overflow-x: auto; padding: 2px 2px 10px; }
  .strip-chip {
    flex: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 7px 12px;
    background: var(--surface-alt);
    border: 1px solid var(--line);
    text-decoration: none;
  }
  .strip-chip .strip-date { font-family: var(--mono); font-size: 10.5px; color: var(--text); font-variant-numeric: tabular-nums; }
  .strip-chip .strip-counts { font-family: var(--mono); font-size: 9.5px; color: var(--muted); }
  .strip-chip.is-current { border-color: var(--amber); background: rgba(255, 207, 92, 0.08); cursor: default; }
  .history-link { font-family: var(--mono); font-size: 11px; color: var(--cyan); text-decoration: none; white-space: nowrap; margin-left: auto; padding-left: 12px; }
  .history-link:hover { text-decoration: underline; }

  .scenario-card { border-bottom: 1px solid var(--line); }
  .scenario-card:last-child { border-bottom: none; }
  .scenario-card summary {
    cursor: pointer;
    list-style: none;
    display: grid;
    grid-template-columns: 1fr auto auto;
    align-items: start;
    gap: 14px;
    padding: 12px 4px;
  }
  .scenario-card summary::-webkit-details-marker { display: none; }
  .scenario-card summary::before {
    content: "▸";
    font-family: var(--mono);
    color: var(--muted);
    margin-right: 8px;
    display: inline-block;
  }
  .scenario-card[open] summary::before { transform: rotate(90deg); color: var(--magenta); }
  .scen-main { min-width: 0; }
  .scen-name { font-size: 13.5px; color: var(--text); font-weight: 600; }
  .scen-reason { font-size: 12.5px; color: var(--muted); margin-top: 3px; line-height: 1.4; max-width: 62ch; }
  .scen-numero { font-family: var(--mono); font-size: 11px; color: var(--muted); margin-top: 4px; }
  .scen-link { font-family: var(--mono); font-size: 12px; color: var(--cyan); text-decoration: none; white-space: nowrap; align-self: center; }
  .scen-link:hover { text-decoration: underline; }
  .timeline { display: flex; flex-wrap: wrap; gap: 8px; padding: 4px 4px 16px 26px; }
  .tl-chip {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
    padding: 6px 10px;
    background: var(--surface-alt);
    border: 1px solid var(--line);
    min-width: 78px;
    text-decoration: none;
  }
  .tl-chip.is-latest { border-color: var(--magenta); }
  .tl-date { font-family: var(--mono); font-size: 10px; color: var(--muted); font-variant-numeric: tabular-nums; }

  .run-list { display: flex; flex-direction: column; }
  .run-card {
    display: grid;
    grid-template-columns: 20px 150px 1fr auto;
    align-items: center;
    gap: 16px;
    padding: 13px 4px;
    border-bottom: 1px solid var(--line);
  }
  .run-card:last-child { border-bottom: none; }
  .run-card input[type="checkbox"] { accent-color: var(--cyan); width: 15px; height: 15px; }
  .run-when { display: flex; flex-direction: column; gap: 1px; }
  .run-date { font-family: var(--mono); font-size: 13px; color: var(--text); font-variant-numeric: tabular-nums; }
  .run-time { font-family: var(--mono); font-size: 11px; color: var(--muted); font-variant-numeric: tabular-nums; }
  .run-stats { display: flex; gap: 8px; flex-wrap: wrap; }
  .run-link { font-family: var(--mono); font-size: 12px; color: var(--cyan); text-decoration: none; white-space: nowrap; }
  .run-link:hover { text-decoration: underline; }
  .compare-bar { display: flex; align-items: center; gap: 12px; margin-top: 18px; padding-top: 16px; border-top: 1px dashed var(--line); }
  .compare-bar span { font-size: 12px; color: var(--muted); }
  .compare-btn {
    font-family: var(--mono);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.03em;
    color: var(--bg);
    background: var(--cyan);
    border: none;
    padding: 8px 16px;
    cursor: pointer;
  }
  .compare-btn:disabled { background: var(--surface-alt); color: var(--muted); cursor: not-allowed; }
  .compare-table-wrap { margin-top: 24px; }
  .compare-caption { font-size: 12.5px; color: var(--muted); margin: 0 0 12px; }
  .compare-table-wrap table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .compare-table-wrap th, .compare-table-wrap td { text-align: left; padding: 9px 12px; border-bottom: 1px solid var(--line); }
  .compare-table-wrap th { font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
  .compare-table-wrap td a { color: var(--cyan); text-decoration: none; font-family: var(--mono); font-size: 12px; }
  .compare-table-wrap tr.diff-row td:first-child { border-left: 3px solid var(--amber); padding-left: 9px; }`;
}

function generateHtmlReport(outputPath, persona, history, evaluation) {
  const messages = history.map((turn, i) => renderMessage(turn, persona.name, i)).join('');
  const generatedAt = new Date().toLocaleString('pt-BR');
  const count = String(history.length).padStart(3, '0');
  const evaluationHtml = renderEvaluation(evaluation);
  const gherkinHtml = renderGherkinScenario(persona.gherkinScenario);
  // targetNumber é o número/telefone (WhatsApp real ou fictício do modo
  // Debug API) usado NESTA conversa — ausente só em execuções muito antigas
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

// small=true usa a variante compacta (.badge.sm) — chips de linha do tempo e
// cartões do índice de histórico, onde o badge de tamanho normal não cabe.
function verdictBadge(verdict, small) {
  const sizeClass = small ? 'badge sm' : 'badge';
  if (SPECIAL_VERDICT_LABELS[verdict]) {
    return `<span class="${sizeClass} erro">${escapeHtml(SPECIAL_VERDICT_LABELS[verdict])}</span>`;
  }
  const cls = verdictClass(verdict);
  const label = verdict || 'INDETERMINADO';
  return `<span class="${sizeClass} ${cls}">${escapeHtml(label)}</span>`;
}

// Link de um resultado (individual, de um chip de linha do tempo, ou de uma
// célula da tabela de comparação) — ver conversa se reportFile existe,
// senão a payload técnica de ERRO_TECNICO, senão nada.
function resultHref(entry) {
  if (!entry) return null;
  if (entry.reportFile) return `./${entry.reportFile}`;
  if (entry.errorPayloadFile) return entry.errorPayloadFile;
  return null;
}

// Tira de chips no topo do relatório consolidado, uma por execução já
// rodada desta bateria (mais antiga primeiro, a atual sempre por último e
// sem link — "você está aqui"), mais um link pro índice completo
// (generateBatteryHistoryIndex). priorRuns vem de batteryHistory.js
// (runs.json), current é só { timestamp, counts } da execução atual.
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

// Chips da linha do tempo de UM cenário — uma por execução anterior em que
// ele apareceu (nem toda execução roda todo cenário: um reaproveitado de
// results.json fica de fora se essa execução específica não tiver sido
// gravada em runs.json ainda), mais o resultado atual por último.
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

// Uma linha do relatório consolidado = um <details> por cenário: o cabeçalho
// (summary) mostra exatamente o que a tabela de sempre mostrava, e o corpo
// esconde a linha do tempo (só some quando expandida, igual ao
// <details class="gherkin"> do relatório individual — mesmo idioma visual).
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
// numero é o telefone/instância usado NAQUELE cenário — o número de WhatsApp
// da bateria inteira no modo WhatsApp, ou o telefone fictício individual
// (ou o real de uma massa de teste) no modo Debug API.
// reportFile é o nome do arquivo HTML individual, salvo na MESMA pasta reports/
// (link relativo) — null quando o cenário não chegou a gerar relatório.
// errorPayloadFile (só em ERRO_TECNICO) é o caminho relativo a reports/ do
// JSON com a payload técnica completa da falha (request/response HTTP,
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

// allRuns: TODAS as execuções desta bateria, já incluindo a atual (vem de
// batteryHistory.js logo depois do appendRun), em ordem cronológica
// (mais antiga primeiro) — esta função inverte pra mostrar mais recente
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
      // trava em no máximo 2 marcadas — desmarca a outra que já estava
      // selecionada em vez de deixar acumular.
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
