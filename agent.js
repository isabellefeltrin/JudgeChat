const fs = require('fs');
const path = require('path');

const providerClaude = require('./providers/claude');
const providerCopilot = require('./providers/copilot');
const providerGemini = require('./providers/gemini');
const providerCodex = require('./providers/codex');

// AI_PROVIDER no .env escolhe quem responde (padrão: claude). Cada provedor
// mora em providers/<nome>.js e expõe generate({ systemPrompt, userPrompt,
// agentName }) — veja o comentário de topo de cada arquivo pra saber se ele
// chama um CLI local ou uma API HTTP direta, e quais variáveis de ambiente
// precisa.
const PROVIDERS = {
  claude: providerClaude,
  copilot: providerCopilot,
  gemini: providerGemini,
  codex: providerCodex,
};

function getProvider() {
  const name = (process.env.AI_PROVIDER || 'claude').trim().toLowerCase();
  const provider = PROVIDERS[name];
  if (!provider) {
    throw new Error(
      `AI_PROVIDER desconhecido: "${name}" (valores aceitos: ${Object.keys(PROVIDERS).join(', ')})`,
    );
  }
  return provider;
}

// Só o Claude Code tem suporte nativo a "subagentes" (--agent <nome>, que já
// carrega o papel direto de .claude/agents/<nome>.md do lado do próprio
// CLI). Pros outros provedores, lemos o mesmo .md aqui, tiramos o
// front-matter e mandamos o texto como instrução fixa (system prompt/CLI) —
// assim o papel (juiz, cliente simulado, rascunhador...) continua definido
// num único lugar, igual pra qualquer IA conectada.
const AGENTS_DIR = path.join(__dirname, '.claude', 'agents');
const instructionsCache = new Map();

function loadAgentInstructions(agentName) {
  if (instructionsCache.has(agentName)) return instructionsCache.get(agentName);
  const filePath = path.join(AGENTS_DIR, `${agentName}.md`);
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf-8');
  } catch {
    throw new Error(`definição de agente não encontrada: ${filePath}`);
  }
  const instructions = raw.replace(/^---\n[\s\S]*?\n---\n?/, '').trim();
  instructionsCache.set(agentName, instructions);
  return instructions;
}

const END_MARKER = '[FIM]';

function buildPrompt(persona, history, incomingText) {
  const historyText = history
    .map(
      (turn) =>
        `${turn.role === 'cliente' ? persona.name.toUpperCase() : 'AGENTE'}: ${turn.text}`,
    )
    .join('\n');

  return [
    `Cliente: ${persona.name}`,
    `Personalidade: ${persona.personality || 'cliente comum, educado e direto'}`,
    '',
    'Histórico da conversa até agora:',
    historyText || '(início da conversa)',
    `AGENTE: ${incomingText}`,
  ].join('\n');
}

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 3000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Ponto único de entrada usado por judge.js, batchDrafts.js e draftReview.js:
// resolve o provedor configurado, monta o system prompt (quando o provedor
// precisar dele) e tenta de novo em caso de falha, com o mesmo
// retry/timeout de sempre — tudo isso é igual não importa qual IA responde.
async function callAI(userPrompt, agentName) {
  const provider = getProvider();
  const systemPrompt = agentName ? loadAgentInstructions(agentName) : '';

  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await provider.generate({ systemPrompt, userPrompt, agentName });
    } catch (e) {
      lastError = e;
      if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS);
    }
  }
  throw lastError;
}

// nome antigo mantido como alias — quem já importava `callClaude` continua
// funcionando, agora chamando qualquer provedor configurado em AI_PROVIDER.
const callClaude = callAI;

async function generateReply(persona, history, incomingText) {
  const prompt = buildPrompt(persona, history, incomingText);
  const text = await callAI(prompt, 'zapia-cliente-simulado');
  return !text || text === END_MARKER ? null : text;
}

module.exports = { generateReply, callAI, callClaude, END_MARKER };
