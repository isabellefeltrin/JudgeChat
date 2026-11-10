// Lógica reusável de "conectar ao WhatsApp", "rodar uma conversa até o fim" e
// "avaliar e gerar relatório", usada tanto pelo modo interativo (cli.js)
// quanto pelo runner em lote (batch-runner.js).
//
// Aqui NUNCA se chama process.exit — falhas viram rejeição de Promise, e quem chama decide
// o que fazer (cli.js aborta o processo; batch-runner.js decide por
// cenário/por bateria).
const fs = require('fs');
const path = require('path');
const { createWhatsAppClient } = require('./whatsapp');
const { sleep, retry } = require('./lib/utils');
const { generateReply } = require('./agent');
const { evaluateConversation } = require('./judge');
const { generateHtmlReport } = require('./report');

const MAX_TOTAL_TURNS = 60;
const MAX_CONSECUTIVE_SHORT_TURNS = 4; // corta loop de despedida ("de nada" / "até mais" / ...)
const SHORT_TURN_LENGTH = 50;

const NUMBER_LOOKUP_ATTEMPTS = 5;
const NUMBER_LOOKUP_DELAY_MS = 1500; // getNumberId logo após 'ready' costuma falhar nas primeiras tentativas
const INIT_MAX_ATTEMPTS = 5;
const INIT_RETRY_DELAY_MS = 5000; // client.initialize() e reconexão
const POLL_INTERVAL_MS = 3000;
const RESPONSE_WATCHER_INTERVAL_MS = 1000;
const RECONNECT_DELAY_MS = 5000;
const DESTROY_TIMEOUT_MS = 8000;

const STRUCTURED_MESSAGE_TYPES = ['notification_template', 'interactive', 'buttons_response', 'list_response'];

const stripAnsi = (text) => text.replace(/\x1b\[[0-9;]*m/g, '');

function extractBody(message) {
  let body = message.body || message.caption || '';
  if (!body && STRUCTURED_MESSAGE_TYPES.includes(message.type)) {
    try {
      const raw = message.rawData || {};
      const interactive = raw.interactiveMessage || raw;
      const headerText = interactive.header?.title || interactive.header?.text || '';
      const bodyText = interactive.body?.text || raw.title || raw.description || '';
      const footerText = interactive.footer?.text || raw.footer || '';
      const buttons = (interactive.nativeFlowMessage?.buttons || interactive.buttons || []).map((b) => {
        let params = {};
        try { params = JSON.parse(b.buttonParamsJson || '{}'); } catch {}
        return `• ${params.display_text || b.name || JSON.stringify(b)}`;
      }).join('\n');
      const sections = (raw.sections || []).map(s =>
        (s.title ? `*${s.title}*\n` : '') +
        (s.rows || []).map(r => `• ${r.title}${r.description ? ': ' + r.description : ''}`).join('\n')
      ).join('\n');
      body = [headerText, bodyText, footerText, buttons, sections].filter(Boolean).join('\n')
        || `[${message.type}] ${JSON.stringify(raw).slice(0, 500)}`;
    } catch (e) {
      body = `[${message.type}] ${JSON.stringify(message.rawData || {}).slice(0, 300)}`;
    }
  }
  if (!body) body = `[${message.type || 'mídia'}]`;
  return body;
}

// Em chats endereçados por @lid, a whatsapp-web.js reconstrói message.id via
// Object.assign (Utils.js, getMessageModel) pra serializar o campo "remote" —
// isso perde o getter "_serialized" do protótipo original, deixando
// message.id._serialized sempre undefined. O fallback pro id.id bruto (ou,
// na ausência dele, timestamp+corpo) evita tratar toda mensagem a partir da
// segunda como duplicata da primeira.
function messageDedupKey(message) {
  return message.id._serialized || message.id.id || `${message.from}:${message.timestamp}:${message.body}`;
}

async function safeDestroy(client) {
  const browserProcess = client.pupBrowser && client.pupBrowser.process && client.pupBrowser.process();
  try {
    await Promise.race([
      client.destroy(),
      new Promise((resolve, reject) => setTimeout(() => reject(new Error('timeout ao encerrar')), DESTROY_TIMEOUT_MS)),
    ]);
  } catch {
    if (browserProcess && !browserProcess.killed) browserProcess.kill('SIGKILL');
  }
}

// client.initialize() é chamado ao conectar e ao reconectar após um
// 'disconnected' — se rejeitar (ex.: "Execution context was destroyed", uma
// corrida transitória do Puppeteer contra a navegação da página do WhatsApp
// Web), tenta de novo algumas vezes antes de desistir de vez, rejeitando com
// um erro detalhado em vez de derrubar o processo.
async function initializeWithRetry(client) {
  for (let attempt = 1; attempt <= INIT_MAX_ATTEMPTS; attempt += 1) {
    try {
      await client.initialize();
      return;
    } catch (e) {
      // client.pupBrowser já é atribuído antes da injeção de scripts (onde a
      // falha acima costuma acontecer), então o Chrome fica de pé, preso ao
      // userDataDir — sem matar esse processo, toda tentativa seguinte falha
      // com "the browser is already running for ...".
      const browserProcess = client.pupBrowser && client.pupBrowser.process && client.pupBrowser.process();
      if (browserProcess && !browserProcess.killed) browserProcess.kill();

      if (attempt === INIT_MAX_ATTEMPTS) {
        throw new Error(`falha ao iniciar o WhatsApp após ${INIT_MAX_ATTEMPTS} tentativas: ${e.message}`);
      }
      await sleep(INIT_RETRY_DELAY_MS);
    }
  }
}

//
// onFatalDisconnect (opcional) é chamado se o client cair depois de já
// conectado (evento 'disconnected') e a reconexão automática esgotar as
// tentativas — quem chamou connectToTarget decide o que fazer (ex.: o
// batch-runner marca o cenário em andamento e os seguintes como ERRO_TECNICO).
// O mesmo motivo de falha também é exposto via `whenFatal`, uma Promise que
// rejeita nesse momento — dá pra dar Promise.race nela dentro de
// runConversation pra abortar uma conversa em andamento quando isso acontece.
async function connectToTarget(targetNumber, { onStatus = () => {}, onFatalDisconnect = () => {} } = {}) {
  const client = createWhatsAppClient();

  let fatalReject;
  const whenFatal = new Promise((_, reject) => { fatalReject = reject; });
  whenFatal.catch(() => {}); // evita UnhandledPromiseRejectionWarning enquanto ninguém dá race nela ainda

  await new Promise((resolve, reject) => {
    let settled = false;
    client.once('ready', () => {
      if (settled) return;
      settled = true;
      resolve();
    });
    initializeWithRetry(client).catch((e) => {
      if (settled) return;
      settled = true;
      reject(e);
    });
  });

  let targetChatId;
  try {
    const numberId = await retry(() => client.getNumberId(targetNumber), NUMBER_LOOKUP_ATTEMPTS, NUMBER_LOOKUP_DELAY_MS);
    if (!numberId) throw new Error(`o número ${targetNumber} não foi encontrado no WhatsApp`);
    targetChatId = numberId._serialized;
  } catch (e) {
    await safeDestroy(client);
    throw new Error(`falha ao consultar o número ${targetNumber} no WhatsApp: ${e.message}`);
  }

  let targetLid = null;
  try {
    const [info] = await client.getContactLidAndPhone(targetChatId);
    targetLid = info?.lid || null;
  } catch {
    // contato sem LID atribuído ainda: segue só com o c.us mesmo.
  }

  client.on('disconnected', (reason) => {
    onStatus(`🔌 Desconectado: ${reason}. Reconectando em ${RECONNECT_DELAY_MS / 1000}s...`);
    setTimeout(() => {
      initializeWithRetry(client).catch((e) => {
        onFatalDisconnect(e);
        fatalReject(e);
      });
    }, RECONNECT_DELAY_MS);
  });

  return {
    client,
    targetChatId,
    targetLid,
    whenFatal,
    disconnect: () => safeDestroy(client),
  };
}

//
// options:
//   logFile             — se informado, cada turno é gravado nesse arquivo 
//   script              — array de falas do cliente a reproduzir literalmente antes de voltar a gerar por IA
//   enableResponseWatcher/responseFile — habilita o watcher manual de logs/response.txt (só faz sentido no modo interativo)
//   onLog(role, text)   — chamado a cada mensagem (cliente ou agente), pra quem chamou decidir como exibir
//   fatalSignal         — a Promise `whenFatal` de connectToTarget; se rejeitar, aborta a conversa em andamento
//
// Resolve { history, endedReason: 'natural'|'max_turns'|'short_turn_loop'|'no_answer' }.
// Rejeita se o envio da mensagem de abertura falhar (a conversa nem chega a
// começar) ou se fatalSignal rejeitar (o client caiu e não reconectou).
// Falhas em turnos seguintes (geração de resposta ou envio) são logadas e a
// conversa CONTINUA — o cli.js interativo segue o mesmo comportamento.
async function runConversation({ client, targetChatId, targetLid, persona, options = {} }) {
  const { logFile, script: initialScript = [], enableResponseWatcher = false, responseFile, onLog = () => {}, fatalSignal, onHistoryReady } = options;
  const script = [...initialScript];
  const history = [];
  // `history` nunca é reatribuído (só recebe .push), então expor a mesma
  // referência antes da conversa terminar deixa quem chamou inspecionar o
  // progresso a qualquer momento (ex.: cli.js quer avaliar/gerar relatório
  // com o que já foi conversado até agora se o usuário apertar Ctrl+C).
  if (onHistoryReady) onHistoryReady(history);
  let queue = Promise.resolve();
  let consecutiveShortTurns = 0;
  let lastMessageId = null;

  const isFromTarget = (message) => message.from === targetChatId || (!!targetLid && message.from === targetLid);

  function appendLog(role, text) {
    if (logFile) {
      const timestamp = new Date().toLocaleString('pt-BR');
      fs.appendFileSync(logFile, `[${timestamp}] ${role}: ${stripAnsi(text)}\n`);
    }
    onLog(role, text);
  }

  function trackTurn(text) {
    if (text.trim().length <= SHORT_TURN_LENGTH) consecutiveShortTurns += 1;
    else consecutiveShortTurns = 0;
  }

  const conversationPromise = new Promise((resolve, reject) => {
    let settled = false;
    let pollTimer = null;
    let watcherTimer = null;

    function cleanup() {
      client.off('message', handleIncoming);
      client.off('message_ciphertext_failed', handleCiphertextFailed);
      if (pollTimer) clearInterval(pollTimer);
      if (watcherTimer) clearInterval(watcherTimer);
    }

    function finish(endedReason) {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ history, endedReason });
    }

    function fail(error) {
      if (settled) return;
      settled = true;
      cleanup();
      // Quem chamar (batch-runner.js) usa
      // isso pra gravar a payload técnica completa de um ERRO_TECNICO, em vez
      // de só a mensagem resumida do erro.
      error.historySoFar = history.slice();
      reject(error);
    }

    async function sendMessage(text) {
      await retry(() => client.sendMessage(targetChatId, text), NUMBER_LOOKUP_ATTEMPTS, NUMBER_LOOKUP_DELAY_MS);
      appendLog(`CLIENTE (${persona.name})`, text);
    }

    function handleIncoming(message) {
      if (message.fromMe) return;
      if (!isFromTarget(message)) return;
      if (message.type === 'ciphertext') return; // ainda decifrando, a lib resolve e reemite sozinha
      const dedupKey = messageDedupKey(message);
      if (dedupKey === lastMessageId) return;
      lastMessageId = dedupKey;

      const body = extractBody(message);
      appendLog('Agentes de IA', body);
      history.push({ role: 'agente', text: body });
      trackTurn(body);

      queue = queue.then(() => respondAutomatically(body));
    }

    function handleCiphertextFailed(message) {
      if (message.fromMe || !isFromTarget(message)) return;
      appendLog('Agentes de IA', `[não foi possível decifrar a mensagem ${messageDedupKey(message)}]`);
    }

    async function respondAutomatically(incomingText) {
      if (history.length >= MAX_TOTAL_TURNS) {
        onLog('sistema', '(limite de turnos da conversa atingido — parando respostas automáticas)');
        finish('max_turns');
        return;
      }
      if (consecutiveShortTurns >= MAX_CONSECUTIVE_SHORT_TURNS) {
        onLog('sistema', '(mensagens curtas em sequência — parece loop de despedida, parando)');
        finish('short_turn_loop');
        return;
      }
      try {
        let reply;
        if (script.length > 0) {
          reply = script.shift();
        } else {
          reply = await generateReply(persona, history, incomingText);
        }
        if (reply && typeof reply === 'object' && reply.end === 'no_answer') {
          onLog('sistema', '(cliente perguntou mais de 3 vezes sem resposta adequada do agente — encerrando)');
          finish('no_answer');
          return;
        }
        if (!reply) {
          onLog('sistema', '(conversa encerrada — nenhuma nova resposta gerada)');
          finish('natural');
          return;
        }
        history.push({ role: 'cliente', text: reply });
        trackTurn(reply);
        await sendMessage(reply);
      } catch (e) {
        // Uma falha pontual (IA ou envio) é logada, mas não derruba a sessão:
        // ela segue esperando a próxima mensagem do agente.
        onLog('sistema', `❌ Falha ao gerar resposta automática: ${e.message}`);
      }
    }

    function startPolling() {
      pollTimer = setInterval(async () => {
        try {
          const chat = await client.getChatById(targetChatId).catch(() => null);
          if (!chat || !chat.lastMessage || chat.lastMessage.fromMe) return;
          handleIncoming(chat.lastMessage);
        } catch {
          // silencia falhas transitórias do polling
        }
      }, POLL_INTERVAL_MS);
    }

    function startResponseWatcher() {
      fs.writeFileSync(responseFile, '');
      watcherTimer = setInterval(async () => {
        try {
          const content = fs.readFileSync(responseFile, 'utf-8').trim();
          if (content) {
            fs.writeFileSync(responseFile, '');
            await sendMessage(content);
          }
        } catch {
          // silencia falhas transitórias do watcher
        }
      }, RESPONSE_WATCHER_INTERVAL_MS);
    }

    client.on('message', handleIncoming);
    client.on('message_ciphertext_failed', handleCiphertextFailed);
    startPolling();
    if (enableResponseWatcher && responseFile) startResponseWatcher();

    (async () => {
      try {
        if (persona.opening) await sendMessage(persona.opening);
      } catch (e) {
        fail(new Error(`falha ao enviar a mensagem de abertura: ${e.message}`));
      }
    })();
  });

  if (!fatalSignal) return conversationPromise;
  return Promise.race([conversationPromise, fatalSignal]).catch((error) => {
    // fatalSignal (queda do WhatsApp que não reconectou) rejeita fora do
    // fail() acima, então também precisa do histórico anexado aqui.
    if (!error.historySoFar) error.historySoFar = history.slice();
    throw error;
  });
}

// reportSlug substitui persona.name no
// nome do arquivo quando informado (usado pelo batch-runner pra nomear pelo
// slug do cenário Gherkin, não pelo nome que a IA inventar pro cliente).
async function evaluateAndReport({ persona, history, reportsDir, reportSlug, onStatus = () => {} }) {
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeName = (reportSlug || persona.name || 'conversa').replace(/[^a-z0-9-_]+/gi, '_');
  const reportPath = path.join(reportsDir, `${safeName}-${stamp}.html`);

  let evaluationResult = null;
  if (persona.evaluate && history.length > 0) {
    onStatus('🧪  Avaliando conversa automaticamente...');
    try {
      evaluationResult = await evaluateConversation(persona, history);
    } catch (e) {
      onStatus(`❌ Falha na avaliação automática: ${e.message}`);
      evaluationResult = null;
    }
  }

  try {
    generateHtmlReport(reportPath, persona, history, evaluationResult);
    onStatus(`📄  Resumo da conversa em HTML: ${reportPath}`);
  } catch (e) {
    onStatus(`❌ Falha ao gerar o HTML da conversa: ${e.message}`);
  }

  return { reportPath, evaluationResult };
}

module.exports = { connectToTarget, runConversation, evaluateAndReport };
