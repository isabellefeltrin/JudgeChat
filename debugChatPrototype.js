#!/usr/bin/env node
// Protótipo — fala com o Agente de Atendimento REAL via DebugChatController
// (ambiente Sandbox), sem passar pelo WhatsApp. Ver docs/qa-debug-chat-playwright.md
// (fonte: guia de QA sobre o endpoint) pra spec completa e limitações.
//
// Objetivo deste protótipo: validar que dá pra (1) reaproveitar o cliente
// simulado da Zapia (zapia-cliente-simulado, via agent.js) conversando por
// esse endpoint em vez de WhatsApp, e (2) inspecionar o retorno estruturado
// (estado/ultimaTool/historico) que o WhatsApp nunca expõe. Não substitui a
// bateria por WhatsApp — o próprio guia recomenda sempre fechar com smoke
// pelo WhatsApp antes de liberar (mídia, agrupamento de mensagens e as
// "guardas de quando não responder" só existem lá).
//
// Uso: node debugChatPrototype.js
// Variáveis de ambiente (.env):
//   NEXTIA_DEBUG_BASE_URL       (opcional, default = Sandbox do guia)
//   NEXTIA_DEBUG_INSTANCIA_TOKEN (obrigatória)
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { generateReply } = require('./agent');
const { ansi, paint, divider } = require('./terminalUi');

const BASE_URL = process.env.NEXTIA_DEBUG_BASE_URL || 'https://nextaialuno-sandbox.appnext.fit';
const INSTANCIA_TOKEN = process.env.NEXTIA_DEBUG_INSTANCIA_TOKEN;
const MAX_TURNS = 5; // protótipo: conversa curta de propósito, é só validação de integração

if (!INSTANCIA_TOKEN) {
  console.error(paint(ansi.red + ansi.bold, '❌ Defina NEXTIA_DEBUG_INSTANCIA_TOKEN no .env antes de rodar este protótipo.'));
  process.exit(1);
}

async function debugPost(phone, mensagem) {
  const res = await fetch(`${BASE_URL}/api/debug/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ phone, mensagem, instanciaToken: INSTANCIA_TOKEN }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`POST /api/debug/chat falhou (${res.status}): ${JSON.stringify(data)}`);
  return data;
}

async function debugDelete(phone) {
  // best-effort — não deixa sessão de debug pendurada, mas não derruba o
  // protótipo se o reset falhar (ex.: sessão já não existia)
  try {
    await fetch(`${BASE_URL}/api/debug/chat/${phone}?instanciaToken=${INSTANCIA_TOKEN}`, { method: 'DELETE' });
  } catch {
    // ignora
  }
}

// O documento descreve resposta/ultimaTool como texto simples, mas até
// confirmarmos isso batendo na API de verdade, não dá pra assumir — texto
// interpolado direto em template string vira "[object Object]" se o valor
// vier como objeto/array. safeStr nunca quebra isso: string passa direto,
// qualquer outra coisa vira JSON legível.
function safeStr(value) {
  if (value === null || value === undefined) return String(value);
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function logTurn(label, role, text) {
  const isCliente = role === 'cliente';
  const icon = isCliente ? '👤' : '🤖';
  const color = isCliente ? ansi.green : ansi.cyan;
  console.log(`  [${label}] ${icon} ${paint(color + ansi.bold, isCliente ? 'CLIENTE' : 'AGENTE')}: ${safeStr(text)}`);
}

// Imprime a resposta crua da API a cada turno — enquanto não confirmamos o
// formato real neste ambiente, é mais confiável ver o JSON inteiro do que
// confiar no que o documento descreve.
function logRaw(label, data) {
  console.log(paint(ansi.dim, `      [${label}] resposta bruta: ${JSON.stringify(data)}`));
}

async function runScenario({ phone, persona }) {
  const label = persona.name;
  console.log(`\n${divider}`);
  console.log(paint(ansi.bold + ansi.magenta, `  🧪  [${label}] telefone de debug: ${phone}`));
  console.log(divider);

  await debugDelete(phone); // começa limpo, como o guia recomenda

  const history = [];

  logTurn(label, 'cliente', persona.opening);
  history.push({ role: 'cliente', text: persona.opening });
  let lastResponse = await debugPost(phone, persona.opening);
  logRaw(label, lastResponse);
  const firstReply = safeStr(lastResponse.resposta ?? '(sem resposta)');
  logTurn(label, 'agente', firstReply);
  console.log(paint(ansi.dim, `      [${label}] ultimaTool: ${safeStr(lastResponse.ultimaTool)} | sessaoEncerrada: ${safeStr(lastResponse.sessaoEncerrada)}`));
  history.push({ role: 'agente', text: firstReply });

  for (let turn = 1; turn < MAX_TURNS; turn++) {
    const reply = await generateReply(persona, history, firstReply);
    if (!reply) break; // zapia-cliente-simulado decidiu encerrar

    logTurn(label, 'cliente', reply);
    history.push({ role: 'cliente', text: reply });

    lastResponse = await debugPost(phone, reply);
    logRaw(label, lastResponse);
    const respostaAgente = safeStr(lastResponse.resposta ?? '(sem resposta)');
    logTurn(label, 'agente', respostaAgente);
    console.log(paint(ansi.dim, `      [${label}] ultimaTool: ${safeStr(lastResponse.ultimaTool)} | sessaoEncerrada: ${safeStr(lastResponse.sessaoEncerrada)}`));
    history.push({ role: 'agente', text: respostaAgente });
  }

  console.log(paint(ansi.bold, `\n  [${label}] Estado final (CollectedData):`));
  console.log('  ' + JSON.stringify(lastResponse.estado, null, 2).split('\n').join('\n  '));

  await debugDelete(phone); // limpa no fim, como o guia recomenda

  return { history, lastResponse };
}

// Dois cenários da leads-ia-m1, escolhidos de propósito por serem opostos:
// CT017 não deveria disparar oportunidade (dúvida operacional), CT013 deveria
// (pergunta de preço). Sem WhatsApp, dá pra rodar os dois em paralelo — cada
// telefone de debug é uma sessão isolada.
//
// O "phone" só precisa PARECER um telefone de verdade — dígitos, no formato
// DDI+DDD+número (o exemplo do próprio guia usa "55debug..." misturando
// letras, mas isso quebra alguma validação de formato mais adiante no
// backend testado; aqui optamos por dígitos puros pra evitar esse problema).
const CENARIOS = [
  {
    phone: '5548999900017',
    persona: {
      name: 'marina',
      opening: 'oi, tudo bem? vocês abrem em qual horário?',
      personality: 'cliente curiosa, só quer saber o horário de funcionamento da unidade, sem nenhuma intenção de compra',
    },
  },
  {
    phone: '5548999900013',
    persona: {
      name: 'joao',
      opening: 'oi, quanto custa o plano mensal de vocês?',
      personality: 'cliente interessado, quer saber o preço do plano mensal pra decidir se vai se matricular',
    },
  },
];

(async () => {
  console.log(paint(ansi.bold + ansi.magenta, `\n🔌 Base: ${BASE_URL}`));
  console.log(paint(ansi.dim, `   Rodando ${CENARIOS.length} cenário(s) em paralelo de verdade (Promise.all) — os logs de [marina] e [joao] vão intercalar no terminal, o prefixo [nome] indica de qual cenário é cada linha.`));

  // Promise.all mesmo — essa é a vantagem real do debug endpoint sobre o
  // WhatsApp: telefones diferentes são sessões independentes, então dá pra
  // rodar N cenários ao mesmo tempo em vez de sequencial com espera entre eles.
  const outcomes = await Promise.allSettled(CENARIOS.map(runScenario));

  console.log(`\n${divider}`);
  outcomes.forEach((outcome, i) => {
    const { persona, phone } = CENARIOS[i];
    if (outcome.status === 'fulfilled') {
      console.log(paint(ansi.green, `  ✅  [${persona.name}] (${phone}) concluído`));
    } else {
      console.log(paint(ansi.red, `  ❌  [${persona.name}] (${phone}) falhou: ${outcome.reason?.message || outcome.reason}`));
    }
  });
  console.log(divider);
  console.log(paint(ansi.bold, '  Compare o ultimaTool/estado de CT017 (não deveria indicar venda) com CT013 (deveria).'));
  console.log(divider);

  if (outcomes.some((o) => o.status === 'rejected')) process.exit(1);
})();
