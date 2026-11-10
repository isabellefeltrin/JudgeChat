const fs = require("fs");
const path = require("path");

const { retry } = require("./lib/utils");
const providerClaude = require("./providers/claude");
const providerCopilot = require("./providers/copilot");
const providerCodex = require("./providers/codex");

const PROVIDERS = {
  claude: providerClaude,
  copilot: providerCopilot,
  codex: providerCodex,
};

function getProvider() {
  const name = (process.env.AI_PROVIDER || "claude").trim().toLowerCase();
  const provider = PROVIDERS[name];
  if (!provider) {
    throw new Error(
      `AI_PROVIDER desconhecido: "${name}" (valores aceitos: ${Object.keys(PROVIDERS).join(", ")})`,
    );
  }
  return provider;
}

const AGENTS_DIR = path.join(__dirname, ".claude", "agents");
const instructionsCache = new Map();

function loadAgentInstructions(agentName) {
  if (instructionsCache.has(agentName)) return instructionsCache.get(agentName);
  const filePath = path.join(AGENTS_DIR, `${agentName}.md`);
  let raw;
  try {
    raw = fs.readFileSync(filePath, "utf-8");
  } catch {
    throw new Error(`definição de agente não encontrada: ${filePath}`);
  }
  const instructions = raw.replace(/^---\n[\s\S]*?\n---\n?/, "").trim();
  instructionsCache.set(agentName, instructions);
  return instructions;
}

const END_MARKER = "[FIM]";
const NO_ANSWER_MARKER = "[FIM:SEM_RESPOSTA]";

function buildPrompt(persona, history, incomingText) {
  const historyText = history
    .map(
      (turn) =>
        `${turn.role === "cliente" ? persona.name.toUpperCase() : "AGENTE"}: ${turn.text}`,
    )
    .join("\n");

  return [
    `Cliente: ${persona.name}`,
    `Personalidade: ${persona.personality || "cliente comum, educado e direto"}`,
    "",
    "Histórico da conversa até agora:",
    historyText || "(início da conversa)",
    `AGENTE: ${incomingText}`,
  ].join("\n");
}

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 3000;
async function callAI(userPrompt, agentName) {
  const provider = getProvider();
  const systemPrompt = agentName ? loadAgentInstructions(agentName) : "";

  return retry(
    () => provider.generate({ systemPrompt, userPrompt, agentName }),
    MAX_ATTEMPTS,
    RETRY_DELAY_MS,
  );
}

async function generateReply(persona, history, incomingText) {
  const prompt = buildPrompt(persona, history, incomingText);
  const text = await callAI(prompt, "judgechat-cliente-simulado");
  if (text && text.trim() === NO_ANSWER_MARKER) return { end: "no_answer" };
  return !text || text === END_MARKER ? null : text;
}

module.exports = { generateReply, callAI };
