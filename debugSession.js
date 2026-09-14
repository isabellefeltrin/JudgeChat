// Roda uma conversa via DebugChatController (Sandbox), sem WhatsApp — mesma
// ideia de session.js, mas o "transporte" é HTTP direto no orquestrador real
// em vez de whatsapp-web.js. Ver docs/qa-debug-chat-playwright.md pra spec e
// limitações do endpoint (não cobre mídia, agrupamento de mensagens nem as
// guardas de "quando não responder" — por isso a bateria por WhatsApp continua
// existindo, este é um modo complementar, mais rápido e paralelizável).
//
// Devolve o mesmo formato que runConversation() de session.js — { history,
// endedReason } — pra poder alimentar o mesmo evaluateAndReport() dos dois
// modos, sem duplicar a lógica de avaliação/relatório.
const { generateReply } = require('./agent');

const MAX_TURNS = 40;

// O documento descreve resposta/ultimaTool como texto simples, mas não dá
// pra assumir isso sem confirmar contra a API de verdade — se vier objeto,
// interpolar direto vira "[object Object]". safeStr nunca deixa isso passar.
function safeStr(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

// resposta às vezes vem como texto puro (o que o guia descreve), mas na
// prática também vem como o DTO inteiro de envio de mensagem —
// {"$type":"EnviarMensagemTextoDto","texto":{"mensagem":"..."},...} — com o
// texto de verdade em resposta.texto.mensagem. Sem isso, o histórico da
// conversa (e o que o juiz avalia!) fica poluído com JSON cru em vez do texto
// que o cliente simulado realmente "leu". Formato desconhecido cai no
// fallback de safeStr — nunca quebra a bateria, só fica menos legível.
function extractRespostaTexto(resposta) {
  if (typeof resposta === 'string') return resposta;
  if (resposta && typeof resposta === 'object' && typeof resposta.texto?.mensagem === 'string') {
    return resposta.texto.mensagem;
  }
  return safeStr(resposta);
}

// Em caso de falha, o erro carrega os campos estruturados (httpStatus,
// requestBody, responseBody) além da mensagem — batch-runner.js usa isso pra
// gravar a payload técnica completa de um ERRO_TECNICO em disco, em vez de só
// a mensagem resumida. instanciaToken NUNCA entra em requestBody (é um
// segredo — não faz sentido persistir em log em texto claro).
async function debugPost(baseUrl, token, phone, mensagem) {
  const res = await fetch(`${baseUrl}/api/debug/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ phone, mensagem, instanciaToken: token }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(`POST /api/debug/chat falhou (${res.status}): ${JSON.stringify(data)}`);
    err.httpStatus = res.status;
    err.requestBody = { phone, mensagem, instanciaToken: '<redacted>' };
    err.responseBody = data;
    throw err;
  }
  return data;
}

async function debugDelete(baseUrl, token, phone) {
  // best-effort — nunca deixa uma sessão de debug pendurada (regra do
  // próprio guia), mas não derruba a conversa se o reset falhar
  try {
    await fetch(`${baseUrl}/api/debug/chat/${phone}?instanciaToken=${token}`, { method: 'DELETE' });
  } catch {
    // ignora
  }
}

// options:
//   maxTurns          — corte de segurança (default 40, espelha o espírito do
//                        MAX_TOTAL_TURNS do modo WhatsApp)
//   onLog(role, text, raw) — chamado a cada turno; raw é a resposta crua da
//                        API nos turnos do agente (pra quem quiser inspecionar
//                        estado/ultimaTool além do texto)
async function runConversationViaDebugApi({ baseUrl, token, phone, persona, options = {} }) {
  const { onLog = () => {}, maxTurns = MAX_TURNS } = options;
  const history = [];
  let lastData = null;
  let endedReason = 'natural';

  await debugDelete(baseUrl, token, phone); // começa limpo, como o guia recomenda

  try {
    onLog('cliente', persona.opening);
    history.push({ role: 'cliente', text: persona.opening });

    lastData = await debugPost(baseUrl, token, phone, persona.opening);
    let respostaAgente = extractRespostaTexto(lastData.resposta);
    onLog('agente', respostaAgente, lastData);
    history.push({ role: 'agente', text: respostaAgente });

    for (let turn = 1; turn < maxTurns; turn++) {
      let reply;
      try {
        reply = await generateReply(persona, history, respostaAgente);
      } catch (e) {
        onLog('sistema', `❌ Falha ao gerar resposta automática: ${e.message}`);
        break;
      }
      if (!reply) break; // zapia-cliente-simulado decidiu encerrar

      onLog('cliente', reply);
      history.push({ role: 'cliente', text: reply });

      lastData = await debugPost(baseUrl, token, phone, reply);
      respostaAgente = extractRespostaTexto(lastData.resposta);
      onLog('agente', respostaAgente, lastData);
      history.push({ role: 'agente', text: respostaAgente });

      if (turn === maxTurns - 1) endedReason = 'max_turns';
    }

    return { history, endedReason, lastData };
  } catch (err) {
    // Anexa o que já se sabe da conversa até o momento da falha — sem isso,
    // um ERRO_TECNICO no meio do turno 5 não deixaria rastro nenhum de como
    // a conversa chegou lá (quem chama, batch-runner.js, grava isso na
    // payload técnica do cenário).
    err.historySoFar = history.slice();
    err.lastData = lastData;
    throw err;
  } finally {
    await debugDelete(baseUrl, token, phone); // limpa no fim, sempre, mesmo em erro
  }
}

// Telefone determinístico por cenário (mesmo scenarioSlug → mesmo telefone
// sempre) — importante pra combinar com o results.json de retomada: se uma
// bateria for interrompida e retomada, o cenário reaproveitado não muda de
// identidade. Só dígitos, sem letras (letras quebram validação de formato no
// backend testado — descoberto na prática, ver histórico da conversa).
//
// country = 'BR' (default, já validado batendo na API de verdade) ou 'US'
// (não testado ainda — não há garantia de que o backend testado aceite um
// formato de telefone que não seja BR).
function phoneForScenario(scenarioSlug, country = 'BR') {
  let hash = 0;
  for (let i = 0; i < scenarioSlug.length; i++) {
    hash = (hash * 31 + scenarioSlug.charCodeAt(i)) >>> 0;
  }

  if (country === 'US') {
    // DDI 1 + área (3 dígitos, 200-999 pra não começar em 0/1, que não são
    // área válida nos EUA) + assinante (7 dígitos) = 11 dígitos
    const areaCode = String(200 + (hash % 800)).padStart(3, '0');
    const subscriber = String(hash % 10000000).padStart(7, '0');
    return `1${areaCode}${subscriber}`;
  }

  const suffix = String(hash % 100000000).padStart(8, '0'); // 8 dígitos
  return `55489${suffix}`; // 55 (DDI) + 48 (DDD fictício) + 9 (celular) + 8 dígitos = 13 dígitos
}

module.exports = { runConversationViaDebugApi, phoneForScenario };
