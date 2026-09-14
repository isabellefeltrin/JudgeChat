#!/usr/bin/env node
process.noDeprecation = true;
const fs = require('fs');
const path = require('path');
const readline = require('readline/promises');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { connectToTarget, runConversation, evaluateAndReport } = require('./session');
const { listCriteriaFiles, DEFAULT_CRITERIA_FILE } = require('./judge');
const { ansi, paint, divider, createAsk, createAskMultiline, openInBrowser } = require('./terminalUi');

const LOG_FILE = path.join(__dirname, 'logs', 'conversation.log');
const RESPONSE_FILE = path.join(__dirname, 'logs', 'response.txt');
const PERSONA_FILE = path.join(__dirname, 'persona.json');
const REPORTS_DIR = path.join(__dirname, 'reports');

if (!fs.existsSync(path.join(__dirname, 'logs'))) {
  fs.mkdirSync(path.join(__dirname, 'logs'));
}
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR);
}

async function browseReports(ask) {
  const files = fs
    .readdirSync(REPORTS_DIR)
    .filter((f) => f.endsWith('.html'))
    .map((f) => ({ name: f, mtime: fs.statSync(path.join(REPORTS_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length === 0) {
    console.log(paint(ansi.yellow, '  Nenhum relatório encontrado em reports/.'));
    return;
  }

  console.log(paint(ansi.cyan, '\n  Relatórios disponíveis (mais recente primeiro):'));
  files.forEach((f, i) => console.log(`  ${paint(ansi.bold, String(i + 1))}) ${f.name}`));

  const choice = await ask('\nQual número abrir?', '1');
  const chosen = files[Number(choice) - 1];
  if (!chosen) {
    console.log(paint(ansi.red, '  Opção inválida.'));
    return;
  }
  openInBrowser(path.join(REPORTS_DIR, chosen.name));
  console.log(paint(ansi.green, `  Abrindo ${chosen.name} no navegador...`));
}

function loadPersona() {
  try {
    return JSON.parse(fs.readFileSync(PERSONA_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

function savePersona(persona) {
  fs.writeFileSync(PERSONA_FILE, JSON.stringify(persona, null, 2));
}

// Reconstrói as mensagens do conversation.log: cada entrada começa com
// "[timestamp] ROLE: texto" e pode continuar em linhas seguintes sem esse
// prefixo, quando a mensagem original tinha quebras de linha.
function parseConversationLog() {
  let raw;
  try {
    raw = fs.readFileSync(LOG_FILE, 'utf-8');
  } catch {
    return [];
  }
  const lines = raw.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  const headerRe = /^\[[^\]]+\] ([^:]+): (.*)$/;
  const entries = [];
  for (const line of lines) {
    const match = line.match(headerRe);
    if (match) {
      entries.push({ role: match[1], text: match[2] });
    } else if (entries.length) {
      entries[entries.length - 1].text += '\n' + line;
    }
  }
  return entries;
}

// Extrai, na ordem, exatamente as mensagens que "CLIENTE (<personaName>)"
// enviou numa conversa anterior — usado pra reproduzir uma conversa igual.
function extractClientScript(personaName) {
  const rolePrefix = `CLIENTE (${personaName})`;
  return parseConversationLog()
    .filter((e) => e.role === rolePrefix)
    .map((e) => e.text);
}

async function definePersona() {
  const existing = loadPersona();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = createAsk(rl);
  const askMultiline = createAskMultiline(rl);

  console.log(`\n${divider}`);
  console.log(paint(ansi.bold + ansi.magenta, '  🎭  Zapia'));
  console.log(divider);
  console.log(paint(ansi.cyan, '  1) Nova conversa personalizada'));
  console.log(paint(ansi.cyan, '  2) Reproduzir exatamente uma conversa anterior'));
  console.log(paint(ansi.cyan, '  3) Ver conversas anteriores (abrir HTML no navegador)'));
  console.log('');

  let name, personality, opening, targetNumber, scriptOf, evaluate, criteriaFile;
  try {
    const choice = await ask('Escolha uma opção', '1');

    if (choice.trim() === '3') {
      await browseReports(ask);
      rl.close();
      process.exit(0);
    }

    if (choice.trim() === '2') {
      scriptOf = await ask('Nome exato da persona a reproduzir', existing?.scriptOf || '');
      targetNumber = await ask('Número de WhatsApp alvo (DDI+DDD+número)', existing?.targetNumber || process.env.TARGET_NUMBER || '');
      name = scriptOf;
      personality = existing?.personality || '';
      opening = ''; // definido a partir do roteiro em main()
    } else {
      console.log(paint(ansi.dim, '\n  Enter em branco mantém o valor entre parênteses\n'));
      name = await ask('Nome do cliente', existing?.name || 'Cliente');
      personality = await askMultiline('Personalidade / contexto (quem é, o que quer)', existing?.personality || '');
      opening = await ask('Mensagem de abertura', existing?.opening || '');
      targetNumber = await ask('Número de WhatsApp alvo (DDI+DDD+número)', existing?.targetNumber || process.env.TARGET_NUMBER || '');
      scriptOf = '';
    }

    // Avaliação automática é opt-in: se a persona não pedir explicitamente
    // (evaluate=false), nenhum critério é aplicado — a Zapia continua só
    // gerando a conversa e o relatório de transcript, como antes.
    const evalDefault = existing?.evaluate ? 's' : 'n';
    const evalAnswer = await ask('Aplicar avaliação automática ao final da conversa? (s/n)', evalDefault);
    evaluate = /^s/i.test(evalAnswer.trim());

    if (evaluate) {
      criteriaFile = '';

      const files = listCriteriaFiles();
      if (files.length > 0) {
        console.log(paint(ansi.cyan, '\n  Critérios disponíveis em criteria/:'));
        files.forEach((f, i) => console.log(`  ${paint(ansi.bold, String(i + 1))}) ${f}`));
        console.log(`  ${paint(ansi.bold, '0')}) informar outro caminho de arquivo .md`);
        const existingIndex = existing?.criteriaFile ? files.indexOf(existing.criteriaFile) : -1;
        const fileChoice = await ask('Qual critério usar?', existingIndex >= 0 ? String(existingIndex + 1) : '1');
        if (fileChoice.trim() === '0') {
          criteriaFile = await ask('Caminho do arquivo .md de critério', existing?.criteriaFile || DEFAULT_CRITERIA_FILE);
        } else {
          criteriaFile = files[Number(fileChoice) - 1] || DEFAULT_CRITERIA_FILE;
        }
      } else {
        criteriaFile = DEFAULT_CRITERIA_FILE;
      }

      if (!criteriaFile) {
        console.log(paint(ansi.yellow, '\n  Nenhum critério selecionado — avaliação automática desativada.'));
        evaluate = false;
      }
    } else {
      criteriaFile = '';
    }
  } catch (e) {
    // Ctrl+C durante rl.question() rejeita com AbortError em vez de emitir SIGINT normal.
    if (e.code === 'ABORT_ERR') {
      console.log(paint(ansi.yellow, '\n👋 Cancelado.'));
      process.exit(0);
    }
    throw e;
  }

  rl.close();
  console.log(divider);

  const persona = { name, personality, opening, targetNumber, scriptOf, evaluate, criteriaFile };
  savePersona(persona);
  return persona;
}

// Formato/cores do console idênticos ao log() de hoje — só que agora é
// disparado via onLog() de session.js em vez de fazer a gravação em arquivo
// aqui (isso já é feito dentro de runConversation quando logFile é passado).
function printTurn(role, message) {
  if (role === 'sistema') {
    console.log(paint(ansi.dim, `  ${message}`));
    return;
  }
  const timestamp = new Date().toLocaleString('pt-BR');
  const isCliente = role.startsWith('CLIENTE');
  const roleColor = isCliente ? ansi.green : ansi.cyan;
  const icon = isCliente ? '👤' : '🤖';
  const indent = isCliente ? '        ' : '';
  const header = `${indent}${icon} ${paint(ansi.dim, `[${timestamp}]`)} ${paint(roleColor + ansi.bold, role)}`;
  const body = message
    .split('\n')
    .map((l) => `${indent}${paint(roleColor, l)}`)
    .join('\n');
  console.log(`\n${header}\n${body}`);
}

async function main() {
  const persona = await definePersona();

  if (!persona.targetNumber) {
    console.error(paint(ansi.red + ansi.bold, '❌ Número de WhatsApp alvo não informado.'));
    process.exit(1);
  }

  const script = persona.scriptOf ? extractClientScript(persona.scriptOf) : [];
  if (persona.scriptOf) {
    if (script.length === 0) {
      console.log(paint(ansi.yellow, `⚠️  Nenhuma mensagem de "CLIENTE (${persona.scriptOf})" encontrada no log — seguindo com respostas geradas por IA.`));
    } else {
      persona.opening = script.shift();
      console.log(paint(ansi.cyan, `🔁  Reproduzindo exatamente a conversa de "${persona.scriptOf}" (${script.length + 1} mensagens). Quando o roteiro acabar, volta a gerar respostas com IA.`));
    }
  }

  let target;
  try {
    target = await connectToTarget(persona.targetNumber, {
      onStatus: (msg) => console.log(paint(ansi.yellow, msg)),
    });
  } catch (e) {
    console.error(paint(ansi.red + ansi.bold, `❌ ${e.message}`));
    process.exit(1);
  }

  console.log(`\n${divider}`);
  console.log(paint(ansi.bold + ansi.green, '  ✅  WhatsApp conectado!'));
  console.log(divider);
  console.log(`  🎯  Conversando com: ${paint(ansi.bold, persona.targetNumber)} ${paint(ansi.dim, `(${target.targetChatId})`)}`);
  console.log(`  🎭  Personalidade: ${paint(ansi.bold, persona.name)} — ${persona.personality || paint(ansi.dim, '(sem descrição)')}`);
  console.log(`  📝  Conversa: ${paint(ansi.dim, 'logs/conversation.log')}`);
  console.log(`  ✍️   Enviar resposta: ${paint(ansi.dim, 'logs/response.txt')}`);
  console.log(`${divider}\n`);

  let liveHistory = [];
  let reported = false;

  async function reportOnce() {
    if (reported) return;
    reported = true;
    await evaluateAndReport({
      persona,
      history: liveHistory,
      reportsDir: REPORTS_DIR,
      onStatus: (msg) => console.log(paint(ansi.dim, `  ${msg}`)),
    });
  }

  let shuttingDown = false;
  async function shutdown() {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(paint(ansi.yellow, '\nEncerrando...'));
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    await reportOnce();
    await target.disconnect();
    process.exit(0);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (key) => {
      if (key === 'q' || key === 'Q' || key.charCodeAt(0) === 3) shutdown();
    });
  }

  try {
    await runConversation({
      client: target.client,
      targetChatId: target.targetChatId,
      targetLid: target.targetLid,
      persona,
      options: {
        logFile: LOG_FILE,
        script,
        enableResponseWatcher: true,
        responseFile: RESPONSE_FILE,
        onLog: printTurn,
        fatalSignal: target.whenFatal,
        onHistoryReady: (h) => { liveHistory = h; },
      },
    });
  } catch (e) {
    if (!shuttingDown) console.error(paint(ansi.red, `❌ Falha técnica na conversa: ${e.message}`));
  }

  if (!shuttingDown) {
    await reportOnce();
    await target.disconnect();
    process.exit(0);
  }
}

main().catch(console.error);
