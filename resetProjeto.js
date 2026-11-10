#!/usr/bin/env node
// Zera o conteúdo de teste do projeto (features, critérios gerados, personas,
// logs e reports) pra recomeçar do zero a partir de um novo PRD, sem apagar
// scripts, config nem os critérios manuais reutilizáveis.
//
// Uso:
//   node resetProjeto.js            → mostra o que seria apagado e pede confirmação (s/n)
//   node resetProjeto.js --yes      → apaga sem perguntar (uso em script/CI)
//   node resetProjeto.js --dry-run  → só lista o que seria apagado, não apaga nada
process.noDeprecation = true;
const fs = require('fs');
const path = require('path');
const readline = require('readline/promises');

const { ansi, paint, divider, createAsk } = require('./terminalUi');

const ROOT = __dirname;
const KEEP_CRITERIA = new Set(['default.md']);
const KEEP_FEATURES = new Set(['exemplo-minimo']); // bateria de exemplo versionada
const isKeptCriteria = (name) => KEEP_CRITERIA.has(name) || name.startsWith('exemplo-');

function collectTargets() {
  const targets = [];

  const featuresDir = path.join(ROOT, 'features');
  if (fs.existsSync(featuresDir)) {
    for (const entry of fs.readdirSync(featuresDir)) {
      if (KEEP_FEATURES.has(entry)) continue;
      targets.push({ label: `features/${entry}`, absPath: path.join(featuresDir, entry) });
    }
  }

  const criteriaDir = path.join(ROOT, 'criteria');
  if (fs.existsSync(criteriaDir)) {
    for (const entry of fs.readdirSync(criteriaDir)) {
      if (isKeptCriteria(entry)) continue;
      if (!entry.endsWith('.md')) continue;
      targets.push({ label: `criteria/${entry}`, absPath: path.join(criteriaDir, entry) });
    }
  }

  const batchLogsDir = path.join(ROOT, 'logs', 'batch');
  if (fs.existsSync(batchLogsDir)) {
    for (const entry of fs.readdirSync(batchLogsDir)) {
      targets.push({ label: `logs/batch/${entry}`, absPath: path.join(batchLogsDir, entry) });
    }
  }

  for (const file of ['conversation.log', 'response.txt', 'bot.log']) {
    const abs = path.join(ROOT, 'logs', file);
    if (fs.existsSync(abs)) targets.push({ label: `logs/${file}`, absPath: abs });
  }

  const personaJson = path.join(ROOT, 'persona.json');
  if (fs.existsSync(personaJson)) targets.push({ label: 'persona.json', absPath: personaJson });

  const reportsDir = path.join(ROOT, 'reports');
  if (fs.existsSync(reportsDir)) {
    for (const entry of fs.readdirSync(reportsDir)) {
      if (!entry.endsWith('.html')) continue;
      targets.push({ label: `reports/${entry}`, absPath: path.join(reportsDir, entry) });
    }
  }

  return targets;
}

(async () => {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const skipConfirm = args.includes('--yes') || args.includes('-y');

  const targets = collectTargets();

  console.log(`\n${divider}`);
  console.log(paint(ansi.bold + ansi.magenta, '  🧹  Reset do projeto (features, critérios, personas, logs, reports)'));
  console.log(divider);

  if (targets.length === 0) {
    console.log(paint(ansi.green, '  ✅  Nada para apagar — o projeto já está limpo.\n'));
    return;
  }

  console.log(`  ${targets.length} item(ns) serão apagados:\n`);
  for (const t of targets) console.log(paint(ansi.dim, `    - ${t.label}`));
  console.log(
    `\n  ${paint(ansi.dim, `Mantidos: criteria/${[...KEEP_CRITERIA].join(', criteria/')}, docs/, .env, .wwebjs_auth/`)}\n`,
  );

  if (dryRun) {
    console.log(paint(ansi.yellow, '  (--dry-run: nada foi apagado)\n'));
    return;
  }

  if (!skipConfirm) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = createAsk(rl);
    const answer = await ask('Confirma o apagamento? Isso não é reversível para reports/ e logs. (s/n)', 'n');
    rl.close();
    if (!/^s/i.test(answer.trim())) {
      console.log(paint(ansi.yellow, '\n  Cancelado — nada foi apagado.\n'));
      return;
    }
  }

  let removed = 0;
  for (const t of targets) {
    try {
      fs.rmSync(t.absPath, { recursive: true, force: true });
      removed += 1;
    } catch (e) {
      console.warn(paint(ansi.red, `  ⚠️  falha ao apagar ${t.label}: ${e.message}`));
    }
  }

  console.log(divider);
  console.log(paint(ansi.green + ansi.bold, `  ✅  ${removed}/${targets.length} item(ns) apagados. Projeto pronto para um novo PRD.\n`));
})();
